"use client";

import { useEffect, useState } from 'react';
import * as THREE from 'three';
import { useWorldStore } from '~/lib/store';
import { terrainHeightMapGenerator } from './TerrainHeightMap';
import { terrainNormalMapGenerator } from './TerrainNormalMap';
import { enhancedPathfinder } from '~/lib/utils/enhanced-pathfinding';
import { getTerrainCollisionDetector } from '~/lib/utils/terrain-collision';

interface TestResult {
  method: string;
  success: boolean;
  error?: string;
  performance?: number;
  details?: string;
}

/**
 * CollisionValidationTest - Comprehensive testing of all collision validation approaches
 */
export function CollisionValidationTest() {
  const [isRunning, setIsRunning] = useState(false);
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [showTestPanel, setShowTestPanel] = useState(false);
  const {} = useWorldStore(); // Keep store connection for future use

  // Test positions on the globe
  const testPositions = [
    new THREE.Vector3(6.1, 0, 0),     // Equator, slightly above surface
    new THREE.Vector3(0, 6.1, 0),     // North pole
    new THREE.Vector3(0, -6.1, 0),    // South pole
    new THREE.Vector3(4.3, 4.3, 0),   // 45 degree angle
    new THREE.Vector3(3.0, 3.0, 4.2), // Random position
  ];

  const runTests = async () => {
    setIsRunning(true);
    const results: TestResult[] = [];

    console.log('🧪 Starting collision validation tests...');

    // Test 1: Height Map Generation
    try {
      const startTime = performance.now();
      const heightMapData = terrainHeightMapGenerator.generateHeightMap(128);
      const endTime = performance.now();
      
      results.push({
        method: 'Height Map Generation',
        success: !!heightMapData,
        performance: endTime - startTime,
        details: heightMapData ? `Generated ${heightMapData.resolution}x${heightMapData.resolution} map` : 'Failed to generate'
      });
    } catch (error) {
      results.push({
        method: 'Height Map Generation',
        success: false,
        error: String(error)
      });
    }

    // Test 2: Normal Map Generation
    try {
      const startTime = performance.now();
      const normalMapData = terrainNormalMapGenerator.generateNormalMap(128);
      const endTime = performance.now();
      
      results.push({
        method: 'Normal Map Generation',
        success: !!normalMapData,
        performance: endTime - startTime,
        details: normalMapData ? `Generated ${normalMapData.resolution}x${normalMapData.resolution} map` : 'Failed to generate'
      });
    } catch (error) {
      results.push({
        method: 'Normal Map Generation',
        success: false,
        error: String(error)
      });
    }

    // Test 3: Height Sampling
    let heightSamplingSuccess = 0;
    try {
      const startTime = performance.now();
      for (const pos of testPositions) {
        const height = terrainHeightMapGenerator.sampleHeight(pos);
        if (height !== null && height > 5.0 && height < 10.0) {
          heightSamplingSuccess++;
        }
      }
      const endTime = performance.now();
      
      results.push({
        method: 'Height Sampling',
        success: heightSamplingSuccess > 0,
        performance: endTime - startTime,
        details: `${heightSamplingSuccess}/${testPositions.length} positions sampled successfully`
      });
    } catch (error) {
      results.push({
        method: 'Height Sampling',
        success: false,
        error: String(error)
      });
    }

    // Test 4: Normal Sampling
    let normalSamplingSuccess = 0;
    try {
      const startTime = performance.now();
      for (const pos of testPositions) {
        const normal = terrainNormalMapGenerator.sampleNormal(pos);
        if (normal && normal.length() > 0.5) { // Valid normal vector
          normalSamplingSuccess++;
        }
      }
      const endTime = performance.now();
      
      results.push({
        method: 'Normal Sampling',
        success: normalSamplingSuccess > 0,
        performance: endTime - startTime,
        details: `${normalSamplingSuccess}/${testPositions.length} normals sampled successfully`
      });
    } catch (error) {
      results.push({
        method: 'Normal Sampling',
        success: false,
        error: String(error)
      });
    }

    // Test 5: Slope Detection
    let slopeDetectionSuccess = 0;
    try {
      const startTime = performance.now();
      for (const pos of testPositions) {
        const slopeAngle = terrainNormalMapGenerator.getSlopeAngle(pos);
        const isTraversable = terrainNormalMapGenerator.isTraversable(pos);
        if (slopeAngle !== null && typeof isTraversable === 'boolean') {
          slopeDetectionSuccess++;
        }
      }
      const endTime = performance.now();
      
      results.push({
        method: 'Slope Detection',
        success: slopeDetectionSuccess > 0,
        performance: endTime - startTime,
        details: `${slopeDetectionSuccess}/${testPositions.length} slopes analyzed successfully`
      });
    } catch (error) {
      results.push({
        method: 'Slope Detection',
        success: false,
        error: String(error)
      });
    }

    // Test 6: Traditional Collision Detection
    let traditionalCollisionSuccess = 0;
    try {
      const startTime = performance.now();
      const detector = getTerrainCollisionDetector();
      
      for (let i = 0; i < testPositions.length - 1; i++) {
        const result = detector.checkMovement(testPositions[i]!, testPositions[i + 1]!);
        if (result && typeof result.canMove === 'boolean') {
          traditionalCollisionSuccess++;
        }
      }
      const endTime = performance.now();
      
      results.push({
        method: 'Traditional Collision',
        success: traditionalCollisionSuccess > 0,
        performance: endTime - startTime,
        details: `${traditionalCollisionSuccess}/${testPositions.length - 1} collision checks completed`
      });
    } catch (error) {
      results.push({
        method: 'Traditional Collision',
        success: false,
        error: String(error)
      });
    }

    // Test 7: Enhanced Pathfinding
    let enhancedPathfindingSuccess = 0;
    try {
      const startTime = performance.now();
      
      for (let i = 0; i < testPositions.length - 1; i++) {
        const validation = enhancedPathfinder.validatePath(
          testPositions[i]!,
          testPositions[i + 1]!,
          {
            maxSlopeAngle: Math.PI / 4,
            avoidWater: true,
            samples: 10,
            useHeightMap: true,
            useNormalMap: true,
            generateAlternatives: false
          }
        );
        
        if (validation && typeof validation.isValid === 'boolean' && validation.confidence > 0) {
          enhancedPathfindingSuccess++;
        }
      }
      const endTime = performance.now();
      
      results.push({
        method: 'Enhanced Pathfinding',
        success: enhancedPathfindingSuccess > 0,
        performance: endTime - startTime,
        details: `${enhancedPathfindingSuccess}/${testPositions.length - 1} path validations completed`
      });
    } catch (error) {
      results.push({
        method: 'Enhanced Pathfinding',
        success: false,
        error: String(error)
      });
    }

    // Test 8: Best Path Finding
    try {
      const startTime = performance.now();
      const pathResult = enhancedPathfinder.findBestPath(
        testPositions[0]!,
        testPositions[2]!,
        { samples: 15 }
      );
      const endTime = performance.now();
      
      results.push({
        method: 'Best Path Finding',
        success: !!(pathResult?.path && pathResult.path.length > 0),
        performance: endTime - startTime,
        details: pathResult ? `Generated path with ${pathResult.path.length} points, confidence: ${(pathResult.confidence * 100).toFixed(1)}%` : 'Failed to generate path'
      });
    } catch (error) {
      results.push({
        method: 'Best Path Finding',
        success: false,
        error: String(error)
      });
    }

    setTestResults(results);
    setIsRunning(false);

    // Log summary
    const successCount = results.filter(r => r.success).length;
    console.log(`🧪 Tests completed: ${successCount}/${results.length} passed`);
    
    results.forEach(result => {
      const status = result.success ? '✅' : '❌';
      const perf = result.performance ? ` (${result.performance.toFixed(2)}ms)` : '';
      console.log(`${status} ${result.method}${perf}: ${result.details ?? result.error ?? 'No details'}`);
    });
  };

  // Keyboard shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'T') {
        e.preventDefault();
        setShowTestPanel(!showTestPanel);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showTestPanel]);

  if (!showTestPanel) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <button
          onClick={() => setShowTestPanel(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg text-sm shadow-lg"
          title="Open Collision Validation Tests (Ctrl+Shift+T)"
        >
          🧪 Tests
        </button>
      </div>
    );
  }

  return (
    <div className="fixed top-4 left-4 bg-black/90 backdrop-blur-sm rounded-lg p-4 text-white z-50 max-w-md max-h-96 overflow-y-auto">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium">Collision Validation Tests</h3>
        <button
          onClick={() => setShowTestPanel(false)}
          className="text-gray-400 hover:text-white text-sm"
        >
          ✕
        </button>
      </div>
      
      <div className="space-y-3">
        <button
          onClick={runTests}
          disabled={isRunning}
          className={`w-full px-3 py-2 rounded text-sm font-medium ${
            isRunning
              ? 'bg-gray-600 cursor-not-allowed'
              : 'bg-blue-600 hover:bg-blue-700'
          }`}
        >
          {isRunning ? '🔄 Running Tests...' : '🧪 Run All Tests'}
        </button>

        {testResults.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-xs font-medium text-gray-300">Results:</h4>
            {testResults.map((result, idx) => (
              <div key={idx} className="text-xs">
                <div className="flex items-center justify-between">
                  <span className={result.success ? 'text-green-400' : 'text-red-400'}>
                    {result.success ? '✅' : '❌'} {result.method}
                  </span>
                  {result.performance && (
                    <span className="text-gray-400">
                      {result.performance.toFixed(1)}ms
                    </span>
                  )}
                </div>
                {(result.details ?? result.error) && (
                  <div className="text-gray-400 ml-4 mt-1">
                    {result.details ?? result.error}
                  </div>
                )}
              </div>
            ))}
            
            <div className="mt-3 pt-2 border-t border-gray-700">
              <div className="text-xs text-gray-400">
                <p>✅ {testResults.filter(r => r.success).length}/{testResults.length} tests passed</p>
                <p className="mt-1">⌨️ Toggle: Ctrl+Shift+T</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
