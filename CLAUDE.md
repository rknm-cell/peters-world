# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview
A browser-based 3D diorama creator built with the T3 stack featuring low-poly cell-shaded aesthetics. Users create, customize, and share tiny worlds on floating islands with intuitive touch/mouse controls.

## Tech Stack & Key Dependencies
- **Runtime**: Bun (package manager and runtime)
- **Core**: Next.js 15 (App Router), TypeScript, Tailwind CSS v3, Drizzle ORM, tRPC, NextAuth.js
- **3D Graphics**: Three.js (r179+), @react-three/fiber, @react-three/drei, @react-three/postprocessing
- **State Management**: Zustand for 3D scene state
- **Database**: PostgreSQL (Supabase/Neon recommended)
- **Storage**: R2/S3 for screenshot storage
- **Deployment**: Vercel with edge functions

## Development Commands
This project uses Bun as the package manager and runtime:

```bash
# Development
bun dev              # Start Next.js development server
bun run build        # Build for production
bun start            # Start production server
bun run lint         # ESLint
bun run typecheck    # TypeScript checking

# Database (using Drizzle)
bun run db:push      # Push schema changes to database
bun run db:generate  # Generate Drizzle types
bun run db:studio    # Open Drizzle Studio
bun run db:migrate   # Run database migrations

# Testing (if implemented)
bun test             # Run tests
bun test --watch     # Watch mode
```

## Architecture Overview

### Core 3D Engine Structure
- **Canvas.tsx**: R3F canvas wrapper with responsive sizing and mobile optimizations
- **Scene.tsx**: Main 3D scene orchestration with lighting and effects
- **Island.tsx**: Base floating island mesh with cell-shaded material
- **PlacementSystem.tsx**: Object placement logic using raycasting
- **CameraController.tsx**: Mobile-friendly orbit controls with gesture handling

### Material System
- Custom cell-shaded materials using THREE.MeshToonMaterial
- 3-step gradient mapping for consistent visual style
- Outline effects using inverted hull method for object selection
- Color palettes defined in constants.ts for visual cohesion

### State Management (Zustand)
```typescript
interface WorldState {
  objects: PlacedObject[]           // All placed objects in scene
  selectedObject: string | null    // Currently selected object ID
  timeOfDay: 'day' | 'sunset' | 'night'  // Lighting preset
  isPlacing: boolean               // Placement mode state
}
```

### Mobile-First Controls
1. Single touch: Orbit camera around island
2. Pinch: Zoom in/out
3. Tap: Place object or open radial menu
4. Long press: Delete selected object
5. Two-finger rotate: Rotate selected object

### Performance Considerations
- Target: 60 FPS on iPhone 12/equivalent, 120+ FPS desktop
- Object instancing for repeated elements (trees, rocks)
- Frustum culling and level-of-detail for distant objects
- Bundle size target: <500KB for 3D assets

## Database Schema
The Drizzle schema includes:
- **World**: Stores serialized object positions/rotations as JSON
- **Share**: Short code system for easy world sharing  
- **User**: Optional authentication for persistence

## API Structure (tRPC)
- `world.*`: CRUD operations (create, get, update, delete, fork)
- `gallery.*`: Public queries (getFeatured, getRecent, getByUser)

## Key Implementation Notes
- **Cell Shading**: Use THREE.MeshToonMaterial with custom gradient maps
- **Raycasting**: Essential for precise object placement on island surface  
- **Screenshot System**: Client-side canvas capture + server-side processing with Sharp
- **Serialization**: Compress world data efficiently for database storage
- **Mobile UX**: Prioritize touch interactions - most users discover via mobile social media

## Environment Variables Required
```env
DATABASE_URL=
NEXTAUTH_SECRET=
NEXTAUTH_URL=
R2_ACCESS_KEY=        # For screenshot storage
R2_SECRET_KEY=
R2_BUCKET_URL=
```

## Development Priorities
1. Mobile UX first - smooth touch controls are critical
2. Visual polish - "juice" in animations and feedback
3. Performance - maintain 60 FPS target on mobile devices
4. Simplicity - constraint breeds creativity, avoid feature bloat
5. Frictionless sharing - one-click screenshot and social sharing