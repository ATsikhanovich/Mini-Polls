interface TimeInputProps {
  hours: number;
  minutes: number;
  onChange: (hours: number, minutes: number) => void;
  disabled?: boolean;
}

export function TimeInput({ hours, minutes, onChange, disabled }: TimeInputProps) {
  const minuteOptions = [0, 15, 30, 45];

  function handleHoursChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const newHours = parseInt(e.target.value, 10);
    onChange(newHours, minutes);
  }

  function handleMinutesChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const newMinutes = parseInt(e.target.value, 10);
    onChange(hours, newMinutes);
  }

  return (
    <div className="flex items-center gap-2">
      <div className="flex-1">
        <label htmlFor="time-hours" className="block text-xs font-semibold text-white/60 mb-1">
          Hour
        </label>
        <select
          id="time-hours"
          value={hours}
          onChange={handleHoursChange}
          disabled={disabled}
          className="w-full px-2 py-2 rounded-[var(--radius-input)] bg-white/5 border border-white/10
            text-white text-sm font-medium
            focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent
            disabled:opacity-60 disabled:cursor-not-allowed
            transition"
        >
          {Array.from({ length: 24 }, (_, i) => (
            <option
              key={i}
              value={i}
              className="bg-white text-black"
            >
              {String(i).padStart(2, '0')}
            </option>
          ))}
        </select>
      </div>

      <div className="flex-1">
        <label htmlFor="time-minutes" className="block text-xs font-semibold text-white/60 mb-1">
          Minute
        </label>
        <select
          id="time-minutes"
          value={minutes}
          onChange={handleMinutesChange}
          disabled={disabled}
          className="w-full px-2 py-2 rounded-[var(--radius-input)] bg-white/5 border border-white/10
            text-white text-sm font-medium
            focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent
            disabled:opacity-60 disabled:cursor-not-allowed
            transition"
        >
          {minuteOptions.map((min) => (
            <option
              key={min}
              value={min}
              className="bg-white text-black"
            >
              {String(min).padStart(2, '0')}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
