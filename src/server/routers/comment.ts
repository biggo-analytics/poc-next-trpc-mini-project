import { z } from "zod";
import { router, publicProcedure } from "../trpc";
import { TRPCError } from "@trpc/server";

// ============================================================
// Input Schemas
// ============================================================

const createCommentInput = z.object({
  content: z.string().min(1, "Comment cannot be empty").max(5000),
  authorId: z.string().cuid(),
  postId: z.string().cuid(),
  parentId: z.string().cuid().optional(), // For nested replies
});

const updateCommentInput = z.object({
  id: z.string().cuid(),
  content: z.string().min(1).max(5000),
});

// ============================================================
// Router
// ============================================================

export const commentRouter = router({
  /** Get comments by post ID with nested replies */
  getByPost: publicProcedure
    .input(
      z.object({
        postId: z.string().cuid(),
        limit: z.number().int().positive().max(50).default(20),
        cursor: z.string().cuid().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const { postId, limit, cursor } = input;

      const comments = await ctx.prisma.comment.findMany({
        where: { postId, parentId: null }, // Only top-level comments
        take: limit + 1,
        ...(cursor && {
          cursor: { id: cursor },
          skip: 1,
        }),
        orderBy: { createdAt: "desc" },
        include: {
          author: { select: { id: true, name: true } },
          replies: {
            orderBy: { createdAt: "asc" },
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
          _count: { select: { replies: true } },
        },
      });

      let nextCursor: string | undefined;
      if (comments.length > limit) {
        const nextItem = comments.pop();
        nextCursor = nextItem?.id;
      }

      return {
        items: comments,
        nextCursor,
      };
    }),

  /** Create a comment or reply */
  create: publicProcedure
    .input(createCommentInput)
    .mutation(async ({ ctx, input }) => {
      // Verify post exists
      const post = await ctx.prisma.post.findUnique({
        where: { id: input.postId, deletedAt: null },
      });

      if (!post) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Post not found",
        });
      }

      // Verify parent comment if replying
      if (input.parentId) {
        const parent = await ctx.prisma.comment.findUnique({
          where: { id: input.parentId },
        });

        if (!parent) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Parent comment not found",
          });
        }

        if (parent.postId !== input.postId) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Parent comment does not belong to this post",
          });
        }
      }

      return ctx.prisma.comment.create({
        data: input,
        include: {
          author: { select: { id: true, name: true } },
        },
      });
    }),

  /** Update a comment */
  update: publicProcedure
    .input(updateCommentInput)
    .mutation(async ({ ctx, input }) => {
      const { id, content } = input;

      const comment = await ctx.prisma.comment.findUnique({
        where: { id },
      });

      if (!comment) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: `Comment with ID ${id} not found`,
        });
      }

      return ctx.prisma.comment.update({
        where: { id },
        data: { content },
        include: {
          author: { select: { id: true, name: true } },
        },
      });
    }),

  /** Delete a comment and all its replies (cascade) */
  delete: publicProcedure
    .input(z.object({ id: z.string().cuid() }))
    .mutation(async ({ ctx, input }) => {
      const comment = await ctx.prisma.comment.findUnique({
        where: { id: input.id },
      });

      if (!comment) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: `Comment with ID ${input.id} not found`,
        });
      }

      return ctx.prisma.comment.delete({
        where: { id: input.id },
      });
    }),
});
