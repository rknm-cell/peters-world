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
        uWaterColor: { value: new THREE.Color(0x006994) },
        uFoamColor: { value: new THREE.Color(0x87ceeb) },
        uOpacity: { value: 0.85 },
        uSpecular: { value: 0.8 },
        uRoughness: { value: 0.1 },
      },
      vertexShader: `
        varying vec2 vUv;
        varying vec3 vPosition;
        varying vec3 vNormal;
        varying float vAlpha;
        varying vec3 vWorldPosition;
        
        uniform float uTime;
        
        attribute float waterLevel;
        
        // Enhanced wave function with multiple frequencies
        float wave(vec2 pos, float time) {
          float wave1 = sin(pos.x * 3.0 + time * 2.0) * 0.015;
          float wave2 = cos(pos.y * 4.0 + time * 1.5) * 0.012;
          float wave3 = sin(pos.x * 6.0 + pos.y * 5.0 + time * 3.0) * 0.008;
          return wave1 + wave2 + wave3;
        }
        
        void main() {
          vUv = uv;
          vNormal = normal;
          vAlpha = waterLevel;
          
          vec3 pos = position;
          
          // Add wave animation only where there's water
          if (waterLevel > 0.01) {
            pos.y += wave(pos.xz, uTime) * waterLevel;
          }
          
          vPosition = pos;
          vWorldPosition = (modelMatrix * vec4(pos, 1.0)).xyz;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
        }
      `,
      fragmentShader: `
        uniform float uTime;
        uniform vec3 uWaterColor;
        uniform vec3 uFoamColor;
        uniform float uOpacity;
        uniform float uSpecular;
        uniform float uRoughness;
        
        varying vec2 vUv;
        varying vec3 vPosition;
        varying vec3 vNormal;
        varying float vAlpha;
        varying vec3 vWorldPosition;
        
        void main() {
          // Discard fragments where there's no water
          if (vAlpha < 0.01) {
            discard;
          }
          
          vec2 uv = vUv;
          
          // Enhanced water surface animation with multiple wave patterns
          float wave1 = sin(uv.x * 8.0 + uTime * 2.0) * 0.5 + 0.5;
          float wave2 = cos(uv.y * 6.0 + uTime * 1.5) * 0.5 + 0.5;
          float wave3 = sin(uv.x * 12.0 + uv.y * 10.0 + uTime * 4.0) * 0.5 + 0.5;
          
          // Create ripple effects radiating from center
          float ripple = sin(length(uv - 0.5) * 20.0 - uTime * 3.5) * 0.3 + 0.7;
          
          // Mix water color with animated patterns
          vec3 baseColor = mix(uWaterColor, uFoamColor, wave1 * wave2 * 0.3);
          vec3 animatedColor = mix(baseColor, uFoamColor, wave3 * ripple * 0.4);
          
          // Add specular highlights
          vec3 lightDir = normalize(vec3(0.5, 1.0, 0.3));
          vec3 viewDir = normalize(cameraPosition - vWorldPosition);
          vec3 halfDir = normalize(lightDir + viewDir);
          float specular = pow(max(dot(vNormal, halfDir), 0.0), 32.0) * uSpecular;
          
          // Final color with specular highlights
          vec3 finalColor = animatedColor + specular * vec3(1.0);
          
          // Use vertex alpha combined with animation for final transparency
          // Ensure water is only visible where it's been painted
          float alpha = uOpacity * vAlpha * (0.9 + ripple * 0.1);
          
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