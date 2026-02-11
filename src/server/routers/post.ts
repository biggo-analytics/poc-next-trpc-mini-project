import { z } from "zod";
import { router, publicProcedure } from "../trpc";
import { TRPCError } from "@trpc/server";

// ============================================================
// Input Schemas
// ============================================================

const createPostInput = z.object({
  title: z.string().min(1, "Title is required").max(255),
  content: z.string().optional(),
  authorId: z.string().cuid(),
  categoryIds: z.array(z.string().cuid()).optional(),
});

const updatePostInput = z.object({
  id: z.string().cuid(),
  title: z.string().min(1).max(255).optional(),
  content: z.string().optional(),
  categoryIds: z.array(z.string().cuid()).optional(),
});

const listPostsInput = z.object({
  limit: z.number().int().positive().max(100).default(10),
  cursor: z.string().cuid().optional(), // Cursor-based pagination
  status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]).optional(),
  authorId: z.string().cuid().optional(),
  search: z.string().optional(),
});

// ============================================================
// Router
// ============================================================

export const postRouter = router({
  /** List posts with cursor-based pagination */
  list: publicProcedure.input(listPostsInput).query(async ({ ctx, input }) => {
    const { limit, cursor, status, authorId, search } = input;

    const where = {
      deletedAt: null,
      ...(status && { status }),
      ...(authorId && { authorId }),
      ...(search && {
        OR: [
          { title: { contains: search, mode: "insensitive" as const } },
          { content: { contains: search, mode: "insensitive" as const } },
        ],
      }),
    };

    const items = await ctx.prisma.post.findMany({
      where,
      take: limit + 1, // Fetch one extra to determine if there's a next page
      ...(cursor && {
        cursor: { id: cursor },
        skip: 1, // Skip the cursor item
      }),
      orderBy: { createdAt: "desc" },
      include: {
        author: { select: { id: true, name: true, email: true } },
        categories: {
          include: {
            category: true,
          },
        },
        _count: { select: { comments: true } },
      },
    });

    let nextCursor: string | undefined;
    if (items.length > limit) {
      const nextItem = items.pop();
      nextCursor = nextItem?.id;
    }

    return {
      items,
      nextCursor,
    };
  }),

  /** Get post by ID with all relations */
  getById: publicProcedure
    .input(z.object({ id: z.string().cuid() }))
    .query(async ({ ctx, input }) => {
      const post = await ctx.prisma.post.findUnique({
        where: { id: input.id, deletedAt: null },
        include: {
          author: {
            select: { id: true, name: true, email: true, role: true },
          },
          categories: {
            include: { category: true },
          },
          comments: {
            where: { parentId: null }, // Only top-level comments
            orderBy: { createdAt: "desc" },
            include: {
              author: { select: { id: true, name: true } },
              replies: {
                orderBy: { createdAt: "asc" },
                include: {
                  author: { select: { id: true, name: true } },
                },
              },
            },
          },
          _count: { select: { comments: true } },
        },
      });

      if (!post) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: `Post with ID ${input.id} not found`,
        });
      }

      return post;
    }),

  /** Get posts by user */
  getByUser: publicProcedure
    .input(
      z.object({
        userId: z.string().cuid(),
        status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]).optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      return ctx.prisma.post.findMany({
        where: {
          authorId: input.userId,
          deletedAt: null,
          ...(input.status && { status: input.status }),
        },
        orderBy: { createdAt: "desc" },
        include: {
          categories: { include: { category: true } },
          _count: { select: { comments: true } },
        },
      });
    }),

  /** Create a new post */
  create: publicProcedure
    .input(createPostInput)
    .mutation(async ({ ctx, input }) => {
      const { categoryIds, ...postData } = input;

      return ctx.prisma.post.create({
        data: {
          ...postData,
          ...(categoryIds && {
            categories: {
              create: categoryIds.map((categoryId) => ({ categoryId })),
            },
          }),
        },
        include: {
          author: { select: { id: true, name: true } },
          categories: { include: { category: true } },
        },
      });
    }),

  /** Update post */
  update: publicProcedure
    .input(updatePostInput)
    .mutation(async ({ ctx, input }) => {
      const { id, categoryIds, ...data } = input;

      const post = await ctx.prisma.post.findUnique({
        where: { id, deletedAt: null },
      });

      if (!post) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: `Post with ID ${id} not found`,
        });
      }

      // Update categories if provided
      if (categoryIds) {
        await ctx.prisma.postCategory.deleteMany({ where: { postId: id } });
      }

      return ctx.prisma.post.update({
        where: { id },
        data: {
          ...data,
          ...(categoryIds && {
            categories: {
              create: categoryIds.map((categoryId) => ({ categoryId })),
            },
          }),
        },
        include: {
          author: { select: { id: true, name: true } },
          categories: { include: { category: true } },
        },
      });
    }),

  /** Publish post - transition status from DRAFT to PUBLISHED */
  publish: publicProcedure
    .input(z.object({ id: z.string().cuid() }))
    .mutation(async ({ ctx, input }) => {
      const post = await ctx.prisma.post.findUnique({
        where: { id: input.id, deletedAt: null },
      });

      if (!post) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: `Post with ID ${input.id} not found`,
        });
      }

      if (post.status !== "DRAFT") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Only draft posts can be published",
        });
      }

      return ctx.prisma.post.update({
        where: { id: input.id },
        data: { status: "PUBLISHED" },
      });
    }),

  /** Archive post */
  archive: publicProcedure
    .input(z.object({ id: z.string().cuid() }))
    .mutation(async ({ ctx, input }) => {
      const post = await ctx.prisma.post.findUnique({
        where: { id: input.id, deletedAt: null },
      });

      if (!post) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: `Post with ID ${input.id} not found`,
        });
      }

      if (post.status !== "PUBLISHED") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Only published posts can be archived",
        });
      }

      return ctx.prisma.post.update({
        where: { id: input.id },
        data: { status: "ARCHIVED" },
      });
    }),

  /** Soft delete post */
  delete: publicProcedure
    .input(z.object({ id: z.string().cuid() }))
    .mutation(async ({ ctx, input }) => {
      const post = await ctx.prisma.post.findUnique({
        where: { id: input.id, deletedAt: null },
      });

      if (!post) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: `Post with ID ${input.id} not found`,
        });
      }

      return ctx.prisma.post.update({
        where: { id: input.id },
        data: { deletedAt: new Date() },
      });
    }),
});
