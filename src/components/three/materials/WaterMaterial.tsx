import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface WaterMaterialProps {
  waterVertices: Array<{ waterLevel: number }>;
}

// Water material that receives proper lighting like the globe using custom shader with Three.js lighting
const WaterToonMaterial = (_props: { waterVertices: Array<{ waterLevel: number }> }) => {
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  
  // Animate water over time
  useFrame((state) => {
    if (materialRef.current?.uniforms.uTime) {
      materialRef.current.uniforms.uTime.value = state.clock.elapsedTime;
    }
  });

  // Custom shader material that uses Three.js built-in lighting
  const shaderMaterial = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        ...THREE.UniformsLib.lights, // Include Three.js lighting uniforms
        uTime: { value: 0 },
        uWaterColor: { value: new THREE.Color(0x4A90E2) },
        uShadowColor: { value: new THREE.Color(0x2B5A87) },
        uFoamColor: { value: new THREE.Color(0x87CEEB) },
        uOpacity: { value: 0.9 },
      },
      lights: true, // Enable Three.js lighting
      vertexShader: `
        #include <common>
        #include <lights_pars_begin>
        
        varying vec2 vUv;
        varying vec3 vNormal;
        varying float vWaterLevel;
        varying vec3 vWorldPosition;
        varying vec3 vViewPosition;
        
        attribute float waterLevel;
        
        void main() {
          vUv = uv;
          vNormal = normalize(normalMatrix * normal);
          vWaterLevel = waterLevel;
          
          vec4 worldPosition = modelMatrix * vec4(position, 1.0);
          vWorldPosition = worldPosition.xyz;
          vViewPosition = (modelViewMatrix * vec4(position, 1.0)).xyz;
          
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        #include <common>
        #include <lights_pars_begin>
        
        uniform vec3 uWaterColor;
        uniform vec3 uShadowColor;
        uniform vec3 uFoamColor;
        uniform float uOpacity;
        uniform float uTime;
        
        varying vec2 vUv;
        varying vec3 vNormal;
        varying float vWaterLevel;
        varying vec3 vWorldPosition;
        varying vec3 vViewPosition;
        
        void main() {
          // Discard fragments where there's no water
          if (vWaterLevel < 0.01) {
            discard;
          }
          
          // Get lighting from Three.js directional lights (same as MeshStandardMaterial)
          vec3 normal = normalize(vNormal);
          
          // Calculate lighting using Three.js lighting system
          vec3 totalDiffuse = vec3(0.0);
          
          #if NUM_DIR_LIGHTS > 0
            for (int i = 0; i < NUM_DIR_LIGHTS; i++) {
              vec3 lightDirection = directionalLights[i].direction;
              vec3 lightColor = directionalLights[i].color;
              
              float NdotL = max(dot(normal, lightDirection), 0.0);
              
              // Cel-shading: quantize lighting into discrete steps (like MeshToonMaterial)
              float lightIntensity = NdotL;
              float celLevel;
              if (lightIntensity > 0.75) {
                celLevel = 1.0;
              } else if (lightIntensity > 0.4) {
                celLevel = 0.7;
              } else {
                celLevel = 0.4;
              }
              
              totalDiffuse += lightColor * celLevel;
            }
          #endif
          
          // Apply lighting to water colors
          vec3 lightedWaterColor = uWaterColor * totalDiffuse;
          vec3 lightedShadowColor = uShadowColor * totalDiffuse;
          
          // Add foam at water edges
          float edgeFactor = 1.0 - smoothstep(0.1, 0.4, vWaterLevel);
          vec3 finalColor = mix(lightedWaterColor, uFoamColor, edgeFactor * 0.5);
          
          // Add subtle animation
          float wave = sin(vWorldPosition.x * 2.0 + uTime) * sin(vWorldPosition.z * 2.0 + uTime) * 0.1;
          finalColor += vec3(wave * 0.1);
          
          // Water opacity
          float alpha = uOpacity * smoothstep(0.01, 0.1, vWaterLevel);
          
          gl_FragColor = vec4(finalColor, alpha);
        }
      `,
      transparent: true,
      side: THREE.DoubleSide,
      depthWrite: false,
      depthTest: true,
      alphaTest: 0.01,
    });
  }, []);

  return <primitive ref={materialRef} object={shaderMaterial} attach="material" />;
};

export function WaterMaterial({ waterVertices }: WaterMaterialProps) {
  // Check if there's any water to render
  const hasWater = waterVertices.some(v => v.waterLevel > 0.01);
  
  if (!hasWater) {
    return null;
  }
  
  const waterCount = waterVertices.filter(v => v.waterLevel > 0.01).length;
  const maxWaterLevel = Math.max(...waterVertices.map(v => v.waterLevel));
  console.log(`WaterMaterial: Rendering water with toon material, ${waterCount} water vertices, max level: ${maxWaterLevel.toFixed(3)}`);
  
  return <WaterToonMaterial waterVertices={waterVertices} />;
}