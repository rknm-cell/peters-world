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
      },
      vertexShader: `
        varying vec2 vUv;
        varying vec3 vPosition;
        varying vec3 vNormal;
        varying float vAlpha;
        
        uniform float uTime;
        
        attribute float alpha;
        
        // Simple wave function
        float wave(vec2 pos, float time) {
          return sin(pos.x * 3.0 + time * 2.0) * 0.01 + 
                 cos(pos.y * 4.0 + time * 1.5) * 0.008;
        }
        
        void main() {
          vUv = uv;
          vNormal = normal;
          vAlpha = alpha;
          
          vec3 pos = position;
          
          // Add subtle wave animation only where there's water
          if (alpha > 0.1) {
            pos.y += wave(pos.xz, uTime);
          }
          
          vPosition = pos;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
        }
      `,
      fragmentShader: `
        uniform float uTime;
        uniform vec3 uWaterColor;
        uniform vec3 uFoamColor;
        uniform float uOpacity;
        
        varying vec2 vUv;
        varying vec3 vPosition;
        varying vec3 vNormal;
        varying float vAlpha;
        
        void main() {
          // Discard fragments where there's no water
          if (vAlpha < 0.01) {
            discard;
          }
          
          vec2 uv = vUv;
          
          // Animate water surface with moving patterns (reduced complexity for mobile)
          float wave1 = sin(uv.x * 8.0 + uTime * 2.0) * 0.5 + 0.5;
          float wave2 = cos(uv.y * 6.0 + uTime * 1.5) * 0.5 + 0.5;
          
          // Create gentle ripple effects
          float ripple = sin(length(uv - 0.5) * 15.0 - uTime * 3.0) * 0.2 + 0.8;
          
          // Mix water color with animated patterns
          vec3 color = mix(uWaterColor, uFoamColor, wave1 * wave2 * ripple * 0.2);
          
          // Use vertex alpha combined with animation for final transparency
          float alpha = uOpacity * vAlpha * (0.9 + ripple * 0.1);
          
          gl_FragColor = vec4(color, alpha);
        }
      `,
      transparent: true,
      side: THREE.DoubleSide,
      ...props
    });
  }, [props]);

  return <primitive ref={materialRef} object={shaderMaterial} attach="material" />;
};

export function WaterMaterial({ waterVertices }: WaterMaterialProps) {
  // Check if there's any water to render
  const hasWater = waterVertices.some(v => v.waterLevel > 0.01);
  
  if (!hasWater) return null;
  
  return <WaterShaderMaterial />;
}