'use client';

import { useWorldStore, type TimeOfDay } from '~/lib/store';

export function TimeOfDayPicker() {
  const { timeOfDay, updateTimeOfDay } = useWorldStore();

  const timeOptions: { value: TimeOfDay; label: string; icon: string; color: string }[] = [
    { value: 'day', label: 'Day', icon: '☀️', color: 'from-blue-400 to-blue-600' },
    { value: 'sunset', label: 'Sunset', icon: '🌅', color: 'from-orange-400 to-red-500' },
    { value: 'night', label: 'Night', icon: '🌙', color: 'from-purple-600 to-indigo-800' },
  ];

  return (
    <div className="bg-black/70 backdrop-blur-sm rounded-lg border border-white/20 p-2">
      <div className="flex items-center space-x-1">
        {timeOptions.map((option) => (
          <button
            key={option.value}
            onClick={() => updateTimeOfDay(option.value)}
            className={`relative p-3 rounded-lg transition-all duration-300 overflow-hidden ${
              timeOfDay === option.value
                ? 'scale-110 ring-2 ring-white/50'
                : 'hover:scale-105'
            }`}
            title={option.label}
          >
            {/* Background gradient */}
            <div
              className={`absolute inset-0 bg-gradient-to-br ${option.color} ${
                timeOfDay === option.value ? 'opacity-100' : 'opacity-60'
              } transition-opacity duration-300`}
            />
            
            {/* Icon */}
            <span className="relative text-lg" role="img" aria-label={option.label}>
              {option.icon}
            </span>
          </button>
        ))}
      </div>
      
      {/* Label */}
      <div className="mt-2 text-center">
        <span className="text-white/60 text-xs font-medium capitalize">
          {timeOfDay}
        </span>
      </div>
    </div>
  );
}