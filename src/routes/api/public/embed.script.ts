import { createFileRoute } from "@tanstack/react-router";

const EMBED_JS = `(function() {
  var userId = null;
  var origin = window.location.origin;

  // Parse user_id from the script tag
  var scripts = document.getElementsByTagName('script');
  for (var i = 0; i < scripts.length; i++) {
    var src = scripts[i].src || '';
    var match = src.match(/[?&]user_id=([^&]+)/);
    if (match) userId = decodeURIComponent(match[1]);
  }

  if (!userId) return;

  var container = document.createElement('div');
  container.id = 'redoxpay-notifications';
  container.style.cssText = 'position:fixed;bottom:16px;right:16px;z-index:999999;display:flex;flex-direction:column;gap:12px;max-width:340px;width:100%;pointer-events:none;';
  document.body.appendChild(container);

  function createCard(data) {
    var amount = data.data && data.data.amount_mzn ? Number(data.data.amount_mzn).toLocaleString('pt-MZ', { style: 'currency', currency: data.data.currency || 'MZN' }) : '';
    var customer = (data.data && data.data.customer_name) || 'Cliente';
    var product = (data.data && data.data.product_name) || '';

    var card = document.createElement('div');
    card.style.cssText = 'pointer-events:auto;background:linear-gradient(135deg,#1a0a0a,#2d1515);border-left:4px solid #ff3333;border-radius:12px;padding:16px;box-shadow:0 20px 60px rgba(0,0,0,0.5),0 0 30px rgba(255,51,51,0.2);display:flex;align-items:flex-start;gap:12px;animation:redoxpaySlideIn 0.4s ease-out;';

    var icon = document.createElement('div');
    icon.style.cssText = 'width:36px;height:36px;border-radius:50%;background:rgba(255,51,51,0.2);display:flex;align-items:center;justify-content:center;flex-shrink:0;';
    icon.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ff3333" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>';
    card.appendChild(icon);

    var body = document.createElement('div');
    body.style.cssText = 'flex:1;min-width:0;';

    var subtitle = document.createElement('p');
    subtitle.style.cssText = 'margin:0;font-size:13px;color:#9ca3af;';
    subtitle.textContent = 'Nova venda aprovada!';
    body.appendChild(subtitle);

    var source = document.createElement('p');
    source.style.cssText = 'margin:2px 0 0;font-size:13px;color:#fff;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;';
    source.textContent = 'de ' + customer + (product ? ' \\u00b7 ' + product : '');
    body.appendChild(source);

    if (amount) {
      var value = document.createElement('p');
      value.style.cssText = 'margin:4px 0 0;font-size:18px;font-weight:700;color:#ff5555;';
      value.textContent = amount;
      body.appendChild(value);
    }

    card.appendChild(body);

    var close = document.createElement('button');
    close.style.cssText = 'background:none;border:none;color:#6b7280;cursor:pointer;padding:0;flex-shrink:0;margin-top:2px;';
    close.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>';
    close.onclick = function() { card.remove(); };
    card.appendChild(close);

    return card;
  }

  // Add animation styles
  var style = document.createElement('style');
  style.textContent = '@keyframes redoxpaySlideIn { from { transform: translateX(120%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }';
  document.head.appendChild(style);

  var lastTime = new Date(0).toISOString();

  function poll() {
    var url = origin + '/api/public/notifications/poll?user_id=' + encodeURIComponent(userId) + '&after=' + encodeURIComponent(lastTime);
    fetch(url)
      .then(function(r) { return r.json(); })
      .then(function(notifications) {
        if (notifications && notifications.length) {
          notifications.forEach(function(n) {
            var card = createCard(n);
            container.appendChild(card);
            setTimeout(function() { if (card.parentNode) card.remove(); }, 6000);
          });
          lastTime = notifications[0].created_at;
        }
      })
      .catch(function() {});
  }

  poll();
  setInterval(poll, 10000);
})();`;

export const Route = createFileRoute("/api/public/embed/script")({
  server: {
    handlers: {
      GET: async () => {
        return new Response(EMBED_JS, {
          headers: {
            "Content-Type": "application/javascript; charset=utf-8",
            "Access-Control-Allow-Origin": "*",
            "Cache-Control": "public, max-age=3600",
          },
        });
      },
    },
  },
});
