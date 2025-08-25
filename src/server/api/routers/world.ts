import { z } from "zod";

import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { worlds, shares } from "~/server/db/schema";
import { eq, desc, sql } from "drizzle-orm";

export const worldRouter = createTRPCRouter({
  // Get a specific world by ID
  get: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const world = await ctx.db.query.worlds.findFirst({
        where: eq(worlds.id, input.id),
      });
      return world;
    }),

  // Get latest/featured worlds for gallery
  getFeatured: publicProcedure
    .input(z.object({ limit: z.number().min(1).max(50).default(12) }))
    .query(async ({ ctx, input }) => {
      const featuredWorlds = await ctx.db.query.worlds.findMany({
        where: eq(worlds.featured, true),
        orderBy: [desc(worlds.views), desc(worlds.created)],
        limit: input.limit,
      });
      return featuredWorlds;
    }),

  // Get recent worlds
  getRecent: publicProcedure
    .input(z.object({ limit: z.number().min(1).max(50).default(20) }))
    .query(async ({ ctx, input }) => {
      const recentWorlds = await ctx.db.query.worlds.findMany({
        orderBy: [desc(worlds.created)],
        limit: input.limit,
      });
      return recentWorlds;
    }),

  // Create a new world
  create: publicProcedure
    .input(
      z.object({
        name: z.string().min(1).max(100),
        data: z.any(), // Accept any structured data (SerializedWorld)
        screenshot: z.string().optional(),
        userId: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const [world] = await ctx.db
        .insert(worlds)
        .values({
          name: input.name,
          data: input.data,
          screenshot: input.screenshot,
          userId: input.userId,
        })
        .returning();

      return world;
    }),

  // Update an existing world
  update: publicProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().min(1).max(100).optional(),
        data: z.any().optional(), // Accept any structured data (SerializedWorld)
        screenshot: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...updateData } = input;
      const [world] = await ctx.db
        .update(worlds)
        .set(updateData)
        .where(eq(worlds.id, id))
        .returning();

      return world;
    }),

  // Delete a world
  delete: publicProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.delete(worlds).where(eq(worlds.id, input.id));
      return { success: true };
    }),

  // Increment view count
  incrementViews: publicProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const [world] = await ctx.db
        .update(worlds)
        .set({ views: sql`${worlds.views} + 1` })
        .where(eq(worlds.id, input.id))
        .returning();
      return world;
    }),

  // Get world by share code
  getByShareCode: publicProcedure
    .input(z.object({ shortCode: z.string() }))
    .query(async ({ ctx, input }) => {
      const share = await ctx.db.query.shares.findFirst({
        where: eq(shares.shortCode, input.shortCode),
      });

      if (!share) return null;

      // Manually fetch the world data
      const world = await ctx.db.query.worlds.findFirst({
        where: eq(worlds.id, share.worldId),
      });

      return world;
    }),

  // Create share for a world
  createShare: publicProcedure
    .input(z.object({ worldId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // Generate a 6-character short code
      const shortCode = Math.random()
        .toString(36)
        .substring(2, 8)
        .toUpperCase();

      const [share] = await ctx.db
        .insert(shares)
        .values({
          worldId: input.worldId,
          shortCode,
        })
        .returning();

      return share;
    }),
});
