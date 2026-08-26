export type ProximaTareaLead = {
  id: string;
  due_date: string;
  title?: string | null;
};

export type TaskBadgeKind = 'overdue' | 'today' | 'future' | null;

export function resolveTaskBadgeKind(
  tarea: ProximaTareaLead | null | undefined,
  now: Date = new Date()
): TaskBadgeKind {
  if (!tarea?.due_date) return null;
  const due = new Date(tarea.due_date);
  if (!Number.isFinite(due.getTime())) return null;

  const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startDue = new Date(due.getFullYear(), due.getMonth(), due.getDate());

  if (startDue.getTime() < startToday.getTime()) return 'overdue';
  if (startDue.getTime() === startToday.getTime()) return 'today';
  return 'future';
}

export const TASK_BADGE_LABEL: Record<Exclude<TaskBadgeKind, null>, string> = {
  overdue: 'Vencida',
  today: 'Vence hoy',
  future: 'Programada',
};
