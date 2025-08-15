'use client';

import { useWorldStore } from '~/lib/store';
import { Tree } from '~/components/three/objects/Tree';
import { Structure } from '~/components/three/objects/Structure';
import { Decoration } from '~/components/three/objects/Decoration';
import { OBJECT_TYPES } from '~/lib/constants';

export function WorldObjects() {
  const { objects, selectedObject } = useWorldStore();

  const renderObject = (obj: any) => {
    const isSelected = selectedObject === obj.id;
    const props = {
      position: obj.position as [number, number, number],
      rotation: obj.rotation as [number, number, number],
      scale: obj.scale as [number, number, number],
      selected: isSelected,
      objectId: obj.id,
    };

    // Determine object category and render appropriate component
    if (OBJECT_TYPES.trees.includes(obj.type)) {
      return (
        <Tree
          key={obj.id}
          type={obj.type as 'pine' | 'oak' | 'birch'}
          {...props}
        />
      );
    }
    
    if (OBJECT_TYPES.structures.includes(obj.type)) {
      return (
        <Structure
          key={obj.id}
          type={obj.type as 'house' | 'tower' | 'bridge'}
          {...props}
        />
      );
    }
    
    if (OBJECT_TYPES.decorations.includes(obj.type)) {
      return (
        <Decoration
          key={obj.id}
          type={obj.type as 'rock' | 'flower'}
          {...props}
        />
      );
    }

    // Default fallback
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