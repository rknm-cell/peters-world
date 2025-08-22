/**
 * Performance detection utility for automatic optimization
 */

// Extended interfaces for non-standard browser APIs
interface ExtendedNavigator extends Navigator {
  deviceMemory?: number;
}

interface ExtendedPerformance extends Performance {
  memory?: {
    usedJSHeapSize?: number;
    totalJSHeapSize?: number;
    jsHeapSizeLimit?: number;
  };
}

export interface PerformanceProfile {
  isLowEnd: boolean;
  isMobile: boolean;
  suggestedWaterResolution: number;
  suggestedUpdateFrequency: number;
  useLowPerformanceMode: boolean;
}

export class PerformanceDetector {
  private static instance: PerformanceDetector | null = null;
  private frameRates: number[] = [];
  private lastFrameTime = performance.now();
  private profile: PerformanceProfile | null = null;

  static getInstance(): PerformanceDetector {
    PerformanceDetector.instance ??= new PerformanceDetector();
    return PerformanceDetector.instance;
  }

  /**
   * Detect device performance capabilities
   */
  detectPerformance(): PerformanceProfile {
    if (this.profile) {
      return this.profile;
    }

    // Device detection
    const isMobile = this.detectMobile();
    const gpuTier = this.detectGPUTier();
    const memoryInfo = this.getMemoryInfo();
    
    // Calculate performance score (0-1, higher is better)
    let performanceScore = 0.5; // Start with average
    
    // GPU tier scoring
    if (gpuTier === 'high') performanceScore += 0.3;
    else if (gpuTier === 'low') performanceScore -= 0.2;
    
    // Mobile penalty
    if (isMobile) performanceScore -= 0.2;
    
    // Memory scoring
    if (memoryInfo.totalMemory > 8) performanceScore += 0.2;
    else if (memoryInfo.totalMemory < 4) performanceScore -= 0.2;
    
    // Hardware concurrency scoring
    const cores = navigator.hardwareConcurrency || 4;
    if (cores >= 8) performanceScore += 0.1;
    else if (cores <= 2) performanceScore -= 0.1;
    
    // Determine settings based on performance score
    const isLowEnd = performanceScore < 0.4;
    
    this.profile = {
      isLowEnd,
      isMobile,
      suggestedWaterResolution: isLowEnd ? 16 : isMobile ? 24 : 32,
      suggestedUpdateFrequency: isLowEnd ? 15 : isMobile ? 20 : 30,
      useLowPerformanceMode: isLowEnd || (isMobile && performanceScore < 0.6)
    };

    console.log('Performance Profile:', {
      ...this.profile,
      performanceScore: performanceScore.toFixed(2),
      gpuTier,
      cores,
      memory: memoryInfo
    });

    return this.profile;
  }

  /**
   * Start FPS monitoring for runtime performance adjustment
   */
  startFPSMonitoring(): void {
    this.frameRates = [];
    this.measureFPS();
  }

  /**
   * Get current FPS estimate
   */
  getCurrentFPS(): number {
    if (this.frameRates.length === 0) return 60; // Default assumption
    const sum = this.frameRates.reduce((a, b) => a + b, 0);
    return sum / this.frameRates.length;
  }

  /**
   * Check if performance has degraded and suggest adjustments
   */
  shouldReduceQuality(): boolean {
    const currentFPS = this.getCurrentFPS();
    return currentFPS < 30 && this.frameRates.length > 60; // After 1 second of monitoring
  }

  private measureFPS(): void {
    const now = performance.now();
    const delta = now - this.lastFrameTime;
    this.lastFrameTime = now;
    
    if (delta > 0) {
      const fps = 1000 / delta;
      this.frameRates.push(fps);
      
      // Keep only recent measurements
      if (this.frameRates.length > 180) { // 3 seconds at 60fps
        this.frameRates.shift();
      }
    }
    
    requestAnimationFrame(() => this.measureFPS());
  }

  private detectMobile(): boolean {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  }

  private detectGPUTier(): 'high' | 'medium' | 'low' {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') ?? 
               canvas.getContext('experimental-webgl') as WebGLRenderingContext | null;
    
    if (!gl) return 'low';
    
    const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
    const renderer = debugInfo ? gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) as string : '';
    
    // Basic GPU classification (simplified)
    const highEndGPUs = ['RTX', 'GTX 1060', 'GTX 1070', 'GTX 1080', 'RX 580', 'RX 590'];
    const lowEndGPUs = ['Intel HD', 'Intel UHD', 'PowerVR', 'Adreno 5', 'Mali-G'];
    
    const rendererLower = renderer.toLowerCase();
    
    if (highEndGPUs.some(gpu => rendererLower.includes(gpu.toLowerCase()))) {
      return 'high';
    } else if (lowEndGPUs.some(gpu => rendererLower.includes(gpu.toLowerCase()))) {
      return 'low';
    }
    
    return 'medium';
  }

  private getMemoryInfo(): { totalMemory: number; usedMemory: number } {
    const extendedNavigator = navigator as ExtendedNavigator;
    const deviceMemory: number = extendedNavigator.deviceMemory ?? 4; // Default to 4GB
    
    // Estimate used memory (very rough)
    let usedMemory = 0;
    if ('memory' in performance) {
      const extendedPerformance = performance as ExtendedPerformance;
      const memoryInfo = extendedPerformance.memory;
      usedMemory = memoryInfo?.usedJSHeapSize ? memoryInfo.usedJSHeapSize / (1024 * 1024 * 1024) : 0; // Convert to GB
    }
    
    return {
      totalMemory: deviceMemory,
      usedMemory
    };
  }
}

/**
 * Hook for using performance detection in React components
 */
export function usePerformanceDetector() {
  const detector = PerformanceDetector.getInstance();
  const profile = detector.detectPerformance();
  
  // Start FPS monitoring on first use
  if (detector.getCurrentFPS() === 60) { // Default value indicates no monitoring yet
    detector.startFPSMonitoring();
  }
  
  return {
    profile,
    currentFPS: detector.getCurrentFPS(),
    shouldReduceQuality: detector.shouldReduceQuality()
  };
}