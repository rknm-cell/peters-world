# Micro World Builder - Project Specification
## T3 Stack Implementation with Cell-Shaded 3D Editor

### Project Overview
A browser-based 3D diorama creator featuring low-poly cell-shaded aesthetics, built with modern web technologies. Users can create, customize, and share tiny worlds on floating islands with intuitive touch/mouse controls.

---

## Tech Stack

### Core T3 Stack
- **Next.js 14** - App router, server components for gallery/landing pages
- **TypeScript** - Full type safety across the stack
- **Tailwind CSS** - UI components and glass-morphism panels
- **Prisma** - Database ORM for saved worlds
- **tRPC** - Type-safe API routes
- **NextAuth.js** - Optional authentication for saving/sharing

### 3D & Graphics
- **Three.js** (r160+) - Core 3D engine
- **@react-three/fiber** - React renderer for Three.js
- **@react-three/drei** - Helper components (OrbitControls, etc.)
- **@react-three/postprocessing** - Outline effects, FXAA
- **Zustand** - 3D scene state management

### Infrastructure
- **PostgreSQL** (via Supabase/Neon) - Store world data
- **Vercel** - Deployment and edge functions
- **R2/S3** - Screenshot storage
- **Sharp** - Server-side image optimization

---

## Database Schema

```prisma
model World {
  id          String   @id @default(cuid())
  name        String
  data        Json     // Serialized object positions/rotations
  screenshot  String?  // URL to screenshot
  userId      String?
  created     DateTime @default(now())
  updated     DateTime @updatedAt
  views       Int      @default(0)
  featured    Boolean  @default(false)
  
  user        User?    @relation(fields: [userId], references: [id])
  shares      Share[]
}

model Share {
  id          String   @id @default(cuid())
  worldId     String
  shortCode   String   @unique // 6-char share code
  created     DateTime @default(now())
  
  world       World    @relation(fields: [worldId], references: [id])
}

model User {
  id          String   @id @default(cuid())
  email       String   @unique
  name        String?
  worlds      World[]
}
```

---

## Project Structure

```
src/
├── app/
│   ├── page.tsx                 // Landing with featured worlds
│   ├── create/
│   │   └── page.tsx             // Main editor (client component)
│   ├── gallery/
│   │   └── page.tsx             // Browse community worlds
│   ├── world/[id]/
│   │   └── page.tsx             // View/fork specific world
│   └── api/
│       ├── trpc/[trpc]/route.ts
│       └── screenshot/route.ts  // Edge function for screenshots
│
├── components/
│   ├── editor/
│   │   ├── Canvas.tsx           // R3F canvas wrapper
│   │   ├── Scene.tsx            // Main 3D scene
│   │   ├── Island.tsx           // Base island mesh
│   │   ├── PlacementSystem.tsx  // Object placement logic
│   │   └── CameraController.tsx // Mobile-friendly controls
│   ├── ui/
│   │   ├── RadialMenu.tsx      // Object selection menu
│   │   ├── TimeOfDayPicker.tsx // Weather/lighting presets
│   │   ├── Toolbar.tsx         // Save/share/screenshot
│   │   └── GlassPanel.tsx      // Reusable glass-morphism container
│   └── three/
│       ├── materials/
│       │   └── CellShadedMaterial.ts
│       ├── objects/              // All placeable objects
│       │   ├── trees/
│       │   ├── structures/
│       │   └── decorations/
│       └── effects/
│           ├── OutlinePass.ts
│           └── ParticleSystem.ts
│
├── lib/
│   ├── store.ts                 // Zustand store
│   ├── constants.ts             // Color palettes, limits
│   └── utils/
│       ├── screenshot.ts        // Client-side canvas capture
│       ├── serialization.ts     // World data compression
│       └── mobile.ts            // Touch/gyro utilities
│
├── server/
│   ├── api/
│   │   ├── routers/
│   │   │   ├── world.ts        // CRUD operations
│   │   │   └── gallery.ts      // Public world queries
│   │   └── root.ts
│   └── db.ts
│
└── styles/
    └── globals.css              // Tailwind + custom properties
```

---

## Core Features - Week 1 Scope

### Day 1-2: Foundation
- [ ] T3 stack setup with PostgreSQL
- [ ] Basic Three.js scene with OrbitControls
- [ ] Island mesh with cell shader material
- [ ] Responsive canvas sizing

### Day 3-4: Object System
- [ ] 10 low-poly objects (5 trees, 3 structures, 2 decorations)
- [ ] Radial menu UI with Tailwind
- [ ] Placement system with raycasting
- [ ] Object selection/deletion

### Day 5: Polish & Effects
- [ ] 3 time-of-day presets (day/sunset/night)
- [ ] Outline effect on hover/selection
- [ ] Simple particle system (fireflies/leaves)
- [ ] Mobile touch controls

### Day 6: Persistence
- [ ] Save/load worlds to database
- [ ] Screenshot generation
- [ ] Share URL with short codes
- [ ] Gallery page with featured worlds

### Day 7: Final Polish
- [ ] Loading states and error handling
- [ ] Performance optimization
- [ ] SEO and Open Graph tags
- [ ] Deployment to Vercel

---

## Technical Implementation Details

### Cell Shading Setup
```typescript
// Custom toon material with 3-step gradient
const cellShadedMaterial = new THREE.MeshToonMaterial({
  color: palette.primary,
  gradientMap: createGradientMap(['#ffffff', palette.primary, palette.shadow])
});

// Outline using inverted hull method
const outlineGeometry = geometry.clone();
const outlineMaterial = new THREE.MeshBasicMaterial({
  color: '#2C5F2D',
  side: THREE.BackSide
});
```

### Mobile Controls
```typescript
// Gesture handling priorities
1. Single touch: Orbit camera
2. Pinch: Zoom
3. Tap: Place object / Open menu
4. Long press: Delete object
5. Two-finger rotate: Rotate selected object
```

### Performance Targets
- **Mobile**: 60 FPS on iPhone 12/equivalent
- **Desktop**: 120+ FPS
- **Load time**: < 2s for editor
- **Max objects**: 50 (with instancing)
- **Bundle size**: < 500KB for 3D assets

### State Management
```typescript
interface WorldState {
  objects: PlacedObject[]
  selectedObject: string | null
  timeOfDay: 'day' | 'sunset' | 'night'
  isPlacing: boolean
  
  // Actions
  addObject: (type: ObjectType, position: Vector3) => void
  removeObject: (id: string) => void
  updateTimeOfDay: (time: TimeOfDay) => void
}
```

---

## API Endpoints (tRPC)

```typescript
// World procedures
world.create    // Save new world
world.get       // Fetch by ID
world.update    // Update existing
world.delete    // Remove world
world.fork      // Copy another user's world

// Gallery procedures  
gallery.getFeatured     // Curated worlds
gallery.getRecent       // Latest creations
gallery.getByUser       // User's portfolio
```

---

## Deployment Strategy

1. **Environment Variables**
```env
DATABASE_URL=
NEXTAUTH_SECRET=
NEXTAUTH_URL=
R2_ACCESS_KEY=
R2_SECRET_KEY=
R2_BUCKET_URL=
```

2. **Vercel Configuration**
- Edge runtime for screenshot API
- ISR for gallery pages (revalidate: 60s)
- Static generation for landing page

3. **Database Migrations**
```bash
npx prisma migrate deploy
npx prisma generate
```

---

## Future Enhancements (Post-Week 1)

- **Social Features**: Likes, comments, following
- **Advanced Objects**: Animated elements, water, bridges
- **Procedural Generation**: "Randomize" button with coherent layouts
- **Export Options**: GLB download, high-res renders
- **Collaborative Mode**: Real-time multi-user editing
- **Asset Pipeline**: User-uploaded objects (with moderation)
- **Progressive Web App**: Offline mode with IndexedDB

---

## Success Metrics

- Clean, maintainable code architecture
- Smooth 60 FPS on target devices
- Intuitive UX requiring no tutorial
- Visually cohesive aesthetic
- < 5s to create first diorama
- Social sharing generates return visits

---

## Developer Notes

- Prioritize mobile UX - most users will discover via social media on phones
- Keep the editor simple - constraint breeds creativity
- Focus on "juice" - satisfying placement sounds, smooth transitions
- Make sharing frictionless - one click to screenshot and share
- Default scenes should look good - users judge in first 10 seconds