import { useRef, useCallback, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';

/**
 * Render Queue System - Prevents multiple simultaneous re-renders
 * Batches updates and processes them at optimal frame intervals
 */

export interface QueuedUpdate<T = void> {
  id: string;
  updateFn: () => T;
  priority: 'low' | 'normal' | 'high';
  timestamp: number;
}

export interface RenderQueueConfig {
  /** Maximum updates to process per frame */
  maxUpdatesPerFrame: number;
  /** Minimum time between update batches (ms) */
  batchInterval: number;
  /** Maximum time an update can stay in queue (ms) */
  maxQueueTime: number;
}

const DEFAULT_CONFIG: RenderQueueConfig = {
  maxUpdatesPerFrame: 3,
  batchInterval: 16.67, // ~60 FPS
  maxQueueTime: 100, // 100ms max queue time
};

// Priority order for processing updates (constant)
const PRIORITY_ORDER: Array<'high' | 'normal' | 'low'> = ['high', 'normal', 'low'];

/**
 * Custom hook for managing a render queue
 * Prevents multiple simultaneous updates and batches them efficiently
 */
export function useRenderQueue(config: Partial<RenderQueueConfig> = {}) {
  const finalConfig = useMemo(() => ({ ...DEFAULT_CONFIG, ...config }), [config]);
  
  const queueRef = useRef<Map<string, QueuedUpdate>>(new Map());
  const lastBatchTimeRef = useRef(0);
  const processingRef = useRef(false);
  
  /**
   * Add an update to the queue
   */
  const queueUpdate = useCallback(<T>(
    id: string,
    updateFn: () => T,
    priority: 'low' | 'normal' | 'high' = 'normal'
  ) => {
    const now = performance.now();
    
    // Replace existing update with same ID (prevents duplicate updates)
    queueRef.current.set(id, {
      id,
      updateFn,
      priority,
      timestamp: now,
    });
  }, []);
  
  /**
   * Remove an update from the queue
   */
  const cancelUpdate = useCallback((id: string) => {
    queueRef.current.delete(id);
  }, []);
  
  /**
   * Get queue statistics
   */
  const getQueueStats = useCallback(() => {
    const queue = queueRef.current;
    const now = performance.now();
    
    return {
      totalItems: queue.size,
      highPriority: Array.from(queue.values()).filter(u => u.priority === 'high').length,
      normalPriority: Array.from(queue.values()).filter(u => u.priority === 'normal').length,
      lowPriority: Array.from(queue.values()).filter(u => u.priority === 'low').length,
      oldestItem: queue.size > 0 ? Math.min(...Array.from(queue.values()).map(u => now - u.timestamp)) : 0,
    };
  }, []);
  
  /**
   * Process queued updates - called every frame
   */
  const processQueue = useCallback((currentTime: number) => {
    const queue = queueRef.current;
    
    // Skip if no updates or too soon since last batch
    if (queue.size === 0 || processingRef.current) {
      return;
    }
    
    const timeSinceLastBatch = currentTime - lastBatchTimeRef.current;
    if (timeSinceLastBatch < finalConfig.batchInterval) {
      return;
    }
    
    processingRef.current = true;
    lastBatchTimeRef.current = currentTime;
    
    try {
      // Sort updates by priority and age
      const sortedUpdates = Array.from(queue.values()).sort((a, b) => {
        // First by priority
        const aPriorityIndex = PRIORITY_ORDER.indexOf(a.priority);
        const bPriorityIndex = PRIORITY_ORDER.indexOf(b.priority);
        if (aPriorityIndex !== bPriorityIndex) {
          return aPriorityIndex - bPriorityIndex;
        }
        
        // Then by age (older first)
        return a.timestamp - b.timestamp;
      });
      
      // Process up to maxUpdatesPerFrame updates
      let processedCount = 0;
      const maxUpdates = finalConfig.maxUpdatesPerFrame;
      
      for (const update of sortedUpdates) {
        if (processedCount >= maxUpdates) {
          break;
        }
        
        try {
          // Execute the update
          update.updateFn();
          
          // Remove from queue after successful execution
          queue.delete(update.id);
          processedCount++;
        } catch (error) {
          console.warn(`Render queue: Failed to process update ${update.id}:`, error);
          // Remove failed update to prevent infinite retries
          queue.delete(update.id);
        }
      }
      
      // Clean up old updates that have been in queue too long
      const now = performance.now();
      for (const [id, update] of queue.entries()) {
        if (now - update.timestamp > finalConfig.maxQueueTime) {
          console.warn(`Render queue: Removing stale update ${id} (${now - update.timestamp}ms old)`);
          queue.delete(id);
        }
      }
      
    } finally {
      processingRef.current = false;
    }
  }, [finalConfig]);
  
  // Process queue every frame
  useFrame((state) => {
    processQueue(state.clock.elapsedTime * 1000); // Convert to milliseconds
  });
  
  return {
    queueUpdate,
    cancelUpdate,
    getQueueStats,
    isProcessing: () => processingRef.current,
  };
}

/**
 * Specialized hook for deer updates
 * Provides deer-specific update batching and throttling
 */
export function useDeerRenderQueue(isUserInteracting?: boolean) {
  // Adjust performance based on user interaction state
  const config = isUserInteracting ? {
    maxUpdatesPerFrame: 1, // Reduce updates during interactions to prevent jitter
    batchInterval: 50, // Slower updates during interaction (20 FPS)
    maxQueueTime: 500, // Allow longer queue time during interactions
  } : {
    maxUpdatesPerFrame: 2, // Normal updates when idle
    batchInterval: 33.33, // ~30 FPS for deer updates
    maxQueueTime: 200, // Normal queue time
  };
  
  const renderQueue = useRenderQueue(config);
  
  /**
   * Queue a deer position update
   */
  const queueDeerPositionUpdate = useCallback((
    deerId: string,
    updateFn: () => void,
    priority: 'low' | 'normal' | 'high' = 'normal'
  ) => {
    renderQueue.queueUpdate(`deer-position-${deerId}`, updateFn, priority);
  }, [renderQueue]);
  
  /**
   * Queue a deer rotation update
   */
  const queueDeerRotationUpdate = useCallback((
    deerId: string,
    updateFn: () => void,
    priority: 'low' | 'normal' | 'high' = 'normal'
  ) => {
    renderQueue.queueUpdate(`deer-rotation-${deerId}`, updateFn, priority);
  }, [renderQueue]);
  
  /**
   * Queue a combined deer transform update (position + rotation)
   */
  const queueDeerTransformUpdate = useCallback((
    deerId: string,
    updateFn: () => void,
    priority: 'low' | 'normal' | 'high' = 'normal'
  ) => {
    renderQueue.queueUpdate(`deer-transform-${deerId}`, updateFn, priority);
  }, [renderQueue]);
  
  /**
   * Cancel all updates for a specific deer
   */
  const cancelDeerUpdates = useCallback((deerId: string) => {
    renderQueue.cancelUpdate(`deer-position-${deerId}`);
    renderQueue.cancelUpdate(`deer-rotation-${deerId}`);
    renderQueue.cancelUpdate(`deer-transform-${deerId}`);
  }, [renderQueue]);
  
  return {
    queueDeerPositionUpdate,
    queueDeerRotationUpdate,
    queueDeerTransformUpdate,
    cancelDeerUpdates,
    getQueueStats: renderQueue.getQueueStats,
    isProcessing: renderQueue.isProcessing,
  };
}
