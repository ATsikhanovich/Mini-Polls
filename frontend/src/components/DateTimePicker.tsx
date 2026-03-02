import { useEffect, useRef, useState } from 'react';
import { Calendar } from './Calendar';
import { TimeInput } from './TimeInput';
import {
  extractDateTimeComponents,
  formatToISO,
  getDateTimeLocalMin,
  isValidDate,
} from '../utils/dateTime';

interface DateTimePickerProps {
  value: string | null;
  onChange: (isoString: string) => void;
  onBlur?: () => void;
  min?: string;
  disabled?: boolean;
  'aria-label'?: string;
  className?: string;
}

export function DateTimePicker({
  value,
  onChange,
  onBlur,
  min,
  disabled,
  'aria-label': ariaLabel = 'Select date and time',
  className = '',
}: DateTimePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [hours, setHours] = useState(0);
  const [minutes, setMinutes] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Initialize state from value
  useEffect(() => {
    if (value) {
      const components = extractDateTimeComponents(value);
      if (components) {
        setSelectedDate(components.date);
        setHours(components.hours);
        setMinutes(components.minutes);
      }
    }
  }, [value]);

  // Close popover on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [isOpen]);

  // Compute min date from min string
  const minDate = min ? new Date(min) : undefined;

  // Format display value
  const displayValue = value
    ? new Date(value).toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      })
    : 'Select date & time';

  function handleDateSelect(date: Date) {
    setSelectedDate(date);
  }

  function handleTimeChange(newHours: number, newMinutes: number) {
    setHours(newHours);
    setMinutes(newMinutes);
  }

  function handleConfirm() {
    const isoString = formatToISO(selectedDate, hours, minutes);
    onChange(isoString);
    setIsOpen(false);
    onBlur?.();
  }

  function handleToggle() {
    if (disabled) return;
    setIsOpen(!isOpen);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Escape') {
      setIsOpen(false);
      onBlur?.();
    } else if (e.key === 'Enter' && isOpen) {
      e.preventDefault();
      handleConfirm();
    }
  }

  return (
    <div className={`relative ${className}`}>
      {/* Display button */}
      <button
        ref={buttonRef}
        type="button"
        onClick={handleToggle}
        disabled={disabled}
        aria-label={ariaLabel}
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        className="w-full px-4 py-2 rounded-[var(--radius-input)] bg-white/5 border border-white/10
          text-white text-sm text-left
          hover:bg-white/8 hover:border-white/20
          focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent
          disabled:opacity-60 disabled:cursor-not-allowed
          transition"
      >
        <span className="block truncate">{displayValue}</span>
      </button>

      {/* Popover */}
      {isOpen && !disabled && (
        <div
          ref={containerRef}
          role="dialog"
          onKeyDown={handleKeyDown}
          className="absolute z-50 mt-2 left-0 right-0 p-4 rounded-[var(--radius-card)]
            bg-white/5 border border-white/10 backdrop-blur-sm shadow-lg"
        >
          {/* Calendar */}
          <div className="mb-4">
            <Calendar
              selectedDate={selectedDate}
              onSelectDate={handleDateSelect}
              minDate={minDate}
              disabled={false}
            />
          </div>

          {/* Time input */}
          <div className="mb-4">
            <TimeInput
              hours={hours}
              minutes={minutes}
              onChange={handleTimeChange}
              disabled={false}
            />
          </div>

          {/* Confirm button */}
          <button
            type="button"
            onClick={handleConfirm}
            className="w-full px-4 py-2 rounded-[var(--radius-btn)]
              bg-primary-500 hover:bg-primary-600
              text-white font-medium text-sm
              transition disabled:opacity-60 disabled:cursor-not-allowed"
          >
            Confirm
          </button>
        </div>
      )}
    </div>
  );
}
