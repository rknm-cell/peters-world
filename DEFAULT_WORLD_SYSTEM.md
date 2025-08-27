# Default World System

This system allows you to create and manage a default world that new users see when they first visit the application.

## How It Works

1. **New Users**: When a user visits for the first time (no localStorage data), they automatically get a curated default world with trees, animals, grass, and decorations.

2. **Returning Users**: Users who have saved worlds get their previous work restored from localStorage.

3. **Development**: Developers can easily capture the current world state as a new default template.

## Usage

### For New Users
- Visit `/create` or `/` (home page)
- If no saved data exists, you'll see: "🌟 Welcome! Default world loaded"
- The world will contain a starter set of objects to explore and build upon

### For Developers - Capturing a New Default World

1. **Run the development server**:
   ```bash
   bun run dev
   ```

2. **Create your ideal starter world**:
   - Go to `http://localhost:3000/create`
   - Place trees, animals, grass, decorations, etc.
   - Adjust terrain if needed
   - Set the desired time of day

3. **Capture the world**:
   - Click the "Capture Default" button (bottom-right, only visible in development)
   - This will:
     - Log the template to console
     - Copy it to clipboard
     - Download it as a JSON file

4. **Update the default template**:
   - Copy the generated template
   - Replace the contents of `src/lib/default/default-world-template.json`
   - The new default will be used for all new users

### Alternative Capture Method
The capture functionality is primarily available through the UI button. The console method has been removed to maintain TypeScript safety and code quality.

## Files Involved

- `src/lib/utils/default-world.ts` - Contains the default world template and utilities
- `src/lib/hooks/useWorldPersistence.ts` - Handles loading default world for new users
- `src/lib/store.ts` - Added `loadDefaultWorld` action
- `src/components/ui/DefaultWorldCapture.tsx` - Development UI for capturing worlds
- `src/app/create/page.tsx` - Shows capture button and default world indicator

## Default World Content

The current default world includes **85 objects** from a curated template:
- 🌳 Multiple trees of various types with lifecycle data and forest formations
- 🌱 Grass patches distributed naturally across the terrain
- 🦌 Various animals including deer and other creatures
- 🌸 Decorative elements like flowers and mushrooms
- 🗻 Terraformed terrain with varied topology
- ☀️ Daytime lighting
- 💧 Water features and terrain modifications

## Customization

To customize the default world:

1. Use the capture system to create a new world template (see above)
2. Or directly edit `src/lib/default/default-world-template.json`
3. Add/remove/modify objects in the `objects` array
4. Adjust terrain, environment settings
5. Update object positions, rotations, scales as needed

The JSON file is automatically loaded when the application starts.

## Technical Details

- Uses the same serialization system as world saving/loading
- Tree lifecycle timestamps are randomized to create variety
- Only loads default world if no localStorage data exists
- Development helpers are only available in development mode
- Integrates seamlessly with the existing world persistence system
