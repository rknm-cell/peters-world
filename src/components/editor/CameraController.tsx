"use client";

import { useThree } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import * as THREE from "three";

export function CameraController() {
  const { camera, gl } = useThree();
  const cameraRef = useRef<THREE.Camera | null>(null);

  useEffect(() => {
    if (camera) {
      cameraRef.current = camera;
    }
  }, [camera]);

  useEffect(() => {
    const handleTouchStart = (event: TouchEvent) => {
      if (event.touches.length === 1) {
        // Single touch - orbit camera
        const touch = event.touches[0];
        if (touch) {
          const mouseEvent = new MouseEvent("mousedown", {
            clientX: touch.clientX,
            clientY: touch.clientY,
          });
          gl.domElement.dispatchEvent(mouseEvent);
        }
      }
    };

    const handleTouchMove = (event: TouchEvent) => {
      if (event.touches.length === 1) {
        // Single touch - orbit camera
        const touch = event.touches[0];
        if (touch) {
          const mouseEvent = new MouseEvent("mousemove", {
            clientX: touch.clientX,
            clientY: touch.clientY,
          });
          gl.domElement.dispatchEvent(mouseEvent);
        }
      }
    };

    const handleTouchEnd = () => {
      const mouseEvent = new MouseEvent("mouseup");
      gl.domElement.dispatchEvent(mouseEvent);
    };

    const handleWheel = (event: WheelEvent) => {
      event.preventDefault();
      if (cameraRef.current && 'zoom' in cameraRef.current) {
        const camera = cameraRef.current as THREE.PerspectiveCamera | THREE.OrthographicCamera;
        const zoomSpeed = 0.1;
        const delta = event.deltaY > 0 ? 1 : -1;
        const newZoom = camera.zoom + delta * zoomSpeed;
        camera.zoom = Math.max(0.5, Math.min(5, newZoom));
        camera.updateProjectionMatrix();
      }
    };

    gl.domElement.addEventListener("touchstart", handleTouchStart);
    gl.domElement.addEventListener("touchmove", handleTouchMove);
    gl.domElement.addEventListener("touchend", handleTouchEnd);
    gl.domElement.addEventListener("wheel", handleWheel, { passive: false });

    return () => {
      gl.domElement.removeEventListener("touchstart", handleTouchStart);
      gl.domElement.removeEventListener("touchmove", handleTouchMove);
      gl.domElement.removeEventListener("touchend", handleTouchEnd);
      gl.domElement.removeEventListener("wheel", handleWheel);
    };
  }, [gl]);

  return null;
}