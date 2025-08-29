"use client";

import { useState } from "react";
import { Canvas } from "~/components/editor/Canvas";
import { Toolbar } from "~/components/ui/Toolbar";
import { Instructions } from "~/components/ui/Instructions";
import { useWorldPersistence } from "~/lib/hooks/useWorldPersistence";
import Head from "next/head";

export default function Home() {
  // Enable auto-save and auto-restore
  const { hasRestoredWorld } = useWorldPersistence();

  // State to control overlay visibility
  const [showOverlay, setShowOverlay] = useState(true);

  return (
    <>
      <Head>
        <title>Peter&apos;s World - Make it your own</title>
        <meta name="description" content="Welcome to Peter&apos;s World - an interactive 3D world builder where you can create, explore, and share your own tiny worlds with beautiful graphics and immersive experiences." />
        
        {/* Open Graph */}
        <meta property="og:title" content="Peter&apos;s World - Make it your own" />
        <meta property="og:description" content="Welcome to Peter&apos;s World - an interactive 3D world builder where you can create, explore, and share your own tiny worlds with beautiful graphics and immersive experiences." />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://peters-world.com" />
        <meta property="og:image" content="/globe.png" />
        <meta property="og:site_name" content="Peter&apos;s World" />
        
        {/* Twitter Card */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Peter&apos;s World - Make it your own" />
        <meta name="twitter:description" content="Welcome to Peter&apos;s World - an interactive 3D world builder where you can create, explore, and share your own tiny worlds with beautiful graphics and immersive experiences." />
        <meta name="twitter:image" content="/globe.png" />
      </Head>
      
      <div className="relative h-screen w-screen bg-gray-900">
        <Canvas />
        <Toolbar />
        <Instructions />

        {/* Landing page text overlay */}
        {showOverlay && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/10 backdrop-blur-md"
            onClick={() => setShowOverlay(false)}
          >
            <div className="container flex flex-col items-center justify-center gap-8 px-4 py-16 text-center">
              {/* Title */}
              <div className="mb-4 flex h-32 w-full items-center justify-center sm:h-48">
                <h1
                  className="font-regular text-center text-6xl leading-none text-white sm:text-4xl md:text-8xl lg:text-[12rem]"
                  style={{ fontFamily: "Modak, cursive" }}
                >
                  Peter&apos;s World
                </h1>
              </div>

              {/* Call to Action */}
              <div className="space-y-10 text-center">
                <p
                  className="max-w-2xl text-4xl font-light text-white"
                  style={{ fontFamily: "Modak, cursive" }}
                >
                  Welcome to my world <br /> Make it your own
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Show restoration indicator - only on client to avoid hydration issues */}
        {typeof window !== "undefined" && hasRestoredWorld && (
          <div className="fixed bottom-4 left-20 z-40 rounded-lg border border-green-500/20 bg-green-500/10 px-3 py-2 backdrop-blur-sm">
            <p className="text-sm text-green-400">
              ✅ World restored from auto-save
            </p>
          </div>
        )}
      </div>
    </>
  );
}
