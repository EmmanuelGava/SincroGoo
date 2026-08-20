const SOUND_KEY = 'klosync.chat.sound';

let audioCtx: AudioContext | null = null;

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

export function unlockChatAudio(): void {
  const ctx = getAudioContext();
  if (ctx && ctx.state === 'suspended') {
    void ctx.resume();
  }
}

export function playChatIncomingSound(): void {
  if (!isChatSoundEnabled()) return;
  const ctx = getAudioContext();
  if (!ctx) return;
  void ctx.resume();
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
