import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { getVapidPublicKey, subscribePush, unsubscribePush } from "@/lib/push.functions";

function urlBase64ToUint8Array(base64: string) {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(b64);
  return Uint8Array.from(raw.split("").map((c) => c.charCodeAt(0)));
}

export function usePushNotifications() {
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">("unsupported");
  const [subscribed, setSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);
  const sub = useServerFn(subscribePush);
  const unsub = useServerFn(unsubscribePush);
  const fetchVapidKey = useServerFn(getVapidPublicKey);
  const swRef = useRef<ServiceWorkerRegistration | null>(null);

  useEffect(() => {
    if (!("Notification" in window) || !("serviceWorker" in navigator)) {
      setPermission("unsupported");
      return;
    }
    setPermission(Notification.permission);
    navigator.serviceWorker.register("/sw.js").then(async (reg) => {
      swRef.current = reg;
      const current = await reg.pushManager.getSubscription().catch(() => null);
      setSubscribed(Boolean(current));
    }).catch(() => {});
  }, []);

  const enable = async () => {
    if (permission === "unsupported") return;
    setLoading(true);
    try {
      const perm = await Notification.requestPermission();
      setPermission(perm);
      if (perm !== "granted") return;

      const reg = swRef.current || await navigator.serviceWorker.register("/sw.js");
      swRef.current = reg;
      const { key } = await fetchVapidKey();
      const existing = await reg.pushManager.getSubscription();
      if (existing) await existing.unsubscribe().catch(() => {});
      const pushSub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(key),
      });
      await sub({ data: { endpoint: pushSub.endpoint, p256dh: arrayBufferToBase64(pushSub.getKey("p256dh")!), auth: arrayBufferToBase64(pushSub.getKey("auth")!) } });
      setSubscribed(true);
    } catch { /* user denied or error */ }
    setLoading(false);
  };

  const disable = async () => {
    setLoading(true);
    try {
      const reg = swRef.current || await navigator.serviceWorker.ready;
      const pushSub = await reg.pushManager.getSubscription();
      if (pushSub) await pushSub.unsubscribe();
      await unsub();
      setSubscribed(false);
      setPermission("denied");
    } catch { /* ignore */ }
    setLoading(false);
  };

  return { permission, subscribed, loading, enable, disable };
}

function arrayBufferToBase64(buf: ArrayBuffer) {
  const bytes = new Uint8Array(buf);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

export function PushToggle() {
  const { permission, subscribed, loading, enable, disable } = usePushNotifications();

  if (permission === "unsupported") return <p className="text-xs text-muted-foreground">Navegador não suporta notificações push.</p>;
  if (loading) return <p className="text-xs text-muted-foreground">A configurar...</p>;

  return (
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm font-medium">Notificações push</p>
        <p className="text-xs text-muted-foreground">
          {permission === "granted" ? "Notificações push activas" : "Receba alertas mesmo com o site fechado"}
        </p>
      </div>
      <button
        onClick={permission === "granted" && subscribed ? disable : enable}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${permission === "granted" && subscribed ? "bg-emerald-500" : "bg-secondary"}`}
      >
        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${permission === "granted" && subscribed ? "translate-x-6" : "translate-x-1"}`} />
      </button>
    </div>
  );
}
