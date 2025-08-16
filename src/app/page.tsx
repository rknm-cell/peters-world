import Link from "next/link";

import { FeaturedWorlds } from "~/app/_components/featured-worlds";
import { HydrateClient } from "~/trpc/server";

export default function Home() {
  return (
    <HydrateClient>
      <main className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-[#2e026d] to-[#15162c] text-white">
        <div className="container flex flex-col items-center justify-center gap-12 px-4 py-16">
          <h1 className="text-5xl font-extrabold tracking-tight sm:text-[5rem]">
            Tiny <span className="text-[hsl(280,100%,70%)]">World</span> Builder
          </h1>
          <p className="max-w-2xl text-center text-xl">
            Create beautiful 3D dioramas with our intuitive world builder.
            Design floating islands, place objects, and share your creations
            with the community.
          </p>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:gap-8">
            <Link
              className="flex max-w-xs flex-col gap-4 rounded-xl bg-white/10 p-4 transition-colors hover:bg-white/20"
              href="/create"
            >
              <h3 className="text-2xl font-bold">Create World →</h3>
              <div className="text-lg">
                Start building your own tiny world with our 3D editor. Place
                trees, structures, and decorations on floating islands.
              </div>
            </Link>
            <Link
              className="flex max-w-xs flex-col gap-4 rounded-xl bg-white/10 p-4 transition-colors hover:bg-white/20"
              href="/gallery"
            >
              <h3 className="text-2xl font-bold">Browse Gallery →</h3>
              <div className="text-lg">
                Explore amazing worlds created by the community. Get inspired
                and discover new building techniques.
              </div>
            </Link>
          </div>

          <div className="w-full max-w-4xl">
            <h2 className="mb-8 text-center text-2xl font-bold">
              Featured Worlds
            </h2>
            <FeaturedWorlds />
          </div>
        </div>
      </main>
    </HydrateClient>
  );
}
