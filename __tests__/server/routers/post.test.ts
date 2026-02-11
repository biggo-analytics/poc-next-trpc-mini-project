import { createTestCaller, createMockContext } from "../../helpers/trpc";
import { TRPCError } from "@trpc/server";

describe("Post Router", () => {
  describe("list", () => {
    it("should return posts with cursor-based pagination", async () => {
      const mockPosts = Array.from({ length: 11 }, (_, i) => ({
        id: `clpost0000000${i.toString().padStart(2, '0')}`,
        title: `Post ${i}`,
        content: `Content ${i}`,
        status: "PUBLISHED",
        authorId: "clauthor000001",
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
        author: { id: "clauthor000001", name: "Author", email: "author@example.com" },
        categories: [],
        _count: { comments: 0 },
      }));

      const ctx = createMockContext();
      (ctx.prisma.post.findMany as jest.Mock).mockResolvedValue(mockPosts);

      const caller = createTestCaller(ctx);
      const result = await caller.post.list({ limit: 10 });

      // Should return 10 items and have a nextCursor
      expect(result.items).toHaveLength(10);
      expect(result.nextCursor).toBeDefined();
    });

    it("should return no nextCursor when fewer items than limit", async () => {
      const mockPosts = [
        {
          id: "clpost000000001",
          title: "Post 1",
          status: "PUBLISHED",
          author: { id: "clauthor000001", name: "Author", email: "a@b.com" },
          categories: [],
          _count: { comments: 0 },
        },
      ];

      const ctx = createMockContext();
      (ctx.prisma.post.findMany as jest.Mock).mockResolvedValue(mockPosts);

      const caller = createTestCaller(ctx);
      const result = await caller.post.list({ limit: 10 });

      expect(result.items).toHaveLength(1);
      expect(result.nextCursor).toBeUndefined();
    });

    it("should support status filter", async () => {
      const ctx = createMockContext();
      (ctx.prisma.post.findMany as jest.Mock).mockResolvedValue([]);

      const caller = createTestCaller(ctx);
      await caller.post.list({ limit: 10, status: "DRAFT" });

      expect(ctx.prisma.post.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ status: "DRAFT" }),
        })
      );
    });
  });

  describe("getById", () => {
    it("should return post with nested comments", async () => {
      const mockPost = {
        id: "clpost000000001",
        title: "Test Post",
        content: "Content",
        status: "PUBLISHED",
        author: { id: "clauthor000001", name: "Author", email: "a@b.com", role: "USER" },
        categories: [{ category: { id: "clcat0000000001", name: "Tech", slug: "tech" } }],
        comments: [
          {
            id: "clcomment000001",
            content: "Great post!",
            author: { id: "clauthor000002", name: "Commenter" },
            replies: [
              {
                id: "clreply00000001",
                content: "Thanks!",
                author: { id: "clauthor000001", name: "Author" },
              },
            ],
          },
        ],
        _count: { comments: 2 },
      };

      const ctx = createMockContext();
      (ctx.prisma.post.findUnique as jest.Mock).mockResolvedValue(mockPost);

      const caller = createTestCaller(ctx);
      const result = await caller.post.getById({ id: "clpost000000001" });

      expect(result.title).toBe("Test Post");
      expect(result.comments).toHaveLength(1);
      expect(result.comments[0].replies).toHaveLength(1);
    });

    it("should throw NOT_FOUND for non-existent post", async () => {
      const ctx = createMockContext();
      (ctx.prisma.post.findUnique as jest.Mock).mockResolvedValue(null);

      const caller = createTestCaller(ctx);

      await expect(
        caller.post.getById({ id: "clnonexistent01" })
      ).rejects.toThrow(TRPCError);
    });
  });

  describe("create", () => {
    it("should create a new post with categories", async () => {
      const mockPost = {
        id: "clnewpost00001",
        title: "New Post",
        content: "Content",
        status: "DRAFT",
        authorId: "clauthor000001",
        author: { id: "clauthor000001", name: "Author" },
        categories: [{ category: { id: "clcat0000000001", name: "Tech", slug: "tech" } }],
      };

      const ctx = createMockContext();
      (ctx.prisma.post.create as jest.Mock).mockResolvedValue(mockPost);

      const caller = createTestCaller(ctx);
      const result = await caller.post.create({
        title: "New Post",
        content: "Content",
        authorId: "clauthor000001",
        categoryIds: ["clcat0000000001"],
      });

      expect(result.title).toBe("New Post");
      expect(result.status).toBe("DRAFT");
    });
  });

  describe("publish", () => {
    it("should publish a draft post", async () => {
      const draftPost = {
        id: "clpost000000001",
        title: "Draft Post",
        status: "DRAFT",
        deletedAt: null,
      };

      const ctx = createMockContext();
      (ctx.prisma.post.findUnique as jest.Mock).mockResolvedValue(draftPost);
      (ctx.prisma.post.update as jest.Mock).mockResolvedValue({
        ...draftPost,
        status: "PUBLISHED",
      });

      const caller = createTestCaller(ctx);
      const result = await caller.post.publish({ id: "clpost000000001" });

      expect(result.status).toBe("PUBLISHED");
    });

    it("should reject publishing non-draft posts", async () => {
      const publishedPost = {
        id: "clpost000000001",
        title: "Published Post",
        status: "PUBLISHED",
        deletedAt: null,
      };

      const ctx = createMockContext();
      (ctx.prisma.post.findUnique as jest.Mock).mockResolvedValue(publishedPost);

      const caller = createTestCaller(ctx);

      await expect(
        caller.post.publish({ id: "clpost000000001" })
      ).rejects.toThrow(TRPCError);
    });
  });

  describe("archive", () => {
    it("should archive a published post", async () => {
      const publishedPost = {
        id: "clpost000000001",
        status: "PUBLISHED",
        deletedAt: null,
      };

      const ctx = createMockContext();
      (ctx.prisma.post.findUnique as jest.Mock).mockResolvedValue(publishedPost);
      (ctx.prisma.post.update as jest.Mock).mockResolvedValue({
        ...publishedPost,
        status: "ARCHIVED",
      });

      const caller = createTestCaller(ctx);
      const result = await caller.post.archive({ id: "clpost000000001" });

      expect(result.status).toBe("ARCHIVED");
    });

    it("should reject archiving non-published posts", async () => {
      const draftPost = {
        id: "clpost000000001",
        status: "DRAFT",
        deletedAt: null,
      };

      const ctx = createMockContext();
      (ctx.prisma.post.findUnique as jest.Mock).mockResolvedValue(draftPost);

      const caller = createTestCaller(ctx);

      await expect(
        caller.post.archive({ id: "clpost000000001" })
      ).rejects.toThrow(TRPCError);
    });
  });

  describe("delete", () => {
    it("should soft delete a post", async () => {
      const post = { id: "clpost000000001", deletedAt: null };

      const ctx = createMockContext();
      (ctx.prisma.post.findUnique as jest.Mock).mockResolvedValue(post);
      (ctx.prisma.post.update as jest.Mock).mockResolvedValue({
        ...post,
        deletedAt: new Date(),
      });

      const caller = createTestCaller(ctx);
      const result = await caller.post.delete({ id: "clpost000000001" });

      expect(result.deletedAt).toBeTruthy();
    });
  });
});
