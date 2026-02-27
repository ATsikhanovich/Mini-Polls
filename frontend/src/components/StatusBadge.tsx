interface StatusBadgeProps {
  status: 'active' | 'closed' | 'expired';
}

const CONFIG = {
  active: {
    label: 'Active',
    className:
      'bg-[var(--color-status-active)]/20 text-[var(--color-status-active)]',
  },
  closed: {
    label: 'Closed',
    className:
      'bg-[var(--color-status-closed)]/20 text-[var(--color-status-closed)]',
  },
  expired: {
    label: 'Expired',
    className:
      'bg-[var(--color-status-expired)]/20 text-[var(--color-status-expired)]',
  },
} as const;

export function StatusBadge({ status }: StatusBadgeProps) {
  const { label, className } = CONFIG[status];
  return (
    <span
      className={`text-xs font-semibold uppercase tracking-wide px-2.5 py-0.5 rounded-full inline-block ${className}`}
    >
      {label}
    </span>
  );
}
