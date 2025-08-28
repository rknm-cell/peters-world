# Peter's World 🌍

A browser-based 3D world builder where you can create, customize, and explore beautiful floating island dioramas. Build your own tiny world with an intuitive 3D editor featuring low-poly aesthetics, realistic physics, and living ecosystems.

## ✨ Features

- **🌍 3D World Editor**: Create stunning floating island worlds with intuitive controls
- **🏗️ Object Placement**: Add trees, animals, structures, and decorations to your world
- **🎨 Beautiful Graphics**: Low-poly, cell-shaded aesthetic with modern 3D rendering
- **🌱 Living Ecosystems**: Watch as trees grow, animals roam, and grass spreads naturally
- **📱 Mobile Optimized**: Touch-friendly controls that work on all devices
- **💾 Auto-Save**: Your world is automatically saved and restored between sessions
- **🌊 Water Effects**: Add lakes and rivers with realistic water physics
- **🌅 Dynamic Lighting**: Adjust time of day and lighting to set the perfect mood
- **📸 Screenshot Capture**: Save and share your creations with the community

## 🚀 Tech Stack

### Core Technologies
- **Next.js 15** - Modern React framework with App Router
- **TypeScript** - Full type safety across the entire stack
- **Bun** - Fast JavaScript runtime and package manager
- **Tailwind CSS** - Utility-first CSS framework with glass-morphism effects

### 3D & Graphics
- **Three.js** - Powerful 3D graphics engine
- **React Three Fiber** - React renderer for Three.js
- **React Three Drei** - Useful helpers and abstractions
- **React Three Rapier** - Physics integration for realistic movement
- **React Three Postprocessing** - Visual effects and post-processing

### Backend & Database
- **PostgreSQL** - Robust database for world data and user creations
- **Drizzle ORM** - Type-safe database management
- **tRPC** - End-to-end type-safe APIs
- **Zustand** - Lightweight state management

## 🏗️ Project Structure

```
src/
├── app/                    # Next.js app router
│   ├── page.tsx           # Main landing page with 3D world
│   ├── create/            # 3D world editor
│   └── world/[shareCode]  # Shared world viewer
├── components/
│   ├── editor/            # Core 3D editing components
│   │   ├── Canvas.tsx     # React Three Fiber canvas
│   │   ├── Scene.tsx      # Main 3D scene orchestration
│   │   ├── CameraController.tsx # Mobile-friendly camera controls
│   │   └── PlacementSystem.tsx # Object placement logic
│   ├── three/             # Three.js specific components
│   │   ├── objects/       # 3D objects (trees, animals, etc.)
│   │   ├── physics/       # Physics-based components
│   │   ├── systems/       # Lifecycle management systems
│   │   └── effects/       # Visual effects and materials
│   └── ui/                # User interface components
├── lib/                   # Utilities, hooks, and store
└── server/                # Backend API and database
```

## 🚀 Getting Started

### Prerequisites
- **Node.js 18+** or **Bun** (recommended)
- **PostgreSQL** database

### Installation

1. **Clone the repository:**
   ```bash
   git clone <your-repo-url>
   cd peters-world
   ```

2. **Install dependencies:**
   ```bash
   bun install
   # or
   npm install
   ```

3. **Set up environment variables:**
   ```bash
   cp .env.example .env.local
   # Edit .env.local with your database credentials
   ```

4. **Set up the database:**
   ```bash
   bun run db:generate
   bun run db:push
   ```

5. **Start the development server:**
   ```bash
   bun run dev
   # or
   npm run dev
   ```

Open [http://localhost:3000](http://localhost:3000) to start building your world!

## 🎮 How to Use

### Creating Your World
1. **Navigate to the main page** - You'll see a beautiful 3D world
2. **Click "Start Building Now"** to enter the editor
3. **Use the toolbar** to select objects (trees, animals, decorations)
4. **Click anywhere** on the floating island to place objects
5. **Adjust camera** with touch/mouse controls
6. **Watch your world come alive** as animals roam and trees grow

### Controls
- **Mouse/Touch**: Rotate camera and place objects
- **Scroll/Pinch**: Zoom in and out
- **Right-click/Double-tap**: Context menu for object actions
- **Toolbar**: Select different object types and tools

## 🗄️ Database Management

- `bun run db:generate` - Generate new database migrations
- `bun run db:migrate` - Run database migrations
- `bun run db:push` - Push schema changes to database
- `bun run db:studio` - Open Drizzle Studio for database management

## 🛠️ Development Commands

- `bun run dev` - Start development server
- `bun run build` - Build for production
- `bun run lint` - Run ESLint for code quality
- `bun run typecheck` - Run TypeScript compiler
- `bun run format:write` - Format code with Prettier
- `bun run ci` - Run full CI pipeline

## 🌟 Key Features in Detail

### Living Ecosystems
- **Trees**: Plant trees that grow over time and can reproduce
- **Animals**: Add deer, wolves, and other creatures that move realistically
- **Grass**: Watch as grass spreads naturally across your world
- **Physics**: Realistic movement and collision detection

### World Building Tools
- **Terraforming**: Modify terrain height and add water features
- **Object Library**: Extensive collection of 3D models
- **Lighting System**: Dynamic day/night cycles and atmospheric effects
- **Water Physics**: Realistic water simulation with ripples and reflections

### Performance & Optimization
- **Spatial Partitioning**: Efficient rendering for large worlds
- **Level of Detail**: Objects adapt detail based on camera distance
- **Render Queue**: Optimized rendering pipeline
- **Mobile Optimization**: Touch-friendly controls and performance tuning

## 🚧 Features in Development

- User authentication and profiles
- Advanced object customization and materials
- World templates and presets
- Social features (likes, comments, sharing)
- Collaborative world editing
- Advanced weather systems
- Sound effects and ambient audio

## 🤝 Contributing

We welcome contributions to Peter's World! Here's how you can help:

1. **Fork the repository**
2. **Create a feature branch** (`git checkout -b feature/amazing-feature`)
3. **Make your changes** and add tests if applicable
4. **Commit your changes** (`git commit -m 'Add amazing feature'`)
5. **Push to the branch** (`git push origin feature/amazing-feature`)
6. **Open a Pull Request**

### Development Guidelines
- Follow TypeScript best practices
- Use explicit types instead of `any`
- Follow the existing code style and formatting
- Add tests for new features
- Update documentation as needed

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Built with the [T3 Stack](https://create.t3.gg/) - a full-stack, type-safe web development framework
- 3D models and assets from various open-source contributors
- Inspired by the creativity of world-building communities

## 🌍 Join the Community

- **Share your worlds** with the community
- **Get inspired** by other creators
- **Report bugs** and suggest features
- **Contribute** to make Peter's World even better

---

**Start building your world today at [Peter's World](https://peters-world.com)** 🌟
