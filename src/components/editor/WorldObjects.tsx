"use client";

import { useWorldStore } from "~/lib/store";
import { Tree } from "~/components/three/objects/Tree";
import { Structure } from "~/components/three/objects/Structure";
import { Decoration } from "~/components/three/objects/Decoration";
import { Grass } from "~/components/three/objects/Grass";
import { DeerPhysics } from "~/components/three/physics/DeerPhysics";
import { WolfPhysics } from "~/components/three/physics/WolfPhysics";
import { OBJECT_TYPES, TREE_LIFECYCLE, GRASS_MODELS, ANIMAL_MODELS, type DECORATION_MODELS } from "~/lib/constants";
import type { PlacedObject } from "~/lib/store";

// Define proper types for object categories - now includes all lifecycle stages
type TreeType = 
  // Youth stages (bush models)
  | "bush-small" | "bush-medium" | "bush-medium-high" | "bush-big"
  // Adult trees
  | "tree" | "tree-baobab" | "tree-beech" | "tree-birch"
  | "tree-elipse" | "tree-lime" | "tree-maple" 
  | "tree-oak" | "tree-round" | "tree-tall"
  // Death stages
  | "dead-tree-1" | "dead-tree-2" | "dead-tree-3" | "dead-tree-4"
  | "broke-tree" | "log-a" | "log-b" | "log-small-a" | "log-small-b";
type StructureType = "house" | "tower";
type DecorationType = typeof DECORATION_MODELS[number] | "rock" | "flower"; // Include legacy types
type GrassType = typeof GRASS_MODELS[number];
type AnimalType = typeof ANIMAL_MODELS[number];

// Type guard functions to check object types
function isTreeType(type: string): type is TreeType {
  // Check if it's a traditional tree, or any lifecycle stage model
  return (
    (OBJECT_TYPES.trees as readonly string[]).includes(type) ||
    type === TREE_LIFECYCLE.youth.small ||
    type === TREE_LIFECYCLE.youth.medium ||
    type === TREE_LIFECYCLE.youth.mediumHigh ||
    type === TREE_LIFECYCLE.youth.big ||
    (TREE_LIFECYCLE.adult as readonly string[]).includes(type) ||
    (TREE_LIFECYCLE.death.standing as readonly string[]).includes(type) ||
    type === TREE_LIFECYCLE.death.broken ||
    (TREE_LIFECYCLE.death.logs as readonly string[]).includes(type) ||
    (TREE_LIFECYCLE.death.smallLogs as readonly string[]).includes(type)
  );
}

function isStructureType(type: string): type is StructureType {
  return OBJECT_TYPES.structures.includes(type as StructureType);
}

function isDecorationType(type: string): type is DecorationType {
  return (OBJECT_TYPES.decorations as readonly string[]).includes(type) || type === "rock" || type === "flower";
}

function isGrassType(type: string): type is GrassType {
  return (GRASS_MODELS as readonly string[]).includes(type);
}

function isAnimalType(type: string): type is AnimalType {
  return (ANIMAL_MODELS as readonly string[]).includes(type);
}

export function WorldObjects() {
  const { objects, selectedObject } = useWorldStore();

  const renderObject = (obj: PlacedObject) => {
    const isSelected = selectedObject === obj.id;
    const props = {
      position: obj.position,
      rotation: obj.rotation,
      scale: obj.scale,
      selected: isSelected,
      objectId: obj.id,
    };

    // Determine object category and render appropriate component
    if (isTreeType(obj.type)) {
      return (
        <Tree 
          key={obj.id} 
          type={obj.type} 
          lifecycleStage={obj.treeLifecycle?.stage}
          {...props} 
        />
      );
    }

    if (isStructureType(obj.type)) {
      return <Structure key={obj.id} type={obj.type} {...props} />;
    }

    if (isDecorationType(obj.type)) {
      return <Decoration key={obj.id} type={obj.type} {...props} />;
    }

    if (isGrassType(obj.type)) {
      return <Grass key={obj.id} type={obj.type} {...props} />;
    }

    if (isAnimalType(obj.type)) {
      // Use different physics components based on animal type
      if (obj.type === "animals/deer") {
        // Use physics-based deer for realistic movement and surface adhesion
        return (
          <DeerPhysics 
            key={obj.id}
            objectId={obj.id}
            type={obj.type}
            position={obj.position}
            selected={isSelected}
          />
        );
      } else if (obj.type === "animals/wolf") {
        // Use physics-based wolf with deer-chasing behavior
        return (
          <WolfPhysics 
            key={obj.id}
            objectId={obj.id}
            type={obj.type}
            position={obj.position}
            selected={isSelected}
          />
        );
      }
      
      // For other animals, fall back to deer physics for now
      return (
        <DeerPhysics 
          key={obj.id}
          objectId={obj.id}
          type={obj.type}
          position={obj.position}
          selected={isSelected}
        />
      );
    }

    // Default fallback for unknown types
    return <Tree key={obj.id} type="tree" {...props} />;
  };

  return <>{objects.map(renderObject)}</>;
}
