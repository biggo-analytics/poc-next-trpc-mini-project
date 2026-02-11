import { z } from "zod";
import { router, publicProcedure } from "../trpc";
import { TRPCError } from "@trpc/server";

// ============================================================
// Input Schemas
// ============================================================

const upsertProfileInput = z.object({
  userId: z.string().cuid(),
  bio: z.string().max(500).optional(),
  avatar: z.string().url("Invalid URL").optional(),
  website: z.string().url("Invalid URL").optional(),
});

// ============================================================
// Router
// ============================================================

export const profileRouter = router({
  /** Get profile by user ID */
  getByUser: publicProcedure
    .input(z.object({ userId: z.string().cuid() }))
    .query(async ({ ctx, input }) => {
      const profile = await ctx.prisma.profile.findUnique({
        where: { userId: input.userId },
        include: {
          user: {
            select: { id: true, name: true, email: true, role: true },
          },
        },
      });

      if (!profile) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: `Profile for user ${input.userId} not found`,
        });
      }

      return profile;
    }),

  /** Upsert profile - create or update (1:1 relation pattern) */
  upsert: publicProcedure
    .input(upsertProfileInput)
    .mutation(async ({ ctx, input }) => {
      const { userId, ...data } = input;

      // Verify user exists
      const user = await ctx.prisma.user.findUnique({
        where: { id: userId, deletedAt: null },
      });

      if (!user) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "User not found",
        });
      }

      return ctx.prisma.profile.upsert({
        where: { userId },
        create: { userId, ...data },
        update: data,
        include: {
          user: {
            select: { id: true, name: true, email: true, role: true },
          },
        },
      });
    }),
});
