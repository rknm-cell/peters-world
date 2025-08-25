/**
 * Debug Controls System
 * Provides centralized debug level management and performance throttling
 */

export enum DebugLevel {
  OFF = 0,
  BASIC = 1,
  DETAILED = 2,
  VERBOSE = 3
}

export interface DebugConfig {
  level: DebugLevel;
  enableConsoleLogging: boolean;
  enableVisualDebug: boolean;
  throttleMs: number;
  maxDebugObjects: number;
}

class DebugControlsManager {
  private static instance: DebugControlsManager;
  private config: DebugConfig;
  private lastUpdateTime: number = 0;

  private constructor() {
    this.config = {
      level: DebugLevel.OFF,
      enableConsoleLogging: false,
      enableVisualDebug: false,
      throttleMs: 100, // 100ms throttle for debug updates
      maxDebugObjects: 100
    };

    // Load from localStorage if available
    this.loadConfig();
  }

  static getInstance(): DebugControlsManager {
    if (!DebugControlsManager.instance) {
      DebugControlsManager.instance = new DebugControlsManager();
    }
    return DebugControlsManager.instance;
  }

  getConfig(): DebugConfig {
    return { ...this.config };
  }

  setDebugLevel(level: DebugLevel): void {
    this.config.level = level;
    this.config.enableConsoleLogging = level > DebugLevel.OFF;
    this.config.enableVisualDebug = level >= DebugLevel.BASIC;
    this.saveConfig();
  }

  isDebugEnabled(): boolean {
    return this.config.level > DebugLevel.OFF;
  }

  shouldShowVisualDebug(): boolean {
    return this.config.enableVisualDebug && this.config.level >= DebugLevel.BASIC;
  }

  shouldLog(level: DebugLevel = DebugLevel.BASIC): boolean {
    return this.config.enableConsoleLogging && this.config.level >= level;
  }

  shouldThrottle(): boolean {
    const now = Date.now();
    if (now - this.lastUpdateTime < this.config.throttleMs) {
      return true;
    }
    this.lastUpdateTime = now;
    return false;
  }

  conditionalLog(level: DebugLevel, message: string, ...args: any[]): void {
    if (this.shouldLog(level)) {
      console.log(`[DEBUG:${DebugLevel[level]}] ${message}`, ...args);
    }
  }

  private loadConfig(): void {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('debug-config');
        if (saved) {
          const parsed = JSON.parse(saved);
          this.config = { ...this.config, ...parsed };
        }
      } catch (e) {
        // Ignore localStorage errors
      }
    }
  }

  private saveConfig(): void {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('debug-config', JSON.stringify(this.config));
      } catch (e) {
        // Ignore localStorage errors
      }
    }
  }
}

// Export singleton instance
export const debugControls = DebugControlsManager.getInstance();

// Convenience functions
export const isDebugEnabled = () => debugControls.isDebugEnabled();
export const shouldShowVisualDebug = () => debugControls.shouldShowVisualDebug();
export const shouldLog = (level: DebugLevel = DebugLevel.BASIC) => debugControls.shouldLog(level);
export const conditionalLog = (level: DebugLevel, message: string, ...args: any[]) => 
  debugControls.conditionalLog(level, message, ...args);
export const shouldThrottle = () => debugControls.shouldThrottle();