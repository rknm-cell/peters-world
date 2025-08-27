/**
 * Debounced Updates System
 * Prevents excessive store updates and batches them efficiently
 */

interface PendingUpdate {
  id: string;
  updateFn: () => void;
  timestamp: number;
}

class DebouncedUpdateManager {
  private pendingUpdates = new Map<string, PendingUpdate>();
  private isProcessing = false;
  private batchInterval = 16.67; // ~60 FPS
  private lastBatchTime = 0;

  /**
   * Queue an update with debouncing
   */
  queueUpdate(id: string, updateFn: () => void) {
    // Replace existing update with same ID (prevents duplicate updates)
    this.pendingUpdates.set(id, {
      id,
      updateFn,
      timestamp: performance.now(),
    });

    // Schedule processing if not already scheduled
    this.scheduleProcessing();
  }

  /**
   * Cancel a pending update
   */
  cancelUpdate(id: string) {
    this.pendingUpdates.delete(id);
  }

  /**
   * Schedule processing of pending updates
   */
  private scheduleProcessing() {
    if (this.isProcessing) {
      return;
    }

    const now = performance.now();
    const timeSinceLastBatch = now - this.lastBatchTime;

    if (timeSinceLastBatch >= this.batchInterval) {
      // Process immediately if enough time has passed
      this.processPendingUpdates();
    } else {
      // Schedule for later
      const delay = this.batchInterval - timeSinceLastBatch;
      setTimeout(() => this.processPendingUpdates(), delay);
    }
  }

  /**
   * Process all pending updates in a single batch
   */
  private processPendingUpdates() {
    if (this.isProcessing || this.pendingUpdates.size === 0) {
      return;
    }

    this.isProcessing = true;
    this.lastBatchTime = performance.now();

    try {
      // Execute all pending updates
      const updates = Array.from(this.pendingUpdates.values());
      this.pendingUpdates.clear();

      for (const update of updates) {
        try {
          update.updateFn();
        } catch (error) {
          console.warn(`Debounced update failed for ${update.id}:`, error);
        }
      }
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Get statistics about pending updates
   */
  getStats() {
    return {
      pendingCount: this.pendingUpdates.size,
      isProcessing: this.isProcessing,
      oldestUpdate:
        this.pendingUpdates.size > 0
          ? Math.min(
              ...Array.from(this.pendingUpdates.values()).map(
                (u) => performance.now() - u.timestamp,
              ),
            )
          : 0,
    };
  }
}

// Global instance for deer updates
const deerUpdateManager = new DebouncedUpdateManager();

/**
 * Queue a debounced deer movement update
 */
export function queueDeerMovementUpdate(deerId: string, updateFn: () => void) {
  deerUpdateManager.queueUpdate(`deer-movement-${deerId}`, updateFn);
}

/**
 * Cancel pending deer updates
 */
export function cancelDeerMovementUpdate(deerId: string) {
  deerUpdateManager.cancelUpdate(`deer-movement-${deerId}`);
}

/**
 * Get deer update statistics
 */
export function getDeerUpdateStats() {
  return deerUpdateManager.getStats();
}
