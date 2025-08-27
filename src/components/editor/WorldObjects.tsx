"use client";

import React from "react";
import type { PlacedObject } from "~/lib/store";
import {
  useStableObjectsByCategory,
  useAnimalObjectsOnly,
  useTreeObjectsOnly,
  useGrassObjectsOnly,
} from "~/lib/store";
import { Tree } from "~/components/three/objects/Tree";
import { Structure } from "~/components/three/objects/Structure";
import { Decoration } from "~/components/three/objects/Decoration";
import { Grass } from "~/components/three/objects/Grass";
import { DeerPhysics } from "~/components/three/physics/DeerPhysics";
import { WolfPhysics } from "~/components/three/physics/WolfPhysics";
import {
  OBJECT_TYPES,
  TREE_LIFECYCLE,
  GRASS_MODELS,
  ANIMAL_MODELS,
  type DECORATION_MODELS,
} from "~/lib/constants";

// Define proper types for object categories - now includes all lifecycle stages
type TreeType =
  // Youth stages (bush models)
  | "bush-small"
  | "bush-medium"
  | "bush-medium-high"
  | "bush-big"
  // Adult trees
  | "tree"
  | "tree-baobab"
  | "tree-beech"
  | "tree-birch"
  | "tree-elipse"
  | "tree-lime"
  | "tree-maple"
  | "tree-oak"
  | "tree-round"
  | "tree-tall"
  // Death stages
  | "dead-tree-1"
  | "dead-tree-2"
  | "dead-tree-3"
  | "dead-tree-4"
  | "broke-tree"
  | "log-a"
  | "log-b"
  | "log-small-a"
  | "log-small-b";
type StructureType =
  | "house"
  | "tower"
  | "building-cabin-small"
  | "building-cabin-big";
type DecorationType = (typeof DECORATION_MODELS)[number] | "rock" | "flower"; // Include legacy types
type GrassType = (typeof GRASS_MODELS)[number];
type AnimalType = (typeof ANIMAL_MODELS)[number];

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
  return (
    (OBJECT_TYPES.decorations as readonly string[]).includes(type) ||
    type === "rock" ||
    type === "flower"
  );
}

function isGrassType(type: string): type is GrassType {
  return (GRASS_MODELS as readonly string[]).includes(type);
}

function isAnimalType(type: string): type is AnimalType {
  return (ANIMAL_MODELS as readonly string[]).includes(type);
}

// Individual render components for each category - highly optimized with React.memo
const AnimalRenderer = React.memo(function AnimalRenderer() {
  const animals = useAnimalObjectsOnly();

  // CRITICAL FIX: Create stable props to prevent array reference changes from causing rerenders
  const stableAnimalProps = React.useMemo(
    () =>
      animals.map((obj) => ({
        key: obj.id,
        objectId: obj.id,
        type: obj.type,
        // FIXED: Pass position as individual primitives to avoid array reference instability
        positionX: obj.position[0],
        positionY: obj.position[1],
        positionZ: obj.position[2],
      })),
    [animals],
  );

  return (
    <>
      {stableAnimalProps.map((props) => {
        // Reconstruct position array inside component to maintain API compatibility
        const position: [number, number, number] = [
          props.positionX,
          props.positionY,
          props.positionZ,
        ];

        if (props.type === "animals/deer") {
          return (
            <DeerPhysics
              key={props.key}
              objectId={props.objectId}
              type={props.type}
              position={position}
            />
          );
        } else if (props.type === "animals/wolf") {
          return (
            <WolfPhysics
              key={props.key}
              objectId={props.objectId}
              type={props.type}
              position={position}
            />
          );
        }

        // For other animals, fall back to deer physics
        return (
          <DeerPhysics
            key={props.key}
            objectId={props.objectId}
            type={props.type}
            position={position}
          />
        );
      })}
    </>
  );
});

const TreeRenderer = React.memo(function TreeRenderer() {
  const trees = useTreeObjectsOnly();

  // CRITICAL FIX: Create stable props to prevent Tree component rerenders
  // when lifecycle stages change for other trees
  const stableTreeProps = React.useMemo(
    () =>
      trees.map((obj) => ({
        key: obj.id,
        objectId: obj.id,
        type: obj.type as TreeType,
        lifecycleStage: obj.treeLifecycle?.stage,
        // Pass position as individual primitives to prevent array reference changes
        positionX: obj.position[0],
        positionY: obj.position[1],
        positionZ: obj.position[2],
        rotationX: obj.rotation[0],
        rotationY: obj.rotation[1],
        rotationZ: obj.rotation[2],
        scaleX: obj.scale[0],
        scaleY: obj.scale[1],
        scaleZ: obj.scale[2],
      })),
    [trees],
  );

  return (
    <>
      {stableTreeProps.map((props) => {
        // Reconstruct arrays inside component to maintain API compatibility
        const position: [number, number, number] = [
          props.positionX,
          props.positionY,
          props.positionZ,
        ];
        const rotation: [number, number, number] = [
          props.rotationX,
          props.rotationY,
          props.rotationZ,
        ];
        const scale: [number, number, number] = [
          props.scaleX,
          props.scaleY,
          props.scaleZ,
        ];

        return (
          <Tree
            key={props.key}
            type={props.type}
            lifecycleStage={props.lifecycleStage}
            position={position}
            rotation={rotation}
            scale={scale}
            objectId={props.objectId}
          />
        );
      })}
    </>
  );
});

const GrassRenderer = React.memo(function GrassRenderer() {
  const grass = useGrassObjectsOnly();

  return (
    <>
      {grass.map((obj) => (
        <Grass
          key={obj.id}
          type={obj.type}
          position={obj.position}
          rotation={obj.rotation}
          scale={obj.scale}
          objectId={obj.id}
        />
      ))}
    </>
  );
});

const OtherObjectsRenderer = React.memo(function OtherObjectsRenderer() {
  const { others } = useStableObjectsByCategory();

  return (
    <>
      {others.map((obj) => {
        const props = {
          position: obj.position,
          rotation: obj.rotation,
          scale: obj.scale,
          objectId: obj.id,
        };

        if (isStructureType(obj.type)) {
          return <Structure key={obj.id} type={obj.type} {...props} />;
        }

        if (isDecorationType(obj.type)) {
          return <Decoration key={obj.id} type={obj.type} {...props} />;
        }

        // Default fallback
        return <Tree key={obj.id} type="tree-oak" {...props} />;
      })}
    </>
  );
});

export const WorldObjects = React.memo(function WorldObjects() {
  // Each renderer is independently memoized and only updates its own category
  // This prevents animals from rerendering when trees, structures, or decorations are placed
  return (
    <>
      <AnimalRenderer />
      <TreeRenderer />
      <GrassRenderer />
      <OtherObjectsRenderer />
    </>
  );
});
