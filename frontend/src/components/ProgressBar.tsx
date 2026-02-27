interface ProgressBarProps {
  percentage: number;
  label?: string;
}

export function ProgressBar({ percentage, label }: ProgressBarProps) {
  const clamped = Math.min(Math.max(percentage, 0), 100);
  const formatted =
    clamped.toFixed(1).replace(/\.0$/, '') + '%';

  return (
    <div
      role="progressbar"
      aria-valuenow={percentage}
      aria-valuemin={0}
      aria-valuemax={100}
      className="bg-[var(--color-progress-bg)] rounded-full h-6 overflow-hidden relative"
    >
      <div
        className="bg-[var(--color-progress-fill)] h-full rounded-full transition-all duration-300"
        style={{ width: `${clamped}%` }}
      />
      <div className="absolute inset-0 flex items-center justify-between px-2 pointer-events-none">
        {label != null ? (
          <span className="text-xs font-medium text-white/80 truncate">{label}</span>
        ) : (
          <span />
        )}
        <span className="text-xs font-medium text-white/80">{formatted}</span>
      </div>
    </div>
  );
}
