const SOUND_KEY = 'klosync.chat.sound';

let audioCtx: AudioContext | null = null;
let beepEl: HTMLAudioElement | null = null;
let beepSrc: string | null = null;

export function isChatSoundEnabled(): boolean {
  if (typeof window === 'undefined') return true;
  return window.localStorage.getItem(SOUND_KEY) !== '0';
}

export function setChatSoundEnabled(enabled: boolean): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(SOUND_KEY, enabled ? '1' : '0');
}

export async function ensureChatNotificationPermission(): Promise<NotificationPermission | 'unsupported'> {
  if (typeof window === 'undefined' || !('Notification' in window)) return 'unsupported';
  if (Notification.permission !== 'default') return Notification.permission;
  try {
    return await Notification.requestPermission();
  } catch {
    return Notification.permission;
  }
}

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const Ctor = window.AudioContext || (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  if (!audioCtx) audioCtx = new Ctor();
  return audioCtx;
}

function makeBeepWavDataUri(): string {
  const sampleRate = 22050;
  const duration = 0.22;
  const n = Math.floor(sampleRate * duration);
  const dataSize = n * 2;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);
  const writeStr = (offset: number, s: string) => {
    for (let i = 0; i < s.length; i += 1) view.setUint8(offset + i, s.charCodeAt(i));
  };
  writeStr(0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeStr(8, 'WAVE');
  writeStr(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeStr(36, 'data');
  view.setUint32(40, dataSize, true);
  for (let i = 0; i < n; i += 1) {
    const t = i / sampleRate;
    const env = Math.min(1, t / 0.01) * Math.max(0, 1 - (t / duration) ** 2);
    const freq = t < 0.11 ? 880 : 1174;
    const sample = Math.sin(2 * Math.PI * freq * t) * env * 0.32;
    view.setInt16(44 + i * 2, Math.round(sample * 32767), true);
  }
  const bytes = new Uint8Array(buffer);
  let bin = '';
  for (let i = 0; i < bytes.length; i += 1) bin += String.fromCharCode(bytes[i]);
  return `data:audio/wav;base64,${btoa(bin)}`;
}

function getBeepElement(): HTMLAudioElement | null {
  if (typeof window === 'undefined') return null;
  if (!beepSrc) beepSrc = makeBeepWavDataUri();
  if (!beepEl) {
    beepEl = new Audio(beepSrc);
    beepEl.preload = 'auto';
  }
  return beepEl;
}

function playOscillatorBeep(ctx: AudioContext): void {
  const now = ctx.currentTime;
  const beep = (start: number, freq: number, duration: number) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, start);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(0.08, start + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(start);
    osc.stop(start + duration + 0.02);
  };
  beep(now, 880, 0.12);
  beep(now + 0.14, 1174, 0.16);
}

export function unlockChatAudio(): void {
  const ctx = getAudioContext();
  if (ctx && ctx.state === 'suspended') {
    void ctx.resume();
  }
  const audio = getBeepElement();
  if (!audio || audio.dataset.unlocked === '1') return;
  audio.muted = true;
  void audio.play().then(() => {
    audio.pause();
    audio.currentTime = 0;
    audio.muted = false;
    audio.dataset.unlocked = '1';
  }).catch(() => {});
}

export function playChatIncomingSound(): void {
  if (!isChatSoundEnabled()) return;
  const audio = getBeepElement();
  if (audio) {
    audio.pause();
    try {
      audio.currentTime = 0;
    } catch {
      /* ignore */
    }
    audio.muted = false;
    audio.volume = 0.55;
    const playing = audio.play();
    if (playing) {
      void playing.catch(() => playViaContext());
      return;
    }
  }
  playViaContext();
}

function playViaContext(): void {
  const ctx = getAudioContext();
  if (!ctx) return;
  if (ctx.state === 'running') {
    playOscillatorBeep(ctx);
    return;
  }
  void ctx.resume().then(() => {
    if (ctx.state === 'running') playOscillatorBeep(ctx);
  }).catch(() => {});
}

export function showChatBrowserNotification(title: string, body: string, tag?: string): void {
  if (typeof window === 'undefined' || !('Notification' in window)) return;
  if (Notification.permission === 'default') {
    void Notification.requestPermission().then((permission) => {
      if (permission === 'granted') {
        showChatBrowserNotification(title, body, tag);
      }
    });
    return;
  }
  try {
    const n = new Notification(title, {
      body,
      tag: tag || 'klosync-chat',
      silent: true,
    });
    n.onclick = () => {
      window.focus();
      n.close();
    };
  } catch (error) {
    console.warn('No se pudo mostrar la notificación del chat:', error);
  }
}
