# Tiny World Builder

A browser-based 3D diorama creator featuring low-poly cell-shaded aesthetics. Create, customize, and share tiny worlds on floating islands with an intuitive 3D editor.

## ✨ Features

- **3D World Editor**: Build beautiful dioramas with floating islands
- **Object Placement**: Add trees, structures, and decorations
- **Cell-Shaded Graphics**: Beautiful low-poly aesthetic with modern rendering
- **Community Gallery**: Browse and get inspired by other creators' worlds
- **Share & Export**: Save your creations and share them with the community
- **Responsive Design**: Works on both desktop and mobile devices

## 🚀 Tech Stack

### Core Technologies
- **Next.js 15** - App router with server components
- **TypeScript** - Full type safety across the stack
- **Tailwind CSS** - Modern UI with glass-morphism effects
- **Drizzle ORM** - Database management with PostgreSQL
- **tRPC** - Type-safe API routes
- **Zustand** - State management

### 3D & Graphics
- **Three.js** - Core 3D engine
- **@react-three/fiber** - React renderer for Three.js
- **@react-three/drei** - Helper components and controls
- **@react-three/postprocessing** - Visual effects and post-processing

### Database & Infrastructure
- **PostgreSQL** - Store world data and user creations
- **Drizzle Kit** - Database migrations and management

## 🏗️ Project Structure

```
src/
├── app/                    # Next.js app router
│   ├── page.tsx           # Landing page with featured worlds
│   ├── create/            # 3D world editor
│   └── api/               # API routes (tRPC)
├── components/
│   ├── editor/            # 3D editor components
│   │   ├── Canvas.tsx     # R3F canvas wrapper
│   │   ├── Scene.tsx      # Main 3D scene
│   │   ├── Island.tsx     # Base island mesh
│   │   └── PlacementSystem.tsx # Object placement logic
│   ├── ui/                # UI components
│   │   ├── Toolbar.tsx    # Editor toolbar
│   │   ├── DropdownMenu.tsx # Object selection menu
│   │   └── TimeOfDayPicker.tsx # Lighting presets
│   └── three/             # Three.js objects and materials
├── lib/                   # Utilities and store
└── server/                # Backend API and database
```

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ or Bun
- PostgreSQL database

### Installation

1. Clone the repository:
```bash
git clone <your-repo-url>
cd tiny-world
```

2. Install dependencies:
```bash
bun install
# or
npm install
```

3. Set up your environment variables:
```bash
cp .env.example .env.local
# Edit .env.local with your database credentials
```

4. Set up the database:
```bash
bun run db:generate
bun run db:push
```

5. Start the development server:
```bash
bun run dev
# or
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the app.

## 🎮 Usage

1. **Create a World**: Navigate to `/create` to start building
2. **Place Objects**: Use the radial menu to select and place objects
3. **Customize**: Adjust lighting, time of day, and object positions
4. **Save & Share**: Save your creation and share it with the community
5. **Explore**: Browse the gallery to see other creators' worlds

## 🗄️ Database Commands

- `bun run db:generate` - Generate new migrations
- `bun run db:migrate` - Run database migrations
- `bun run db:push` - Push schema changes to database
- `bun run db:studio` - Open Drizzle Studio

## 🛠️ Development

- `bun run dev` - Start development server
- `bun run build` - Build for production
- `bun run lint` - Run ESLint
- `bun run typecheck` - Run TypeScript compiler
- `bun run format:write` - Format code with Prettier

## 📱 Features in Development

- User authentication and profiles
- Advanced object customization
- World templates and presets
- Social features (likes, comments)
- Mobile-optimized controls

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🙏 Acknowledgments

Built with the [T3 Stack](https://create.t3.gg/) - a full-stack, type-safe, web development framework.
