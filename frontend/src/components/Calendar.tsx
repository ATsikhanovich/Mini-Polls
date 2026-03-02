import { useState } from 'react';
import { getDaysInMonth, getFirstDayOfMonth, isDateInPast } from '../utils/dateTime';

interface CalendarProps {
  selectedDate: Date;
  onSelectDate: (date: Date) => void;
  minDate?: Date;
  disabled?: boolean;
}

export function Calendar({ selectedDate, onSelectDate, minDate, disabled }: CalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(selectedDate.getMonth());
  const [currentYear, setCurrentYear] = useState(selectedDate.getFullYear());

  const daysInMonth = getDaysInMonth(currentYear, currentMonth);
  const firstDayOfMonth = getFirstDayOfMonth(currentYear, currentMonth);
  const days = [];

  // Empty cells for days before the first day of the month
  for (let i = 0; i < firstDayOfMonth; i++) {
    days.push(null);
  }

  // Days of the month
  for (let day = 1; day <= daysInMonth; day++) {
    days.push(day);
  }

  const monthName = new Date(currentYear, currentMonth, 1).toLocaleString('default', {
    month: 'long',
  });

  function handlePrevMonth() {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
  }

  function handleNextMonth() {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
  }

  function handleSelectDay(day: number) {
    if (disabled) return;
    const newDate = new Date(currentYear, currentMonth, day);
    onSelectDate(newDate);
  }

  function isDisabledDay(day: number): boolean {
    const dateToCheck = new Date(currentYear, currentMonth, day);
    if (minDate) {
      // Disable dates before minDate
      return dateToCheck < minDate;
    }
    return false;
  }

  function isDaySelected(day: number): boolean {
    return (
      day === selectedDate.getDate() &&
      selectedDate.getMonth() === currentMonth &&
      selectedDate.getFullYear() === currentYear
    );
  }

  function isToday(day: number): boolean {
    const today = new Date();
    return (
      day === today.getDate() &&
      today.getMonth() === currentMonth &&
      today.getFullYear() === currentYear
    );
  }

  return (
    <div className="w-full">
      {/* Month/Year header */}
      <div className="flex items-center justify-between mb-4">
        <button
          type="button"
          onClick={handlePrevMonth}
          disabled={disabled}
          className="p-1 text-white/60 hover:text-white/80 disabled:opacity-50 disabled:cursor-not-allowed transition"
          aria-label="Previous month"
        >
          ←
        </button>
        <div className="text-sm font-semibold text-white/80">
          {monthName} {currentYear}
        </div>
        <button
          type="button"
          onClick={handleNextMonth}
          disabled={disabled}
          className="p-1 text-white/60 hover:text-white/80 disabled:opacity-50 disabled:cursor-not-allowed transition"
          aria-label="Next month"
        >
          →
        </button>
      </div>

      {/* Weekday headers */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((day) => (
          <div key={day} className="text-xs font-semibold text-white/50 text-center h-6">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-1">
        {days.map((day, index) => (
          <button
            key={index}
            type="button"
            onClick={() => day !== null && handleSelectDay(day)}
            disabled={day === null || isDisabledDay(day || 1) || disabled}
            aria-label={day ? `${monthName} ${day}, ${currentYear}` : undefined}
            className={`
              h-8 text-xs rounded transition flex items-center justify-center
              ${
                day === null
                  ? 'cursor-default'
                  : isDaySelected(day)
                    ? 'bg-primary-500 text-white font-semibold'
                    : isToday(day)
                      ? 'border border-primary-400 text-primary-300'
                      : isDisabledDay(day)
                        ? 'text-white/20 cursor-not-allowed'
                        : 'text-white/70 hover:bg-white/10'
              }
            `}
          >
            {day}
          </button>
        ))}
      </div>
    </div>
  );
}
