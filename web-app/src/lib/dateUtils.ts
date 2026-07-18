export function formatDateLatino(dateString?: string | null): string {
  if (!dateString) return '-';
  // Parse date safely
  const d = new Date(dateString);
  // Ensure it's valid
  if (isNaN(d.getTime())) return dateString;

  // Since date string might be 'YYYY-MM-DD', new Date('YYYY-MM-DD') parses as UTC.
  // We want to avoid timezone shifting the day back if it's treated as UTC midnight but rendered in local timezone.
  // A simple split approach for 'YYYY-MM-DD' is safest for exact dates.
  if (dateString.match(/^\d{4}-\d{2}-\d{2}$/)) {
    const [year, month, day] = dateString.split('-');
    return `${day}/${month}/${year.slice(-2)}`;
  } else if (dateString.match(/^\d{4}-\d{2}-\d{2}T/)) {
     // If it's ISO datetime
     const localD = new Date(d.getTime() + d.getTimezoneOffset() * 60000);
     const day = localD.getDate().toString().padStart(2, '0');
     const month = (localD.getMonth() + 1).toString().padStart(2, '0');
     const year = localD.getFullYear().toString().slice(-2);
     return `${day}/${month}/${year}`;
  }

  const day = d.getDate().toString().padStart(2, '0');
  const month = (d.getMonth() + 1).toString().padStart(2, '0');
  const year = d.getFullYear().toString().slice(-2);
  
  return `${day}/${month}/${year}`;
}
