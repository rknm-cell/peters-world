"use client";

interface WorldTitleCanvasProps {
  className?: string;
}

export function WorldTitleCanvas({ className = "" }: WorldTitleCanvasProps) {
  return (
    <div className={`w-full h-full ${className} flex items-center justify-center`}>
      <h1 
        className="text-4xl sm:text-6xl md:text-7xl font-bold text-white text-center leading-none"
        style={{ fontFamily: 'Modak, cursive' }}
      >
        Peter&apos;s World
      </h1>
    </div>
  );
}
