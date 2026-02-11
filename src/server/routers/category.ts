import { z } from "zod";
import { router, publicProcedure } from "../trpc";
import { TRPCError } from "@trpc/server";

// ============================================================
// Input Schemas
// ============================================================

const createCategoryInput = z.object({
  name: z.string().min(1, "Name is required").max(100),
  slug: z
    .string()
    .min(1)
    .max(100)
    .regex(/^[a-z0-9-]+$/, "Slug must be lowercase alphanumeric with hyphens"),
});

const updateCategoryInput = z.object({
  id: z.string().cuid(),
  name: z.string().min(1).max(100).optional(),
  slug: z
    .string()
    .min(1)
    .max(100)
    .regex(/^[a-z0-9-]+$/)
    .optional(),
});

// ============================================================
// Router
// ============================================================

export const categoryRouter = router({
  /** List all categories with post count */
  list: publicProcedure.query(async ({ ctx }) => {
    return ctx.prisma.category.findMany({
      orderBy: { name: "asc" },
      include: {
        _count: { select: { posts: true } },
      },
    });
  }),

  /** Get category by ID with associated posts */
  getById: publicProcedure
    .input(z.object({ id: z.string().cuid() }))
    .query(async ({ ctx, input }) => {
      const category = await ctx.prisma.category.findUnique({
        where: { id: input.id },
        include: {
          posts: {
            include: {
              post: {
                select: {
                  id: true,
                  title: true,
                  status: true,
                  createdAt: true,
                  author: { select: { id: true, name: true } },
                },
              },
            },
          },
          _count: { select: { posts: true } },
        },
      });

      if (!category) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: `Category with ID ${input.id} not found`,
        });
      }

      return category;
    }),

  /** Get category by slug */
  getBySlug: publicProcedure
    .input(z.object({ slug: z.string() }))
    .query(async ({ ctx, input }) => {
      const category = await ctx.prisma.category.findUnique({
        where: { slug: input.slug },
        include: {
          _count: { select: { posts: true } },
        },
      });

      if (!category) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: `Category with slug "${input.slug}" not found`,
        });
      }

      return category;
    }),

  /** Create a new category */
  create: publicProcedure
    .input(createCategoryInput)
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.prisma.category.findFirst({
        where: {
          OR: [{ name: input.name }, { slug: input.slug }],
        },
      });

      if (existing) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "Category with this name or slug already exists",
        });
      }

      return ctx.prisma.category.create({
        data: input,
        include: { _count: { select: { posts: true } } },
      });
    }),

  /** Update category */
  update: publicProcedure
    .input(updateCategoryInput)
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;

      const category = await ctx.prisma.category.findUnique({
        where: { id },
      });

      if (!category) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: `Category with ID ${id} not found`,
        });
      }

      // Check for duplicate name/slug
      if (data.name || data.slug) {
        const existing = await ctx.prisma.category.findFirst({
          where: {
            id: { not: id },
            OR: [
              ...(data.name ? [{ name: data.name }] : []),
              ...(data.slug ? [{ slug: data.slug }] : []),
            ],
          },
        });

        if (existing) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "Category with this name or slug already exists",
          });
        }
      }

      return ctx.prisma.category.update({
        where: { id },
        data,
        include: { _count: { select: { posts: true } } },
      });
    }),

  /** Delete category */
  delete: publicProcedure
    .input(z.object({ id: z.string().cuid() }))
    .mutation(async ({ ctx, input }) => {
      const category = await ctx.prisma.category.findUnique({
        where: { id: input.id },
        include: { _count: { select: { posts: true } } },
      });

      if (!category) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: `Category with ID ${input.id} not found`,
        });
      }

      if (category._count.posts > 0) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "Cannot delete category that has associated posts",
        });
      }

      return ctx.prisma.category.delete({
        where: { id: input.id },
      });
    }),
});
