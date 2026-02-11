import { createTestCaller, createMockContext } from "../../helpers/trpc";
import { TRPCError } from "@trpc/server";

describe("Comment Router", () => {
  describe("getByPost", () => {
    it("should return top-level comments with nested replies", async () => {
      const mockComments = [
        {
          id: "clcomment000001",
          content: "Great post!",
          author: { id: "clauthor000001", name: "User 1" },
          replies: [
            {
              id: "clreply00000001",
              content: "Thanks!",
              author: { id: "clauthor000002", name: "Author" },
              replies: [],
            },
          ],
          _count: { replies: 1 },
        },
      ];

      const ctx = createMockContext();
      (ctx.prisma.comment.findMany as jest.Mock).mockResolvedValue(mockComments);

      const caller = createTestCaller(ctx);
      const result = await caller.comment.getByPost({
        postId: "clpost000000001",
        limit: 20,
      });

      expect(result.items).toHaveLength(1);
      expect(result.items[0].replies).toHaveLength(1);
    });
  });

  describe("create", () => {
    it("should create a top-level comment", async () => {
      const mockComment = {
        id: "clnewcomment001",
        content: "New comment",
        authorId: "clauthor000001",
        postId: "clpost000000001",
        parentId: null,
        author: { id: "clauthor000001", name: "User" },
      };

      const ctx = createMockContext();
      (ctx.prisma.post.findUnique as jest.Mock).mockResolvedValue({
        id: "clpost000000001",
        deletedAt: null,
      });
      (ctx.prisma.comment.create as jest.Mock).mockResolvedValue(mockComment);

      const caller = createTestCaller(ctx);
      const result = await caller.comment.create({
        content: "New comment",
        authorId: "clauthor000001",
        postId: "clpost000000001",
      });

      expect(result.content).toBe("New comment");
      expect(result.parentId).toBeNull();
    });

    it("should create a reply to existing comment", async () => {
      const mockReply = {
        id: "clnewreply00001",
        content: "Reply",
        authorId: "clauthor000001",
        postId: "clpost000000001",
        parentId: "clcomment000001",
        author: { id: "clauthor000001", name: "User" },
      };

      const ctx = createMockContext();
      (ctx.prisma.post.findUnique as jest.Mock).mockResolvedValue({
        id: "clpost000000001",
        deletedAt: null,
      });
      (ctx.prisma.comment.findUnique as jest.Mock).mockResolvedValue({
        id: "clcomment000001",
        postId: "clpost000000001",
      });
      (ctx.prisma.comment.create as jest.Mock).mockResolvedValue(mockReply);

      const caller = createTestCaller(ctx);
      const result = await caller.comment.create({
        content: "Reply",
        authorId: "clauthor000001",
        postId: "clpost000000001",
        parentId: "clcomment000001",
      });

      expect(result.parentId).toBe("clcomment000001");
    });

    it("should throw NOT_FOUND when post does not exist", async () => {
      const ctx = createMockContext();
      (ctx.prisma.post.findUnique as jest.Mock).mockResolvedValue(null);

      const caller = createTestCaller(ctx);

      await expect(
        caller.comment.create({
          content: "Comment",
          authorId: "clauthor000001",
          postId: "clnonexistent01",
        })
      ).rejects.toThrow(TRPCError);
    });

    it("should throw BAD_REQUEST when parent comment belongs to different post", async () => {
      const ctx = createMockContext();
      (ctx.prisma.post.findUnique as jest.Mock).mockResolvedValue({
        id: "clpost000000001",
        deletedAt: null,
      });
      (ctx.prisma.comment.findUnique as jest.Mock).mockResolvedValue({
        id: "clcomment000001",
        postId: "cldifferentpost1", // Different post
      });

      const caller = createTestCaller(ctx);

      await expect(
        caller.comment.create({
          content: "Reply",
          authorId: "clauthor000001",
          postId: "clpost000000001",
          parentId: "clcomment000001",
        })
      ).rejects.toThrow(TRPCError);
    });
  });

  describe("delete", () => {
    it("should delete a comment", async () => {
      const ctx = createMockContext();
      (ctx.prisma.comment.findUnique as jest.Mock).mockResolvedValue({
        id: "clcomment000001",
        content: "To be deleted",
      });
      (ctx.prisma.comment.delete as jest.Mock).mockResolvedValue({
        id: "clcomment000001",
      });

      const caller = createTestCaller(ctx);
      const result = await caller.comment.delete({ id: "clcomment000001" });

      expect(result.id).toBe("clcomment000001");
    });
  });
});
