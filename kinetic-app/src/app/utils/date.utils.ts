export function toDateInputValue(val: string | null | undefined): string {
  if (!val) return '';
  return String(val).substring(0, 10);
}

export function isOverdue(endDate: string | null | undefined, status: string): boolean {
  if (!endDate) return false;
  if (status === 'completed' || status === 'closed') return false;
  return new Date(endDate) < new Date(todayStr());
}

export function todayStr(): string {
  return new Date().toISOString().substring(0, 10);
}

export function formatDate(val: string | null | undefined): string {
  if (!val) return '—';
  const d = new Date(val);
  if (isNaN(d.getTime())) return String(val);
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function daysUntil(dateStr: string): string {
  const today = new Date(todayStr());
  const due = new Date(dateStr);
  const diff = Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  if (diff < 0) return `${Math.abs(diff)} day${Math.abs(diff) !== 1 ? 's' : ''} ago`;
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Tomorrow';
  return `${diff} days left`;
}
