// "Ka-ching" — som de venda (estilo Utmify): caixa registadora com sino duplo.
let ctx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const AC = window.AudioContext || (window as any).webkitAudioContext;
  if (!AC) return null;
  if (!ctx) ctx = new AC();
  if (ctx.state === "suspended") ctx.resume().catch(() => {});
  return ctx;
}

function bell(ac: AudioContext, out: GainNode, at: number, freqs: number[], gain: number, dur: number) {
  freqs.forEach((f, i) => {
    const osc = ac.createOscillator();
    const g = ac.createGain();
    osc.type = "sine";
    osc.frequency.value = f;
    const peak = gain / (i + 1.4);
    g.gain.setValueAtTime(0, at);
    g.gain.linearRampToValueAtTime(peak, at + 0.004);
    g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
    osc.connect(g).connect(out);
    osc.start(at);
    osc.stop(at + dur + 0.05);
  });
}

function click(ac: AudioContext, out: GainNode, at: number) {
  const len = Math.floor(ac.sampleRate * 0.05);
  const buf = ac.createBuffer(1, len, ac.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 6);
  const src = ac.createBufferSource();
  src.buffer = buf;
  const hp = ac.createBiquadFilter();
  hp.type = "highpass";
  hp.frequency.value = 2200;
  const g = ac.createGain();
  g.gain.value = 0.35;
  src.connect(hp).connect(g).connect(out);
  src.start(at);
}

export function playSaleSound() {
  try {
    const ac = getCtx();
    if (!ac) return;
    const master = ac.createGain();
    master.gain.value = 0.6;
    master.connect(ac.destination);
    const t = ac.currentTime + 0.02;
    click(ac, master, t);
    // "ka"
    bell(ac, master, t + 0.01, [1318.5, 2637, 3951], 0.5, 0.5);
    // "ching"
    bell(ac, master, t + 0.13, [1760, 3520, 5280], 0.55, 1.5);
  } catch {
    /* ignore */
  }
}

// Desbloqueia o áudio no primeiro toque/click do utilizador (política dos browsers).
export function primeSaleSound() {
  if (typeof window === "undefined") return;
  const unlock = () => {
    getCtx();
    window.removeEventListener("pointerdown", unlock);
    window.removeEventListener("keydown", unlock);
  };
  window.addEventListener("pointerdown", unlock, { once: true });
  window.addEventListener("keydown", unlock, { once: true });
}
