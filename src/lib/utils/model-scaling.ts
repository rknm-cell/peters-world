import * as THREE from 'three';
import { MODEL_SCALING } from '~/lib/constants';
import type { TreeLifecycleStage } from '~/lib/store';

/**
 * Centralized model scaling utility
 * Ensures consistent scale across all game objects
 */

export interface ScalingOptions {
  objectType: 'tree' | 'animal' | 'grass' | 'decoration' | 'structure';
  modelType: string;
  lifecycleStage?: TreeLifecycleStage;
  preview?: boolean;
}

/**
 * Get the target height for a specific model
 */
export function getTargetHeight(options: ScalingOptions): number {
  const { objectType, modelType, lifecycleStage } = options;
  
  let targetHeight: number;
  
  switch (objectType) {
    case 'tree':
      if (lifecycleStage) {
        targetHeight = MODEL_SCALING.targetHeights.trees[lifecycleStage] ?? MODEL_SCALING.targetHeights.trees.adult;
      } else {
        targetHeight = MODEL_SCALING.targetHeights.trees.adult;
      }
      break;
      
    case 'animal':
      const animalKey = modelType.replace('animals/', '') as keyof typeof MODEL_SCALING.targetHeights.animals;
      targetHeight = MODEL_SCALING.targetHeights.animals[animalKey] ?? 0.5;
      break;
      
    case 'grass':
      let grassKey: keyof typeof MODEL_SCALING.targetHeights.grass = 'default';
      if (modelType.includes('tall')) grassKey = 'tall';
      else if (modelType.includes('long')) grassKey = 'long';
      else if (modelType.includes('clumb')) grassKey = 'clumb';
      else if (modelType.includes('basic')) grassKey = 'basic';
      
      targetHeight = MODEL_SCALING.targetHeights.grass[grassKey];
      break;
      
    case 'decoration':
      const decorationKey = modelType as keyof typeof MODEL_SCALING.targetHeights.decorations;
      targetHeight = MODEL_SCALING.targetHeights.decorations[decorationKey] ?? MODEL_SCALING.targetHeights.decorations.rock;
      break;
      
    case 'structure':
      const structureKey = modelType as keyof typeof MODEL_SCALING.targetHeights.structures;
      targetHeight = MODEL_SCALING.targetHeights.structures[structureKey] ?? 1.0;
      break;
      
    default:
      targetHeight = 1.0;
  }
  
  return targetHeight * MODEL_SCALING.globalScaleFactor;
}

/**
 * Calculate scale factor for a GLTF scene to match target height
 */
export function calculateScaleFactor(scene: THREE.Object3D, targetHeight: number): number {
  // Calculate bounding box
  const box = new THREE.Box3().setFromObject(scene);
  const size = new THREE.Vector3();
  box.getSize(size);
  
  // Get current height
  const currentHeight = Math.max(size.y, 0.001); // Prevent division by zero
  
  // Calculate scale factor
  let scaleFactor = targetHeight / currentHeight;
  
  // Apply safety bounds
  scaleFactor = Math.max(
    MODEL_SCALING.minScaleFactor, 
    Math.min(scaleFactor, MODEL_SCALING.maxScaleFactor)
  );
  
  return scaleFactor;
}

/**
 * Apply standardized scaling to a GLTF scene
 */
export function applyStandardizedScaling(scene: THREE.Object3D, options: ScalingOptions): number {
  // Reset transformations first
  scene.position.set(0, 0, 0);
  scene.rotation.set(0, 0, 0);
  scene.scale.set(1, 1, 1);
  
  // Get target height and calculate scale factor
  const targetHeight = getTargetHeight(options);
  const scaleFactor = calculateScaleFactor(scene, targetHeight);
  
  // Apply scale
  scene.scale.setScalar(scaleFactor);
  
  console.log(`Model scaling applied:`, {
    objectType: options.objectType,
    modelType: options.modelType,
    lifecycleStage: options.lifecycleStage,
    targetHeight,
    scaleFactor,
    finalSize: {
      x: scene.scale.x,
      y: scene.scale.y, 
      z: scene.scale.z
    }
  });
  
  return scaleFactor;
}

/**
 * Special scaling for broken trees and logs that might have extreme dimensions
 */
export function applySpecialScaling(scene: THREE.Object3D, modelType: string, lifecycleStage?: TreeLifecycleStage): number {
  // Handle broken trees with extreme scaling issues
  if (modelType.includes('tree-dead-broken')) {
    const forcedScale = 0.05; // Very small scale for broken trees
    scene.scale.setScalar(forcedScale);
    console.log(`BROKEN TREE - Forced tiny scale:`, { modelType, forcedScale });
    return forcedScale;
  }
  
  // Handle logs with special scaling
  if (lifecycleStage === 'logs' || modelType.includes('log')) {
    const logScale = 0.2; // Small scale for logs
    scene.scale.setScalar(logScale);
    console.log(`LOG - Forced small scale:`, { modelType, lifecycleStage, logScale });
    return logScale;
  }
  
  // Use standard scaling for other models
  return applyStandardizedScaling(scene, {
    objectType: 'tree',
    modelType,
    lifecycleStage
  });
}