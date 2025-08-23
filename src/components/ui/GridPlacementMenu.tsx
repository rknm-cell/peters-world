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


// Preview component that renders a 3D object in a small canvas
function ObjectPreview({ objectType, category }: { objectType: string; category: string }) {
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
    <div className="w-full h-24 rounded-lg overflow-hidden bg-black/20">
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

export function GridPlacementMenu({ isOpen, onClose, position }: GridPlacementMenuProps) {
  const { setPlacing, setSelectedObjectType } = useWorldStore();
  const [selectedCategory, setSelectedCategory] = useState<string>("trees");

  if (!isOpen) return null;

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
        className="absolute bg-black/90 border border-white/20 rounded-lg backdrop-blur-sm p-6 shadow-2xl"
        style={{
          left: Math.min(position.x - 200, window.innerWidth - 500),
          top: Math.min(position.y + 10, window.innerHeight - 400),
          width: 480,
          maxHeight: 600,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white">Choose Object</h2>
          <button
            onClick={onClose}
            className="text-white/60 hover:text-white p-1 rounded"
          >
            ✕
          </button>
        </div>

        {/* Category tabs */}
        <div className="flex gap-1 mb-4 bg-white/5 rounded-lg p-1">
          {categories.map((category) => (
            <button
              key={category.name}
              onClick={() => setSelectedCategory(category.name)}
              className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-md text-sm font-medium transition-all ${
                selectedCategory === category.name
                  ? "bg-blue-500 text-white"
                  : "text-white/70 hover:text-white hover:bg-white/10"
              }`}
            >
              <span className="text-base">{category.icon}</span>
              <span className="hidden sm:inline capitalize">{category.name}</span>
            </button>
          ))}
        </div>

        {/* Objects grid */}
        <div className="max-h-80 overflow-y-auto">
          <div className="grid grid-cols-3 gap-3">
            {currentCategory?.items.map((objectType) => (
              <button
                key={objectType}
                onClick={() => handleObjectSelect(objectType)}
                className="group relative bg-white/5 rounded-lg p-3 border border-white/10 hover:border-blue-400/50 hover:bg-white/10 transition-all duration-200"
              >
                {/* 3D Preview */}
                <ObjectPreview objectType={objectType} category={selectedCategory} />
                
                {/* Object name */}
                <div className="mt-2 text-xs font-medium text-white/80 group-hover:text-white text-center">
                  {formatDisplayName(objectType)}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Instructions */}
        <div className="mt-4 pt-4 border-t border-white/10">
          <p className="text-xs text-white/60 text-center">
            Click an object to place it in your world
          </p>
        </div>
      </div>
    </div>
  );
}