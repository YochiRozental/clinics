"use client";

import { combineDateAndTime } from "@/lib/slots";

type BusyInterval = { startTime: string; endTime: string };

type TimeSlotGridProps = {
  date: string;
  timeOptions: string[];
  selected: string;
  onSelect: (time: string) => void;
  busy: BusyInterval[];
  durationMinutes: number;
};

export function TimeSlotGrid({ date, timeOptions, selected, onSelect, busy, durationMinutes }: TimeSlotGridProps) {
  // eslint-disable-next-line react-hooks/purity -- used only to grey out past time slots, staleness is harmless
  const now = Date.now();

  function isOverlapping(time: string) {
    const start = combineDateAndTime(date, time);
    const end = new Date(start.getTime() + durationMinutes * 60000);
    return busy.some((b) => {
      const bStart = new Date(b.startTime);
      const bEnd = new Date(b.endTime);
      return start < bEnd && end > bStart;
    });
  }

  return (
    <div className="grid grid-cols-4 sm:grid-cols-6 gap-1.5 max-h-64 overflow-y-auto p-1">
      {timeOptions.map((time) => {
        const start = combineDateAndTime(date, time);
        const isPast = start.getTime() < now;
        const isBusy = !isPast && isOverlapping(time);
        const isSelected = time === selected;
        const isDisabled = isPast || isBusy;

        return (
          <button
            type="button"
            key={time}
            disabled={isDisabled}
            onClick={() => onSelect(time)}
            title={isBusy ? "תפוס" : isPast ? "עבר" : undefined}
            className={`h-9 rounded-lg text-sm font-medium transition-colors ${
              isSelected
                ? "bg-teal-600 text-white"
                : isDisabled
                  ? "bg-slate-50 text-slate-300 line-through cursor-not-allowed"
                  : "bg-white border border-slate-200 text-slate-700 hover:border-teal-400 hover:bg-teal-50"
            }`}
          >
            {time}
          </button>
        );
      })}
    </div>
  );
}
