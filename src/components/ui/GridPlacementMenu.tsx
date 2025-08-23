"use client";

import { useState, Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { useWorldStore } from "~/lib/store";
import { OBJECT_TYPES } from "~/lib/constants";
import { Tree } from "~/components/three/objects/Tree";
import { Decoration } from "~/components/three/objects/Decoration";
import { Structure } from "~/components/three/objects/Structure";
import { Deer } from "~/components/three/objects/Deer";
import { Wolf } from "~/components/three/objects/Wolf";
import { Grass } from "~/components/three/objects/Grass";

// Type definitions for the object types
type TreeType = 
  | "tree" | "tree-baobab" | "tree-beech" | "tree-birch" | "tree-conifer"
  | "tree-elipse" | "tree-fir" | "tree-forest" | "tree-lime" | "tree-maple" 
  | "tree-oak" | "tree-round" | "tree-spruce" | "tree-tall";

type StructureType = "house" | "tower" | "bridge";

interface GridPlacementMenuProps {
  isOpen: boolean;
  onClose: () => void;
  position: { x: number; y: number };
}

// Helper function to format display names
function formatDisplayName(objectType: string): string {
  return objectType
    .replace(/^(tree-|grass\/|animals\/|decorations\/)/g, '')
    .replace(/-/g, ' ')
    .replace(/\b\w/g, l => l.toUpperCase());
}


// Shared 3D preview component that shows one object at a time
function SharedObjectPreview({ objectType, category }: { objectType: string | null; category: string }) {
  if (!objectType) {
      return (
    <div className="w-full h-32 sm:h-48 rounded-lg bg-black/20 flex items-center justify-center">
      <span className="text-white/40 text-sm">Hover over an object to preview</span>
    </div>
  );
  }

  const renderObject = () => {
    const baseProps = {
      type: objectType,
      position: [0, 0, 0] as [number, number, number],
      rotation: [0, 0, 0] as [number, number, number],
      scale: [1, 1, 1] as [number, number, number],
      selected: false,
      objectId: `preview-${objectType}`,
      preview: true,
      canPlace: true,
    };

    switch (category) {
      case "trees":
        return <Tree {...baseProps} type={objectType as TreeType} />;
      case "decorations":
        return <Decoration {...baseProps} type={objectType} />;
      case "structures":
        return <Structure {...baseProps} type={objectType as StructureType} />;
      case "animals":
        if (objectType === "animals/deer") {
          return <Deer {...baseProps} type={objectType} />;
        } else if (objectType === "animals/wolf") {
          return <Wolf {...baseProps} type={objectType} />;
        } else {
          return <Deer {...baseProps} type={objectType} />;
        }
      case "grass":
        return <Grass {...baseProps} type={objectType} />;
      default:
        return null;
    }
  };

  return (
    <div className="w-full h-32 sm:h-48 rounded-lg overflow-hidden bg-black/20">
      <Canvas 
        gl={{ alpha: true, antialias: true }}
        camera={{ position: [2, 2, 2], fov: 50 }}
        className="w-full h-full"
      >
        <ambientLight intensity={0.6} />
        <directionalLight position={[2, 2, 2]} intensity={0.8} />
        <Suspense fallback={null}>
          {renderObject()}
        </Suspense>
        <OrbitControls 
          enableZoom={false}
          enablePan={false}
          autoRotate
          autoRotateSpeed={2}
        />
      </Canvas>
    </div>
  );
}

// Simple object item component that triggers preview on hover
function ObjectItem({ objectType, category, onHover, onClick }: { 
  objectType: string; 
  category: string; 
  onHover: (objectType: string) => void;
  onClick: (objectType: string) => void;
}) {
  const getCategoryIcon = () => {
    switch (category) {
      case "trees": return "🌲";
      case "decorations": return "🌸";
      case "structures": return "🏠";
      case "animals": return "🦌";
      case "grass": return "🌿";
      default: return "📦";
    }
  };

  return (
    <button
      onClick={() => onClick(objectType)}
      onMouseEnter={() => onHover(objectType)}
      className="group relative bg-white/5 rounded-lg p-2 sm:p-4 border border-white/10 hover:border-blue-400/50 hover:bg-white/10 transition-all duration-200 min-h-[60px] sm:min-h-[80px] flex flex-col items-center justify-center"
    >
      {/* Category icon */}
      <div className="text-lg sm:text-2xl mb-1 sm:mb-2">
        {getCategoryIcon()}
      </div>
      
      {/* Object name */}
      <div className="text-xs font-medium text-white/80 group-hover:text-white text-center leading-tight">
        {formatDisplayName(objectType)}
      </div>
    </button>
  );
}

export function GridPlacementMenu({ isOpen, onClose, position }: GridPlacementMenuProps) {
  const { setPlacing, setSelectedObjectType } = useWorldStore();
  const [selectedCategory, setSelectedCategory] = useState<string>("trees");
  const [previewObjectType, setPreviewObjectType] = useState<string | null>(null);

  if (!isOpen) return null;

  // Calculate responsive dimensions
  const menuWidth = Math.min(480, window.innerWidth - 40);
  const menuHeight = Math.min(650, window.innerHeight - 40);
  const gridCols = menuWidth < 400 ? 3 : 4;

  const categories = [
    { name: "trees", icon: "🌲", items: OBJECT_TYPES.trees },
    { name: "structures", icon: "🏠", items: OBJECT_TYPES.structures },
    { name: "decorations", icon: "🌸", items: OBJECT_TYPES.decorations },
    { name: "grass", icon: "🌿", items: OBJECT_TYPES.grass },
    { name: "animals", icon: "🦌", items: OBJECT_TYPES.animals },
  ];

  const currentCategory = categories.find(c => c.name === selectedCategory);

  const handleObjectSelect = (objectType: string) => {
    setSelectedObjectType(objectType);
    setPlacing(true);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm" onClick={onClose}>
      {/* Main grid menu */}
      <div
        className="absolute bg-black/90 border border-white/20 rounded-lg backdrop-blur-sm p-4 sm:p-6 shadow-2xl flex flex-col"
        style={{
          left: Math.max(20, Math.min(position.x - menuWidth / 2, window.innerWidth - menuWidth - 20)),
          top: Math.max(20, Math.min(position.y + 10, window.innerHeight - menuHeight - 20)),
          width: menuWidth,
          height: menuHeight,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4 flex-shrink-0">
          <h2 className="text-base sm:text-lg font-semibold text-white">Choose Object</h2>
          <button
            onClick={onClose}
            className="text-white/60 hover:text-white p-1 rounded"
          >
            ✕
          </button>
        </div>

        {/* Category tabs */}
        <div className="flex gap-1 mb-4 bg-white/5 rounded-lg p-1 flex-shrink-0">
          {categories.map((category) => (
            <button
              key={category.name}
              onClick={() => {
                setSelectedCategory(category.name);
                setPreviewObjectType(null);
              }}
              className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-md text-sm font-medium transition-all ${
                selectedCategory === category.name
                  ? "bg-blue-500 text-white"
                  : "text-white/70 hover:text-white hover:bg-white/10"
              }`}
            >
              <span className="text-sm sm:text-base">{category.icon}</span>
              <span className="hidden sm:inline capitalize">{category.name}</span>
            </button>
          ))}
        </div>

        {/* Shared 3D Preview */}
        <div className="mb-4 flex-shrink-0">
          <SharedObjectPreview 
            objectType={previewObjectType} 
            category={selectedCategory} 
          />
        </div>

        {/* Objects grid */}
        <div className="flex-1 overflow-hidden">
          <div 
            className="h-full overflow-y-auto pr-2 -mr-2 custom-scrollbar" 
            style={{
              scrollbarWidth: 'thin',
              scrollbarColor: 'rgba(255, 255, 255, 0.3) rgba(255, 255, 255, 0.1)',
            }}
          >
            <div className={`grid gap-2 pb-2 ${gridCols === 3 ? 'grid-cols-3' : 'grid-cols-4'}`}>
              {currentCategory?.items.map((objectType) => (
                <ObjectItem
                  key={objectType}
                  objectType={objectType}
                  category={selectedCategory}
                  onHover={setPreviewObjectType}
                  onClick={handleObjectSelect}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Instructions */}
        <div className="pt-4 border-t border-white/10 flex-shrink-0">
          <p className="text-xs text-white/60 text-center">
            Click an object to place it in your world
          </p>
        </div>
      </div>
    </div>
  );
}