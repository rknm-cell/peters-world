"use client";

import Link from "next/link";
import { api } from "~/trpc/react";

export function FeaturedWorlds() {
  const { data: featuredWorlds, isLoading, error } = api.world.getFeatured.useQuery({ limit: 6 });

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="bg-white/10 rounded-lg p-4 animate-pulse">
            <div className="h-32 bg-white/20 rounded mb-3"></div>
            <div className="h-4 bg-white/20 rounded w-3/4 mb-2"></div>
            <div className="h-3 bg-white/20 rounded w-1/2"></div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-red-400">Failed to load featured worlds</p>
        <p className="text-sm text-gray-400 mt-2">{error.message}</p>
      </div>
    );
  }

  if (!featuredWorlds || featuredWorlds.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-400">No featured worlds yet</p>
        <p className="text-sm text-gray-500 mt-2">Be the first to create something amazing!</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {featuredWorlds.map((world) => (
        <Link
          key={world.id}
          href={`/world/${world.id}`}
          className="bg-white/10 rounded-lg p-4 hover:bg-white/20 transition-colors group"
        >
          <div className="aspect-square bg-gradient-to-br from-blue-400/20 to-purple-400/20 rounded mb-3 flex items-center justify-center">
            {world.screenshot ? (
              <img
                src={world.screenshot}
                alt={world.name}
                className="w-full h-full object-cover rounded"
              />
            ) : (
              <div className="text-4xl text-white/40">🌍</div>
            )}
          </div>
          <h3 className="font-semibold text-lg mb-1 group-hover:text-purple-300 transition-colors">
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
