import { useState } from 'react';

interface CopyButtonProps {
  value: string;
  label?: string;
}

export function CopyButton({ value, label = 'Copy' }: CopyButtonProps) {
  const [status, setStatus] = useState<'idle' | 'copied' | 'failed'>('idle');

  async function handleClick() {
    try {
      await navigator.clipboard.writeText(value);
      setStatus('copied');
      setTimeout(() => setStatus('idle'), 2000);
    } catch {
      setStatus('failed');
      setTimeout(() => setStatus('idle'), 2000);
    }
  }

  const displayLabel =
    status === 'copied' ? 'Copied!' : status === 'failed' ? 'Failed' : label;

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={status !== 'idle'}
      className="shrink-0 text-sm font-medium px-3 py-1.5 rounded-[var(--radius-btn)]
        border border-primary-500 text-primary-400
        hover:bg-primary-500/10 disabled:opacity-60 disabled:cursor-not-allowed transition"
    >
      {displayLabel}
    </button>
  );
}
