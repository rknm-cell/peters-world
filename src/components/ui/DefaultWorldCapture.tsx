"use client";

import React from "react";
import { Button } from "./button";
import { useWorldStore } from "~/lib/store";
import { captureCurrentWorldAsDefault } from "~/lib/utils/default-world";
import { Download } from "lucide-react";

/**
 * Development utility to capture the current world as a default template
 * Only shows in development mode
 */
export function DefaultWorldCapture() {
  const { 
    objects, 
    terrainVertices, 
    terraformMode, 
    brushSize, 
    brushStrength, 
    timeOfDay 
  } = useWorldStore();

  // Only show in development (check multiple ways)
  const isDevelopment = process.env.NODE_ENV === "development" || 
                       process.env.NODE_ENV === undefined || 
                       typeof window !== "undefined" && window.location.hostname === "localhost";
  
  if (!isDevelopment) {
    return null;
  }

  const handleCapture = () => {
    const worldState = {
      objects,
      terrainVertices,
      terraformMode,
      brushSize,
      brushStrength,
      timeOfDay,
    };

    const template = captureCurrentWorldAsDefault(worldState);
    
    // Copy to clipboard for easy pasting
    if (navigator.clipboard) {
      navigator.clipboard.writeText(JSON.stringify(template, null, 2)).then(() => {
        console.log("📋 Template copied to clipboard!");
      }).catch(() => {
        console.log("📋 Template logged to console (clipboard failed)");
      });
    }

    // Also download as JSON file
    const blob = new Blob([JSON.stringify(template, null, 2)], { 
      type: "application/json" 
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `default-world-template-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <Button
        onClick={handleCapture}
        variant="outline"
        size="sm"
        className="border-yellow-500/50 bg-yellow-500/10 text-yellow-400 hover:bg-yellow-500/20"
        title="Capture current world as default template (Dev only)"
      >
        <Download className="mr-2 h-4 w-4" />
        Capture Default
      </Button>
    </div>
  );
}
