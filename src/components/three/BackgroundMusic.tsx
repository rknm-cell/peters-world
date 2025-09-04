"use client";

import { useEffect, useRef, useState } from "react";

interface BackgroundMusicProps {
  volume?: number;
  autoPlay?: boolean;
}

export function BackgroundMusic({
  volume = 0.3,
  autoPlay = true,
}: BackgroundMusicProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);

  useEffect(() => {
    // Create audio element
    const audio = new Audio("/music/cozy_background.mp3");
    audio.loop = true;
    audio.volume = volume;
    audio.preload = "auto";

    audioRef.current = audio;

    // Set up event listeners
    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleEnded = () => setIsPlaying(false);

    audio.addEventListener("play", handlePlay);
    audio.addEventListener("pause", handlePause);
    audio.addEventListener("ended", handleEnded);

    // Auto-play if enabled
    if (autoPlay) {
      audio.play().catch((error) => {
        // Auto-play might be blocked by browser policy
      });
    }

    // Cleanup function
    return () => {
      audio.removeEventListener("play", handlePlay);
      audio.removeEventListener("pause", handlePause);
      audio.removeEventListener("ended", handleEnded);
      audio.pause();
      audio.src = "";
    };
  }, [volume, autoPlay]);

  useEffect(() => {
    if (audioRef.current) {
      // Background music loaded
    }
  }, [audioRef]);

  const togglePlayPause = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        void audioRef.current.play();
      }
    }
  };

  const toggleMute = () => {
    if (audioRef.current) {
      audioRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const setVolume = (newVolume: number) => {
    if (audioRef.current) {
      audioRef.current.volume = Math.max(0, Math.min(1, newVolume));
    }
  };

  // Optional: Add keyboard shortcuts for audio control
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      if (
        event.target instanceof HTMLInputElement ||
        event.target instanceof HTMLTextAreaElement
      ) {
        return; // Don't handle shortcuts when typing in input fields
      }

      switch (event.code) {
        case "Space":
          event.preventDefault();
          togglePlayPause();
          break;
        case "KeyM":
          event.preventDefault();
          toggleMute();
          break;
      }
    };

    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, [isPlaying, isMuted]);

  return (
    <div className="fixed bottom-4 right-4 z-50 flex items-center gap-2 rounded-lg bg-black/20 p-2 text-white backdrop-blur-sm">
      <button
        onClick={togglePlayPause}
        className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20 transition-colors hover:bg-white/30"
        title={`${isPlaying ? "Pause" : "Play"} music (Space)`}
      >
        {isPlaying ? "⏸️" : "▶️"}
      </button>

      <button
        onClick={toggleMute}
        className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20 transition-colors hover:bg-white/30"
        title={`${isMuted ? "Unmute" : "Mute"} music (M)`}
      >
        {isMuted ? "🔇" : "🔊"}
      </button>

      <input
        type="range"
        min="0"
        max="1"
        step="0.1"
        value={volume}
        onChange={(e) => setVolume(parseFloat(e.target.value))}
        className="h-2 w-20 cursor-pointer appearance-none rounded-lg bg-white/20"
        title="Volume control"
      />
    </div>
  );
}
