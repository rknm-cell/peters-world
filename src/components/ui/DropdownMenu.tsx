"use client";

import { useState } from "react";
import { useWorldStore } from "~/lib/store";
import { OBJECT_TYPES } from "~/lib/constants";

interface DropdownMenuProps {
  isOpen: boolean;
  onClose: () => void;
  position: { x: number; y: number };
}

export function DropdownMenu({ isOpen, onClose, position }: DropdownMenuProps) {
  const { setPlacing, setSelectedObjectType } = useWorldStore();
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  if (!isOpen) return null;

  const categories = [
    { name: "trees", icon: "🌲", items: OBJECT_TYPES.trees },
    { name: "structures", icon: "🏠", items: OBJECT_TYPES.structures },
    { name: "decorations", icon: "🌸", items: OBJECT_TYPES.decorations },
    { name: "grass", icon: "🌿", items: OBJECT_TYPES.grass },
    { name: "animals", icon: "🐾", items: OBJECT_TYPES.animals },
  ];

  const handleCategorySelect = (category: string) => {
    setSelectedCategory(category === selectedCategory ? null : category);
  };

  const handleObjectSelect = (objectType: string) => {
    setSelectedObjectType(objectType);
    setPlacing(true);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50" onClick={onClose}>
      {/* Main dropdown menu */}
      <div
        className="absolute"
        style={{
          left: position.x,
          top: position.y + 10,
          width: 200,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Background container */}
        <div className="rounded-lg border border-white/20 bg-black/80 p-2 backdrop-blur-sm">
          {/* Category buttons */}
          <div className="space-y-2">
            {categories.map((category) => (
              <div key={category.name} className="relative">
                <button
                  className={`flex w-full items-center justify-between rounded px-3 py-2 text-left text-sm capitalize text-white/80 transition-colors duration-150 hover:bg-white/10 hover:text-white ${
                    selectedCategory === category.name
                      ? "bg-white/20 text-white"
                      : ""
                  }`}
                  onClick={() => handleCategorySelect(category.name)}
                >
                  <span className="flex items-center gap-2">
                    <span className="text-lg">{category.icon}</span>
                    <span>{category.name}</span>
                  </span>
                  <span
                    className={`transition-transform duration-200 ${
                      selectedCategory === category.name ? "rotate-180" : ""
                    }`}
                  >
                    ▼
                  </span>
                </button>

                {/* Sub-menu for object types */}
                {selectedCategory === category.name && (
                  <div className="ml-4 mt-1 rounded border border-white/10 bg-black/60 p-2">
                    <div className="custom-scrollbar max-h-48 overflow-y-auto">
                      <div className="space-y-1">
                        {category.items.map((item) => (
                          <button
                            key={item}
                            className="block w-full rounded px-3 py-2 text-left text-sm capitalize text-white/70 transition-colors duration-150 hover:bg-white/10 hover:text-white"
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
            ))}
          </div>

          {/* Close button */}
          <div className="mt-3 border-t border-white/10 pt-2">
            <button
              className="flex w-full items-center justify-center rounded px-3 py-2 text-sm text-red-400 transition-colors duration-150 hover:bg-red-500/20 hover:text-red-300"
              onClick={onClose}
            >
              ✕ Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
