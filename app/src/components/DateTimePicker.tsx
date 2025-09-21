import React, { useState, useMemo, useEffect } from 'react';
import { CalendarIcon, ClockIcon } from '@heroicons/react/24/outline';
import Calendar from './Calendar';
import TimePicker from './TimePicker';

interface DateTimePickerProps {
  value?: Date;
  onChange?: (date: Date) => void;
  minDate?: Date;
  maxDate?: Date;
  minTime?: Date; // Minimum time for today's date
  className?: string;
  placeholder?: string;
  showTime?: boolean;
}

export default function DateTimePicker({
  value,
  onChange,
  minDate,
  maxDate,
  minTime,
  className = '',
  placeholder = 'Select date and time',
  showTime = true
}: DateTimePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  
  // Auto-select today if no value provided
  const getInitialDate = () => {
    if (value) return value;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return today;
  };

  const [selectedDate, setSelectedDate] = useState<Date | undefined>(getInitialDate());
  const [selectedTime, setSelectedTime] = useState<string>(() => {
    if (value) {
      return `${value.getHours().toString().padStart(2, '0')}:${value.getMinutes().toString().padStart(2, '0')}`;
    }
    // Default to next available time slot (rounded up to next 15 minutes)
    const now = new Date();
    const nextSlot = new Date(now.getTime() + 15 * 60 * 1000);
    nextSlot.setMinutes(Math.ceil(nextSlot.getMinutes() / 15) * 15, 0, 0);
    return `${nextSlot.getHours().toString().padStart(2, '0')}:${nextSlot.getMinutes().toString().padStart(2, '0')}`;
  });

  // Auto-select today and next available time on mount if no value provided
  useEffect(() => {
    if (!value) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      setSelectedDate(today);
      
      if (showTime) {
        const now = new Date();
        const nextSlot = new Date(now.getTime() + 15 * 60 * 1000);
        nextSlot.setMinutes(Math.ceil(nextSlot.getMinutes() / 15) * 15, 0, 0);
        const timeString = `${nextSlot.getHours().toString().padStart(2, '0')}:${nextSlot.getMinutes().toString().padStart(2, '0')}`;
        setSelectedTime(timeString);
        
        // Create initial datetime and call onChange
        const initialDateTime = new Date(today);
        initialDateTime.setHours(nextSlot.getHours(), nextSlot.getMinutes(), 0, 0);
        onChange?.(initialDateTime);
      } else {
        onChange?.(today);
      }
    }
  }, [value, onChange, showTime]);

  const handleDateChange = (date: Date) => {
    setSelectedDate(date);
    
    if (showTime && selectedTime) {
      const [hours, minutes] = selectedTime.split(':').map(Number);
      const newDateTime = new Date(date);
      newDateTime.setHours(hours, minutes, 0, 0);
      onChange?.(newDateTime);
    } else if (!showTime) {
      onChange?.(date);
    }
  };

  const handleTimeChange = (time: string) => {
    setSelectedTime(time);
    
    if (selectedDate) {
      const [hours, minutes] = time.split(':').map(Number);
      const newDateTime = new Date(selectedDate);
      newDateTime.setHours(hours, minutes, 0, 0);
      onChange?.(newDateTime);
    }
  };

  const displayValue = useMemo(() => {
    if (!value) return placeholder;
    
    const dateStr = value.toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
    
    if (showTime) {
      const timeStr = value.toLocaleTimeString('ru-RU', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      });
      return `${dateStr} ${timeStr}`;
    }
    
    return dateStr;
  }, [value, placeholder, showTime]);

  const handleApply = () => {
    if (selectedDate) {
      if (showTime && selectedTime) {
        const [hours, minutes] = selectedTime.split(':').map(Number);
        const newDateTime = new Date(selectedDate);
        newDateTime.setHours(hours, minutes, 0, 0);
        onChange?.(newDateTime);
      } else {
        onChange?.(selectedDate);
      }
    }
    setIsOpen(false);
  };

  const handleCancel = () => {
    setSelectedDate(value);
    if (value) {
      setSelectedTime(`${value.getHours().toString().padStart(2, '0')}:${value.getMinutes().toString().padStart(2, '0')}`);
    } else {
      setSelectedTime('');
    }
    setIsOpen(false);
  };

  return (
    <div className={`relative ${className}`}>
      {/* Input field */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full rounded border border-slate-700 bg-slate-950 px-3 py-2 text-left text-white placeholder-slate-500 hover:border-slate-600 focus:border-slate-600 focus:outline-none focus:ring-1 focus:ring-slate-600"
      >
        <div className="flex items-center gap-2">
          <CalendarIcon className="h-4 w-4 text-slate-400" />
          <span className={value ? 'text-white' : 'text-slate-500'}>
            {displayValue}
          </span>
        </div>
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute z-50 mt-2 w-full min-w-[320px] rounded-2xl border border-slate-800 bg-slate-900/95 backdrop-blur-sm shadow-xl">
          <div className="p-4">
            {/* Calendar */}
            <Calendar
              value={selectedDate}
              onChange={handleDateChange}
              minDate={minDate || (() => {
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                return today;
              })()}
              maxDate={maxDate}
              className="mb-4"
            />

            {/* Time picker */}
            {showTime && (
              <div className="mb-4">
                <label className="mb-2 block text-sm font-medium text-slate-300">
                  Time
                </label>
                <TimePicker
                  value={selectedTime}
                  onChange={handleTimeChange}
                  placeholder="Select time"
                  selectedDate={selectedDate}
                  minTime={minTime}
                />
              </div>
            )}

            {/* Action buttons */}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleCancel}
                className="flex-1 rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-sm text-slate-300 hover:bg-slate-700 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleApply}
                disabled={!selectedDate || (showTime && !selectedTime)}
                className="flex-1 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50 transition-colors"
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

