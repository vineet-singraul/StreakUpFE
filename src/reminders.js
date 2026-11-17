// Small helpers shared by the Reminders page and the always-mounted ReminderRinger

export const REMINDERS_CHANGED = 'reminders:changed';
export const remindersChanged = () => window.dispatchEvent(new Event(REMINDERS_CHANGED));

export const REMINDER_TEST = 'reminders:test';
/** Opens the real alarm screen for this reminder right now (preview) */
export const testReminder = (r) => window.dispatchEvent(new CustomEvent(REMINDER_TEST, { detail: r }));

const dayKey = (d) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;

/** "5:30 PM" */
export const fmtTime = (d) => new Date(d).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true }).toUpperCase();

/** "Today" / "Tomorrow" / "Fri, 21 Nov" */
export function dayLabel(at, t) {
  const d = new Date(at);
  const today = new Date();
  if (dayKey(d) === dayKey(today)) return t('rem.today');
  if (dayKey(d) === dayKey(new Date(today.getTime() + 86_400_000))) return t('rem.tomorrow');
  if (dayKey(d) === dayKey(new Date(today.getTime() - 86_400_000))) return t('rem.yesterday');
  return d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
}

/** "Today, 5:30 PM" / "Tomorrow, 9:00 AM" / "Fri, 21 Nov, 9:00 AM" */
export const fmtWhen = (at, t) => `${dayLabel(at, t)}, ${fmtTime(at)}`;
