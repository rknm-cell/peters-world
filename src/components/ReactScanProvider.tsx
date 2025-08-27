"use client";

import { useEffect } from "react";
import { scan } from "react-scan";

export function ReactScanProvider() {
  useEffect(() => {
    // Initialize React Scan for performance monitoring in development
    if (process.env.NODE_ENV === "development") {
      scan({
        enabled: true,
        showToolbar: true,
        animationSpeed: "fast",
        trackUnnecessaryRenders: true,
      });
    }
  }, []);

  return null;
}
