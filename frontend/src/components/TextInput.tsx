import React from 'react';

// Props mirror the built-in input attributes so the component is flexible.
// We intentionally keep the API small and simply forward everything.
export interface TextInputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  // Nothing extra for now; consumers just pass whatever attributes they need.
}

export const TextInput = React.forwardRef<HTMLInputElement, TextInputProps>(
  ({ className = '', style, ...rest }, ref) => {
    // default styling used throughout app for text inputs
    const baseClasses =
      "bg-[#2a2a2a] border border-white/10 rounded-[var(--radius-input)] px-3 py-2 text-[#f8f8f8] text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 transition";

    return (
      <input
        ref={ref}
        className={`${baseClasses} ${className}`}
        style={{ colorScheme: 'dark', ...style }}
        {...rest}
      />
    );
  },
);

TextInput.displayName = 'TextInput';
