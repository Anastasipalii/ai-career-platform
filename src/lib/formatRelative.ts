export function formatRelative(iso: string): string {
  const then = new Date(iso).getTime();
  const diff = Date.now() - then;
  const mins = Math.floor(diff / 60_000);
  if (mins < 1)  return "Just now";
  if (mins < 60) return mins === 1 ? "1 minute ago" : `${mins} minutes ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 6)   return hrs === 1 ? "1 hour ago" : `${hrs} hours ago`;
  // Calendar-relative day labels for older items.
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  if (then >= startOfToday.getTime()) return "Today";
  const startOfYesterday = startOfToday.getTime() - 86_400_000;
  if (then >= startOfYesterday) return "Yesterday";
  const days = Math.floor(hrs / 24);
  if (days < 7)  return days === 1 ? "1 day ago" : `${days} days ago`;
  const weeks = Math.floor(days / 7);
  if (weeks < 5) return weeks === 1 ? "1 week ago" : `${weeks} weeks ago`;
  const months = Math.floor(days / 30);
  return months === 1 ? "1 month ago" : `${months} months ago`;
}
