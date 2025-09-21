import { useState } from 'react';
import Calendar from './Calendar';
import DateTimePicker from './DateTimePicker';

export default function CalendarDemo() {
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [selectedDateTime, setSelectedDateTime] = useState<Date>();

  return (
    <div className="space-y-8 p-6">
      <div>
        <h2 className="mb-4 text-xl font-semibold text-white">Calendar Components Demo</h2>
        <p className="mb-6 text-sm text-slate-400">
          Календарь автоматически скрывает прошедшие даты и время, а также выбирает сегодняшний день по умолчанию
        </p>
        
        {/* Simple Calendar */}
        <div className="mb-8">
          <h3 className="mb-4 text-lg font-medium text-slate-300">Simple Calendar</h3>
          <p className="mb-2 text-xs text-slate-500">
            Прошедшие даты недоступны для выбора. Сегодняшний день выбирается автоматически.
          </p>
          <Calendar
            value={selectedDate}
            onChange={setSelectedDate}
            className="max-w-sm"
          />
          {selectedDate && (
            <p className="mt-2 text-sm text-slate-400">
              Selected: {selectedDate.toLocaleDateString('ru-RU')}
            </p>
          )}
        </div>

        {/* DateTime Picker */}
        <div>
          <h3 className="mb-4 text-lg font-medium text-slate-300">Date & Time Picker</h3>
          <p className="mb-2 text-xs text-slate-500">
            Для сегодняшней даты доступно только будущее время. Автоматически выбирается следующий доступный временной слот.
          </p>
          <DateTimePicker
            value={selectedDateTime}
            onChange={setSelectedDateTime}
            placeholder="Select date and time"
            showTime={true}
            className="max-w-sm"
          />
          {selectedDateTime && (
            <p className="mt-2 text-sm text-slate-400">
              Selected: {selectedDateTime.toLocaleString('ru-RU')}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
