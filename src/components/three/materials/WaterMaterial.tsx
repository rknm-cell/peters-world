import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface WaterMaterialProps {
  waterVertices: Array<{ waterLevel: number }>;
}

// Custom water shader material
const WaterShaderMaterial = (props: THREE.ShaderMaterialParameters) => {
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  
  // Animate water over time
  useFrame((state) => {
    if (materialRef.current?.uniforms.uTime) {
      materialRef.current.uniforms.uTime.value = state.clock.elapsedTime;
    }
  });

  const shaderMaterial = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uWaterColor: { value: new THREE.Color(0x4A90E2) }, // Cel-shaded blue
        uShadowColor: { value: new THREE.Color(0x2B5A87) }, // Darker blue for shadows
        uFoamColor: { value: new THREE.Color(0x87CEEB) }, // Light blue for edges
        uOpacity: { value: 0.9 },
      },
      vertexShader: `
        varying vec2 vUv;
        varying vec3 vNormal;
        varying float vWaterLevel;
        varying vec3 vWorldPosition;
        
        attribute float waterLevel;
        
        void main() {
          vUv = uv;
          vNormal = normalize(normalMatrix * normal);
          vWaterLevel = waterLevel;
          vWorldPosition = (modelMatrix * vec4(position, 1.0)).xyz;
          
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 uWaterColor;
        uniform vec3 uShadowColor;
        uniform vec3 uFoamColor;
        uniform float uOpacity;
        
        varying vec2 vUv;
        varying vec3 vNormal;
        varying float vWaterLevel;
        varying vec3 vWorldPosition;
        
        void main() {
          // Discard fragments where there's no water
          if (vWaterLevel < 0.01) {
            discard;
          }
          
          // Cel-shading lighting calculation
          vec3 lightDirection = normalize(vec3(0.5, 1.0, 0.3));
          float NdotL = dot(normalize(vNormal), lightDirection);
          
          // Cel-shading: quantize lighting into discrete steps
          float lightIntensity = NdotL * 0.5 + 0.5; // Remap to 0-1
          
          // Create 3 lighting levels (cel-shaded steps)
          float celLevel;
          if (lightIntensity > 0.75) {
            celLevel = 1.0; // Full light
          } else if (lightIntensity > 0.4) {
            celLevel = 0.7; // Medium light  
          } else {
            celLevel = 0.4; // Shadow
          }
          
          // Choose color based on cel-shading level
          vec3 baseColor;
          if (celLevel > 0.9) {
            baseColor = uWaterColor;
          } else if (celLevel > 0.6) {
            baseColor = mix(uShadowColor, uWaterColor, 0.6);
          } else {
            baseColor = uShadowColor;
          }
          
          // Add foam at water edges (low water level areas)
          float edgeFactor = 1.0 - smoothstep(0.1, 0.4, vWaterLevel);
          vec3 finalColor = mix(baseColor, uFoamColor, edgeFactor * 0.5);
          
          // Flat opacity based on water level
          float alpha = uOpacity * smoothstep(0.01, 0.1, vWaterLevel);
          
          gl_FragColor = vec4(finalColor, alpha);
        }
      `,
      transparent: true,
      side: THREE.DoubleSide,
      depthWrite: false, // Don't write to depth buffer for transparent water
      depthTest: true,   // But still test depth
      alphaTest: 0.01,   // Discard very transparent pixels
      ...props
    });
  }, [props]);

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
  console.log(`WaterMaterial: Rendering water shader with ${waterCount} water vertices, max level: ${maxWaterLevel.toFixed(3)}`);
  
  return <WaterShaderMaterial />;
}