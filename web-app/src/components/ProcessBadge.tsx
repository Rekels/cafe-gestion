export default function ProcessBadge({ proceso, className = '', active = false }: { proceso?: string, className?: string, active?: boolean }) {
  if (!proceso) return null;
  const p = proceso.toUpperCase().trim();
  
  let bg = 'bg-white/10';
  let text = 'text-gray-300';
  let border = 'border-white/10';

  if (active) {
    bg = 'bg-black/10';
    text = 'text-[#1a120b]';
    border = 'border-[#1a120b]/20';
  } else if (p.includes('NATURAL')) {
    bg = 'bg-purple-500/20';
    text = 'text-purple-300';
    border = 'border-purple-500/30';
  } else if (p.includes('LAVADO') || p.includes('WASHED')) {
    bg = 'bg-emerald-500/20';
    text = 'text-emerald-300';
    border = 'border-emerald-500/30';
  } else if (p.includes('HONEY')) {
    bg = 'bg-yellow-500/20';
    text = 'text-yellow-300';
    border = 'border-yellow-500/30';
  }

  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold border ${bg} ${text} ${border} ${className}`}>
      {p}
    </span>
  );
}
