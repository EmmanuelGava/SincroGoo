/** Parsea fecha YYYY-MM-DD + hora HH:mm en hora local del navegador/servidor. */
export function parseLocalScheduleDatetime(fecha: string, hora: string): Date | null {
  const f = String(fecha || '').trim();
  const h = String(hora || '').trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(f) || !/^\d{2}:\d{2}$/.test(h)) return null;
  const [year, month, day] = f.split('-').map(Number);
  const [hours, minutes] = h.split(':').map(Number);
  const when = new Date(year, month - 1, day, hours, minutes, 0, 0);
  return Number.isFinite(when.getTime()) ? when : null;
}

export function isFutureSchedule(when: Date, nowMs = Date.now()): boolean {
  return when.getTime() > nowMs + 1000;
}

/** Fecha y hora local actuales (punto de partida para editar). */
export function currentScheduleFields(now = new Date()): { fecha: string; hora: string } {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return {
    fecha: `${y}-${m}-${d}`,
    hora: `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`,
  };
}

/** Default: ahora + minMinutes (para pruebas / atajos). */
export function defaultScheduleFields(minMinutes = 5, now = new Date()): { fecha: string; hora: string } {
  const d = new Date(now.getTime() + minMinutes * 60_000);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return {
    fecha: `${y}-${m}-${day}`,
    hora: `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`,
  };
}

export function formatScheduleLocal(iso: string): string {
  const normalized = String(iso || '').trim().replace(' ', 'T');
  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString('es-AR', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}
