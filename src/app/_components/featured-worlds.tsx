"use client";

import Link from "next/link";
import Image from "next/image";
import { api } from "~/trpc/react";

export function FeaturedWorlds() {
  const {
    data: featuredWorlds,
    isLoading,
    error,
  } = api.world.getFeatured.useQuery({ limit: 6 });

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="animate-pulse rounded-lg bg-white/10 p-4">
            <div className="mb-3 h-32 rounded bg-white/20"></div>
            <div className="mb-2 h-4 w-3/4 rounded bg-white/20"></div>
            <div className="h-3 w-1/2 rounded bg-white/20"></div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-8 text-center">
        <p className="text-red-400">Failed to load featured worlds</p>
        <p className="mt-2 text-sm text-gray-400">{error.message}</p>
      </div>
    );
  }

  if (!featuredWorlds || featuredWorlds.length === 0) {
    return (
      <div className="py-8 text-center">
        <p className="text-gray-400">No featured worlds yet</p>
        <p className="mt-2 text-sm text-gray-500">
          Be the first to create something amazing!
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {featuredWorlds.map((world) => (
        <Link
          key={world.id}
          href={`/world/${world.id}`}
          className="group rounded-lg bg-white/10 p-4 transition-colors hover:bg-white/20"
        >
          <div className="mb-3 flex aspect-square items-center justify-center rounded bg-gradient-to-br from-blue-400/20 to-purple-400/20">
            {world.screenshot ? (
              <Image
                src={world.screenshot}
                alt={world.name}
                width={300}
                height={300}
                className="h-full w-full rounded object-cover"
              />
            ) : (
              <div className="text-4xl text-white/40">🌍</div>
            )}
          </div>
          <h3 className="mb-1 text-lg font-semibold transition-colors group-hover:text-purple-300">
            {world.name}
          </h3>
          <div className="flex items-center justify-between text-sm text-gray-400">
            <span>{world.views} views</span>
            <span>{new Date(world.created).toLocaleDateString()}</span>
          </div>
        </Link>
      ))}
    </div>
  );
}
