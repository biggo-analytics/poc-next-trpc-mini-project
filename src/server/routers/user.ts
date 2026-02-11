import { z } from "zod";
import { router, publicProcedure } from "../trpc";
import { TRPCError } from "@trpc/server";

// ============================================================
// Input Schemas
// ============================================================

const createUserInput = z.object({
  email: z.string().email("Invalid email format"),
  name: z.string().min(1, "Name is required").optional(),
  role: z.enum(["ADMIN", "USER"]).default("USER"),
});

const updateUserInput = z.object({
  id: z.string().cuid(),
  email: z.string().email("Invalid email format").optional(),
  name: z.string().min(1).optional(),
  role: z.enum(["ADMIN", "USER"]).optional(),
});

const listUsersInput = z.object({
  page: z.number().int().positive().default(1),
  limit: z.number().int().positive().max(100).default(10),
  search: z.string().optional(),
  role: z.enum(["ADMIN", "USER"]).optional(),
});

// ============================================================
// Router
// ============================================================

export const userRouter = router({
  /** List users with offset pagination and search */
  list: publicProcedure.input(listUsersInput).query(async ({ ctx, input }) => {
    const { page, limit, search, role } = input;
    const skip = (page - 1) * limit;

    const where = {
      deletedAt: null,
      ...(search && {
        OR: [
          { name: { contains: search, mode: "insensitive" as const } },
          { email: { contains: search, mode: "insensitive" as const } },
        ],
      }),
      ...(role && { role }),
    };

    const [items, total] = await Promise.all([
      ctx.prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          profile: true,
          _count: { select: { posts: true, comments: true } },
        },
      }),
      ctx.prisma.user.count({ where }),
    ]);

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }),

  /** Get user by ID with all relations */
  getById: publicProcedure
    .input(z.object({ id: z.string().cuid() }))
    .query(async ({ ctx, input }) => {
      const user = await ctx.prisma.user.findUnique({
        where: { id: input.id, deletedAt: null },
        include: {
          profile: true,
          posts: {
            where: { deletedAt: null },
            orderBy: { createdAt: "desc" },
            take: 10,
          },
          _count: { select: { posts: true, comments: true } },
        },
      });

      if (!user) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: `User with ID ${input.id} not found`,
        });
      }

      return user;
    }),

  /** Create a new user */
  create: publicProcedure
    .input(createUserInput)
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.prisma.user.findUnique({
        where: { email: input.email },
      });

      if (existing) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "User with this email already exists",
        });
      }

      return ctx.prisma.user.create({
        data: input,
        include: { profile: true },
      });
    }),

  /** Update user */
  update: publicProcedure
    .input(updateUserInput)
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;

      const user = await ctx.prisma.user.findUnique({
        where: { id, deletedAt: null },
      });

      if (!user) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: `User with ID ${id} not found`,
        });
      }

      if (data.email) {
        const existing = await ctx.prisma.user.findFirst({
          where: { email: data.email, id: { not: id } },
        });
        if (existing) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "Email already in use",
          });
        }
      }

      return ctx.prisma.user.update({
        where: { id },
        data,
        include: { profile: true },
      });
    }),

  /** Soft delete user */
  delete: publicProcedure
    .input(z.object({ id: z.string().cuid() }))
    .mutation(async ({ ctx, input }) => {
      const user = await ctx.prisma.user.findUnique({
        where: { id: input.id, deletedAt: null },
      });

      if (!user) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: `User with ID ${input.id} not found`,
        });
      }

      return ctx.prisma.user.update({
        where: { id: input.id },
        data: { deletedAt: new Date() },
      });
    }),
});
