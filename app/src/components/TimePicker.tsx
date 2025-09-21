import { useState, useRef, useEffect, useMemo } from 'react';
import { ClockIcon } from '@heroicons/react/24/outline';

interface TimePickerProps {
  value?: string; // Format: "HH:MM"
  onChange?: (time: string) => void;
  step?: number; // Minutes step (default: 15)
  className?: string;
  placeholder?: string;
  selectedDate?: Date; // Used to determine if we should hide past times
  minTime?: Date; // Minimum time for today's date
}

export default function TimePicker({ 
  value = '', 
  onChange, 
  step = 15, 
  className = '',
  placeholder = '--:--',
  selectedDate,
  minTime
}: TimePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState(value);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Generate time options
  const timeOptions = useMemo(() => {
    const options = [];
    const now = new Date();
    const isToday = selectedDate && 
      selectedDate.toDateString() === now.toDateString();
    
    for (let hour = 0; hour < 24; hour++) {
      for (let minute = 0; minute < 60; minute += step) {
        const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        const timeDate = new Date();
        timeDate.setHours(hour, minute, 0, 0);
        
        // Skip times based on conditions
        let shouldSkip = false;
        
        // If it's today, skip past times
        if (isToday) {
          // Add 15 minutes buffer to current time to avoid edge cases
          const bufferTime = new Date(now.getTime() + 15 * 60 * 1000);
          if (timeDate <= bufferTime) {
            shouldSkip = true;
          }
        }
        
        // Skip times before minTime if provided
        if (minTime && timeDate < minTime) {
          shouldSkip = true;
        }
        
        if (!shouldSkip) {
          options.push(timeString);
        }
      }
    }
    return options;
  }, [step, selectedDate, minTime]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Update input value when prop changes
  useEffect(() => {
    setInputValue(value);
  }, [value]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    
    // Validate and call onChange if valid
    if (newValue.match(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)) {
      onChange?.(newValue);
    }
  };

  const handleTimeSelect = (time: string) => {
    setInputValue(time);
    onChange?.(time);
    setIsOpen(false);
  };

  const formatDisplayValue = (time: string) => {
    if (!time) return placeholder;
    return time;
  };

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <div className="relative">
        <input
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onFocus={() => setIsOpen(true)}
          placeholder={placeholder}
          className="w-full rounded border border-slate-700 bg-slate-950 px-3 py-2 pr-10 text-white placeholder-slate-500 focus:border-slate-600 focus:outline-none focus:ring-1 focus:ring-slate-600"
        />
        <ClockIcon className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
      </div>

      {isOpen && (
        <div className="absolute z-50 mt-1 w-full max-h-48 overflow-y-auto rounded-lg border border-slate-700 bg-slate-900 shadow-lg">
          {timeOptions.map((time) => (
            <button
              key={time}
              onClick={() => handleTimeSelect(time)}
              className={`
                w-full px-3 py-2 text-left text-sm transition-colors
                ${inputValue === time 
                  ? 'bg-blue-600 text-white' 
                  : 'text-slate-300 hover:bg-slate-800'
                }
              `}
            >
              {time}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}


