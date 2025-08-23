# Animal Orientation Testing Instructions

## 🧪 Test Components Added

Two debug components have been added to the scene to investigate deer orientation issues:

### 1. `AnimalOrientationTest` (Red Sphere at position [0, 8, 0])
- **Click the red sphere** to run comprehensive orientation tests
- Tests surface normal calculations, initial orientation logic, and live deer analysis
- Results appear in browser console

### 2. `IdleOrientationTest` (Blue Cube at position [0, 9, 0])
- **Click the blue cube** to start monitoring deer orientation during idle states
- **Yellow sphere** (position [1, 9, 0]): Test idle bounce animation logic
- **Purple cylinder** (position [2, 9, 0]): Analyze root cause of orientation issue
- Real-time monitoring shows upright alignment values in console

## 🦌 How to Run Tests

1. **Start the app**: Navigate to `http://localhost:3001`
2. **Spawn a deer**: Wait for automatic deer spawning (1-5 seconds) or use browser console:
   ```javascript
   window.testDeerSpawn()
   ```
3. **Run tests**: Click the colored test objects in the 3D scene
4. **Check console**: Open browser DevTools (F12) → Console tab to see detailed results

## 🔍 Expected Findings

The tests should confirm the hypothesis:

**Root Cause**: In `DeerPhysics.tsx:191-195`, during idle state bounce animation:
```typescript
const adjustedPosition = currentPosition.clone().normalize().multiplyScalar(idealSurfaceDistance);
body.setTranslation(adjustedPosition, true); // ❌ Updates position but ignores rotation
```

**Symptoms**:
- Deer start upright (upright alignment ~1.0)
- During idle state, alignment drops (<0.8)
- Bounce animation modifies position without preserving orientation

## 🔧 Next Steps

Once the issue is confirmed by tests, the fix involves either:
1. Disabling bounce during true idle state
2. Preserving rotation when updating position
3. Adding orientation correction after position updates

## 🧹 Cleanup

After testing, remove the debug components from `Scene.tsx`:
```typescript
// Remove these lines:
import { AnimalOrientationTest } from '~/components/debug/AnimalOrientationTest';
import { IdleOrientationTest } from '~/components/debug/IdleOrientationTest';
// and
<AnimalOrientationTest />
<IdleOrientationTest />
```