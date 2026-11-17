// Small helpers shared by the Reminders page and the always-mounted ReminderRinger

export const REMINDERS_CHANGED = 'reminders:changed';
export const remindersChanged = () => window.dispatchEvent(new Event(REMINDERS_CHANGED));

export const REMINDER_TEST = 'reminders:test';
/** Opens the real alarm screen for this reminder right now (preview) */
export const testReminder = (r) => window.dispatchEvent(new CustomEvent(REMINDER_TEST, { detail: r }));

const dayKey = (d) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;

/** "5:30 PM" */
export const fmtTime = (d) => new Date(d).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true }).toUpperCase();

/** "Today, 5:30 PM" / "Tomorrow, 9:00 AM" / "Fri, 21 Nov, 9:00 AM" */
export function fmtWhen(at, t) {
  const d = new Date(at);
  const today = new Date();
  const tomorrow = new Date(today.getTime() + 86_400_000);
  const yesterday = new Date(today.getTime() - 86_400_000);
  let day;
  if (dayKey(d) === dayKey(today)) day = t('rem.today');
  else if (dayKey(d) === dayKey(tomorrow)) day = t('rem.tomorrow');
  else if (dayKey(d) === dayKey(yesterday)) day = t('rem.yesterday');
  else day = d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
  return `${day}, ${fmtTime(d)}`;
}
