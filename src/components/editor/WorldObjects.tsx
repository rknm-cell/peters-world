'use client';

import { useWorldStore } from '~/lib/store';
import { Tree } from '~/components/three/objects/Tree';
import { Structure } from '~/components/three/objects/Structure';
import { Decoration } from '~/components/three/objects/Decoration';
import { OBJECT_TYPES } from '~/lib/constants';
import type { PlacedObject } from '~/lib/store';

// Define proper types for object categories
type TreeType = 'pine' | 'oak' | 'birch';
type StructureType = 'house' | 'tower' | 'bridge';
type DecorationType = 'rock' | 'flower';

// Type guard functions to check object types
function isTreeType(type: string): type is TreeType {
  return OBJECT_TYPES.trees.includes(type as TreeType);
}

function isStructureType(type: string): type is StructureType {
  return OBJECT_TYPES.structures.includes(type as StructureType);
}

function isDecorationType(type: string): type is DecorationType {
  return OBJECT_TYPES.decorations.includes(type as DecorationType);
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
          {...props}
        />
      );
    }
    
    if (isStructureType(obj.type)) {
      return (
        <Structure
          key={obj.id}
          type={obj.type}
          {...props}
        />
      );
    }
    
    if (isDecorationType(obj.type)) {
      return (
        <Decoration
          key={obj.id}
          type={obj.type}
          {...props}
        />
      );
    }

    // Default fallback for unknown types
    return (
      <Tree
        key={obj.id}
        type="pine"
        {...props}
      />
    );
  };

  return (
    <>
      {objects.map(renderObject)}
    </>
  );
}