'use client';

import { useState } from 'react';
import { useWorldStore } from '~/lib/store';
import { OBJECT_TYPES } from '~/lib/constants';

interface RadialMenuProps {
  isOpen: boolean;
  onClose: () => void;
  position: { x: number; y: number };
}

export function RadialMenu({ isOpen, onClose, position }: RadialMenuProps) {
  const { setPlacing } = useWorldStore();
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  if (!isOpen) return null;

  const categories = [
    { name: 'trees', icon: '🌲', items: OBJECT_TYPES.trees },
    { name: 'structures', icon: '🏠', items: OBJECT_TYPES.structures },
    { name: 'decorations', icon: '🌸', items: OBJECT_TYPES.decorations },
  ];

  const handleCategorySelect = (category: string) => {
    setSelectedCategory(category === selectedCategory ? null : category);
  };

  const handleObjectSelect = (objectType: string) => {
    // Store the selected object type in the store
    useWorldStore.getState().selectedObjectType = objectType;
    setPlacing(true);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50"
      onClick={onClose}
    >
      {/* Main radial menu */}
      <div
        className="absolute"
        style={{
          left: position.x - 100,
          top: position.y - 100,
          width: 200,
          height: 200,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Background circle */}
        <div className="absolute inset-4 rounded-full bg-black/70 backdrop-blur-sm border border-white/20" />
        
        {/* Category buttons */}
        {categories.map((category, index) => {
          const angle = (index * 120) - 90; // Distribute evenly around circle
          const radius = 60;
          const x = Math.cos((angle * Math.PI) / 180) * radius + 100;
          const y = Math.sin((angle * Math.PI) / 180) * radius + 100;
          
          return (
            <button
              key={category.name}
              className={`absolute w-12 h-12 rounded-full flex items-center justify-center text-xl transition-all duration-200 ${
                selectedCategory === category.name
                  ? 'bg-blue-500 scale-110'
                  : 'bg-white/10 hover:bg-white/20 hover:scale-105'
              }`}
              style={{
                left: x - 24,
                top: y - 24,
              }}
              onClick={() => handleCategorySelect(category.name)}
            >
              {category.icon}
            </button>
          );
        })}

        {/* Center close button */}
        <button
          className="absolute w-8 h-8 rounded-full bg-red-500/80 hover:bg-red-500 flex items-center justify-center text-white text-sm transition-all duration-200 hover:scale-110"
          style={{
            left: 96,
            top: 96,
          }}
          onClick={onClose}
        >
          ✕
        </button>
      </div>

      {/* Sub-menu for object types */}
      {selectedCategory && (
        <div
          className="absolute"
          style={{
            left: position.x + 120,
            top: position.y - 100,
          }}
        >
          <div className="bg-black/80 backdrop-blur-sm rounded-lg border border-white/20 p-2">
            <h3 className="text-white text-sm font-medium mb-2 capitalize">
              {selectedCategory}
            </h3>
            <div className="space-y-1">
              {categories
                .find((cat) => cat.name === selectedCategory)
                ?.items.map((item) => (
                  <button
                    key={item}
                    className="block w-full px-3 py-2 text-left text-white/80 hover:text-white hover:bg-white/10 rounded transition-colors duration-150 text-sm capitalize"
                    onClick={() => handleObjectSelect(item)}
                  >
                    {item}
                  </button>
                ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}