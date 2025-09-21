import React, { useState, useMemo } from 'react';
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';

interface CalendarProps {
  value?: Date;
  onChange?: (date: Date) => void;
  minDate?: Date;
  maxDate?: Date;
  className?: string;
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function Calendar({ 
  value, 
  onChange, 
  minDate, 
  maxDate, 
  className = '' 
}: CalendarProps) {
  // Auto-select today if no value is provided
  const effectiveValue = value || (() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return today;
  })();

  const [currentMonth, setCurrentMonth] = useState(() => {
    const today = new Date();
    const effectiveMinDate = minDate || today;
    return effectiveValue ? new Date(effectiveValue.getFullYear(), effectiveValue.getMonth(), 1) : 
           new Date(effectiveMinDate.getFullYear(), effectiveMinDate.getMonth(), 1);
  });

  // Auto-select today on mount if no value provided
  React.useEffect(() => {
    if (!value) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      onChange?.(today);
    }
  }, [value, onChange]);

  const calendarDays = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    
    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);
    const firstDayOfWeek = firstDayOfMonth.getDay();
    const daysInMonth = lastDayOfMonth.getDate();
    
    const days = [];
    
    // Add empty cells for days before the first day of the month
    for (let i = 0; i < firstDayOfWeek; i++) {
      days.push(null);
    }
    
    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(year, month, day));
    }
    
    return days;
  }, [currentMonth]);

  const isDateDisabled = (date: Date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Reset time to start of day
    
    const dateToCheck = new Date(date);
    dateToCheck.setHours(0, 0, 0, 0); // Reset time to start of day
    
    if (dateToCheck < today) return true; // Disable past dates
    if (minDate) {
      const minDateNormalized = new Date(minDate);
      minDateNormalized.setHours(0, 0, 0, 0);
      if (dateToCheck < minDateNormalized) return true;
    }
    if (maxDate) {
      const maxDateNormalized = new Date(maxDate);
      maxDateNormalized.setHours(0, 0, 0, 0);
      if (dateToCheck > maxDateNormalized) return true;
    }
    return false;
  };

  const isDateSelected = (date: Date) => {
    if (!effectiveValue) return false;
    return date.toDateString() === effectiveValue.toDateString();
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const handleDateClick = (date: Date) => {
    if (isDateDisabled(date)) return;
    onChange?.(date);
  };

  const goToPreviousMonth = () => {
    setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const goToNextMonth = () => {
    setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  const goToToday = () => {
    const today = new Date();
    setCurrentMonth(new Date(today.getFullYear(), today.getMonth(), 1));
    onChange?.(today);
  };

  return (
    <div className={`bg-slate-900/60 border border-slate-800 rounded-2xl p-4 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={goToPreviousMonth}
          className="p-2 rounded-lg hover:bg-slate-800 transition-colors"
          aria-label="Previous month"
        >
          <ChevronLeftIcon className="h-5 w-5 text-slate-400" />
        </button>
        
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-semibold text-white">
            {MONTHS[currentMonth.getMonth()]} {currentMonth.getFullYear()}
          </h3>
          <button
            onClick={goToToday}
            className="px-3 py-1 text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors"
          >
            Today
          </button>
        </div>
        
        <button
          onClick={goToNextMonth}
          className="p-2 rounded-lg hover:bg-slate-800 transition-colors"
          aria-label="Next month"
        >
          <ChevronRightIcon className="h-5 w-5 text-slate-400" />
        </button>
      </div>

      {/* Weekday headers */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {WEEKDAYS.map(day => (
          <div key={day} className="p-2 text-center text-xs font-medium text-slate-400">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-1">
        {calendarDays.map((date, index) => {
          if (!date) {
            return <div key={index} className="p-2" />;
          }

          const disabled = isDateDisabled(date);
          const selected = isDateSelected(date);
          const today = isToday(date);

          return (
            <button
              key={date.toISOString()}
              onClick={() => handleDateClick(date)}
              disabled={disabled}
              className={`
                p-2 text-sm rounded-lg transition-all duration-200
                ${disabled 
                  ? 'text-slate-600 cursor-not-allowed' 
                  : 'text-slate-300 hover:bg-slate-800 cursor-pointer'
                }
                ${selected 
                  ? 'bg-blue-600 text-white hover:bg-blue-700' 
                  : ''
                }
                ${today && !selected 
                  ? 'bg-slate-800 text-white font-semibold' 
                  : ''
                }
                ${today && selected 
                  ? 'bg-blue-600 text-white font-semibold' 
                  : ''
                }
              `}
            >
              {date.getDate()}
            </button>
          );
        })}
      </div>
    </div>
  );
}
