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
  | "tree"
  | "tree-baobab"
  | "tree-beech"
  | "tree-birch"
  | "tree-elipse"
  | "tree-lime"
  | "tree-maple"
  | "tree-oak"
  | "tree-round"
  | "tree-tall";

type StructureType =
  | "house"
  | "tower"
  | "building-cabin-small"
  | "building-cabin-big";

interface GridPlacementMenuProps {
  isOpen: boolean;
  onClose: () => void;
  position: { x: number; y: number };
}

// Helper function to format display names
function formatDisplayName(objectType: string): string {
  return objectType
    .replace(/^(tree-|grass\/|animals\/|decorations\/)/g, "")
    .replace(/-/g, " ")
    .replace(/\b\w/g, (l) => l.toUpperCase());
}

// Shared 3D preview component that shows one object at a time
function SharedObjectPreview({
  objectType,
  category,
}: {
  objectType: string | null;
  category: string;
}) {
  if (!objectType) {
    return (
      <div className="flex h-32 w-full items-center justify-center rounded-lg bg-black/20 sm:h-48">
        <span className="text-sm text-white/40">
          Click an object to preview
        </span>
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
    <div className="h-32 w-full overflow-hidden rounded-lg bg-black/20 sm:h-48">
      <Canvas
        gl={{ alpha: true, antialias: true }}
        camera={{ position: [2, 2, 2], fov: 50 }}
        className="h-full w-full"
      >
        <ambientLight intensity={0.6} />
        <directionalLight position={[2, 2, 2]} intensity={0.8} />
        <Suspense fallback={null}>{renderObject()}</Suspense>
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

// Simple object item component that shows preview on click
function ObjectItem({
  objectType,
  category,
  onClick,
  isSelected,
}: {
  objectType: string;
  category: string;
  onClick: (objectType: string) => void;
  isSelected: boolean;
}) {
  const getCategoryIcon = () => {
    switch (category) {
      case "trees":
        return "🌲";
      case "decorations": {
        // Use specific emojis for different decoration types
        if (objectType === "carnations") return "🌺";
        if (objectType === "flower-red") return "🌹";
        if (objectType === "roses") return "🥀";
        if (objectType === "mushroom-boletus") return "🍄";
        if (objectType === "mushroom-toadstool") return "🍄";
        if (objectType === "mushroom-toadstool-green") return "🍄";
        if (objectType === "stone-diamond-brown") return "💎";
        if (objectType === "stone-flat-brown") return "🪨";
        if (objectType === "stone-oval-brown") return "🪨";
        if (objectType === "stone-pointy-brown") return "⛰️";
        if (objectType === "stone-round-brown") return "⚫";
        if (objectType === "stone-small-brown") return "🪨";
        return "🌸"; // fallback
      }
      case "structures": {
        // Use specific emojis for different building types
        if (objectType === "house") return "🏠";
        if (objectType === "tower") return "🗼";
        if (objectType === "building-cabin-small") return "🏡";
        if (objectType === "building-cabin-big") return "🏘️";
        return "🏠"; // fallback
      }
      case "animals": {
        // Use specific emojis for different animals
        if (objectType === "animals/deer") return "🦌";
        if (objectType === "animals/wolf") return "🐺";
        if (objectType === "animals/crab") return "🦀";
        if (objectType === "animals/sheep-white") return "🐑";
        if (objectType === "animals/bear_brown") return "🐻";
        if (objectType === "animals/cow") return "🐄";
        if (objectType === "animals/hen") return "🐔";
        if (objectType === "animals/horse") return "🐎";
        if (objectType === "animals/penguin") return "🐧";
        if (objectType === "animals/pig") return "🐷";
        return "🦌"; // fallback
      }
      case "grass":
        return "🌿";
      default:
        return "📦";
    }
  };

  return (
    <button
      onClick={() => onClick(objectType)}
      className={`group relative flex min-h-[60px] flex-col items-center justify-center rounded-lg border p-2 transition-all duration-200 sm:min-h-[80px] sm:p-4 ${
        isSelected
          ? "border-blue-400 bg-blue-500/30 text-white"
          : "border-white/10 bg-white/5 hover:border-blue-400/50 hover:bg-white/10"
      }`}
    >
      {/* Category icon */}
      <div className="mb-1 text-lg sm:mb-2 sm:text-2xl">
        {getCategoryIcon()}
      </div>

      {/* Object name */}
      <div className="text-center text-xs font-medium leading-tight text-white/80 group-hover:text-white">
        {formatDisplayName(objectType)}
      </div>
    </button>
  );
}

export function GridPlacementMenu({
  isOpen,
  onClose,
  position,
}: GridPlacementMenuProps) {
  const { setPlacing, setSelectedObjectType } = useWorldStore();
  const [selectedCategory, setSelectedCategory] = useState<string>("trees");
  const [selectedItem, setSelectedItem] = useState<string | null>(null);

  if (!isOpen) return null;

  // Calculate responsive dimensions
  const menuWidth = Math.min(480, window.innerWidth - 40);
  const menuHeight = Math.min(650, window.innerHeight - 80); // More padding from edges
  const gridCols = menuWidth < 400 ? 3 : 4;

  const categories = [
    { name: "trees", icon: "🌲", items: OBJECT_TYPES.trees },
    { name: "structures", icon: "🏠", items: OBJECT_TYPES.structures },
    { name: "decorations", icon: "🌸", items: OBJECT_TYPES.decorations },
    { name: "grass", icon: "🌿", items: OBJECT_TYPES.grass },
    { name: "animals", icon: "🐾", items: OBJECT_TYPES.animals },
  ];

  const currentCategory = categories.find((c) => c.name === selectedCategory);

  const handleObjectClick = (objectType: string) => {
    setSelectedItem(objectType);
  };

  const handlePlaceObject = () => {
    if (selectedItem) {
      setSelectedObjectType(selectedItem);
      setPlacing(true);
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      {/* Main grid menu */}
      <div
        className="absolute flex flex-col rounded-lg border border-white/20 bg-black/90 p-4 shadow-2xl backdrop-blur-sm sm:p-6"
        style={{
          left: Math.max(
            20,
            Math.min(
              position.x - menuWidth / 2,
              window.innerWidth - menuWidth - 20,
            ),
          ),
          top: Math.max(
            40,
            Math.min(position.y + 10, window.innerHeight - menuHeight - 40),
          ),
          width: menuWidth,
          height: menuHeight,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="mb-4 flex flex-shrink-0 items-center justify-between">
          <h2 className="text-base font-semibold text-white sm:text-lg">
            Choose Object
          </h2>
          <button
            onClick={onClose}
            className="rounded p-1 text-white/60 hover:text-white"
          >
            ✕
          </button>
        </div>

        {/* Category tabs */}
        <div className="mb-4 flex-shrink-0 overflow-hidden rounded-lg bg-white/5 p-1">
          <div className="custom-scrollbar flex gap-1 overflow-x-auto">
            {categories.map((category) => (
              <button
                key={category.name}
                onClick={() => {
                  setSelectedCategory(category.name);
                  setSelectedItem(null);
                }}
                className={`flex min-w-0 flex-shrink-0 items-center justify-center gap-1 whitespace-nowrap rounded-md px-2 py-2 text-xs font-medium transition-all sm:gap-2 sm:px-3 sm:text-sm ${
                  selectedCategory === category.name
                    ? "bg-blue-500 text-white"
                    : "text-white/70 hover:bg-white/10 hover:text-white"
                }`}
              >
                <span className="text-base sm:text-lg">{category.icon}</span>
                <span className="hidden text-xs capitalize sm:inline sm:text-sm">
                  {category.name}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Shared 3D Preview */}
        <div className="mb-4 flex-shrink-0">
          <div className="relative">
            <SharedObjectPreview
              objectType={selectedItem}
              category={selectedCategory}
            />
            {selectedItem && (
              <button
                onClick={handlePlaceObject}
                className="absolute bottom-2 left-1/2 -translate-x-1/2 transform rounded-lg bg-blue-500 px-6 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-600"
              >
                Place Object
              </button>
            )}
          </div>
        </div>

        {/* Objects grid */}
        <div className="min-h-0 flex-1 overflow-hidden">
          <div
            className="custom-scrollbar -mr-2 h-full overflow-y-auto pr-2"
            style={{
              scrollbarWidth: "thin",
              scrollbarColor:
                "rgba(255, 255, 255, 0.3) rgba(255, 255, 255, 0.1)",
              maxHeight: "100%",
            }}
          >
            <div
              className={`grid gap-2 pb-2 ${gridCols === 3 ? "grid-cols-3" : "grid-cols-4"}`}
            >
              {currentCategory?.items.map((objectType) => (
                <ObjectItem
                  key={objectType}
                  objectType={objectType}
                  category={selectedCategory}
                  onClick={handleObjectClick}
                  isSelected={selectedItem === objectType}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Instructions */}
        <div className="flex-shrink-0 border-t border-white/10 pt-4">
          <p className="text-center text-xs text-white/60">
            {selectedItem
              ? "Click 'Place Object' to start placing in your world"
              : "Click an object to preview, then click 'Place Object' to add it"}
          </p>
        </div>
      </div>
    </div>
  );
}
