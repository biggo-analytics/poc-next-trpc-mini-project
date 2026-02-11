import { createTestCaller, createMockContext } from "../../helpers/trpc";
import { TRPCError } from "@trpc/server";

describe("Category Router", () => {
  describe("list", () => {
    it("should return all categories with post count", async () => {
      const mockCategories = [
        {
          id: "clcat0000000001",
          name: "Technology",
          slug: "technology",
          _count: { posts: 5 },
        },
        {
          id: "clcat0000000002",
          name: "Design",
          slug: "design",
          _count: { posts: 3 },
        },
      ];

      const ctx = createMockContext();
      (ctx.prisma.category.findMany as jest.Mock).mockResolvedValue(mockCategories);

      const caller = createTestCaller(ctx);
      const result = await caller.category.list();

      expect(result).toHaveLength(2);
      expect(result[0]._count.posts).toBe(5);
    });
  });

  describe("getById", () => {
    it("should return category with associated posts", async () => {
      const mockCategory = {
        id: "clcat0000000001",
        name: "Technology",
        slug: "technology",
        posts: [
          {
            post: {
              id: "clpost000000001",
              title: "Tech Post",
              status: "PUBLISHED",
              author: { id: "clauthor000001", name: "Author" },
            },
          },
        ],
        _count: { posts: 1 },
      };

      const ctx = createMockContext();
      (ctx.prisma.category.findUnique as jest.Mock).mockResolvedValue(mockCategory);

      const caller = createTestCaller(ctx);
      const result = await caller.category.getById({ id: "clcat0000000001" });

      expect(result.name).toBe("Technology");
      expect(result.posts).toHaveLength(1);
    });

    it("should throw NOT_FOUND for non-existent category", async () => {
      const ctx = createMockContext();
      (ctx.prisma.category.findUnique as jest.Mock).mockResolvedValue(null);

      const caller = createTestCaller(ctx);

      await expect(
        caller.category.getById({ id: "clnonexistent01" })
      ).rejects.toThrow(TRPCError);
    });
  });

  describe("create", () => {
    it("should create a new category", async () => {
      const newCategory = {
        id: "clnewcat0000001",
        name: "New Category",
        slug: "new-category",
        _count: { posts: 0 },
      };

      const ctx = createMockContext();
      (ctx.prisma.category.findFirst as jest.Mock).mockResolvedValue(null);
      (ctx.prisma.category.create as jest.Mock).mockResolvedValue(newCategory);

      const caller = createTestCaller(ctx);
      const result = await caller.category.create({
        name: "New Category",
        slug: "new-category",
      });

      expect(result.name).toBe("New Category");
      expect(result.slug).toBe("new-category");
    });

    it("should throw CONFLICT for duplicate name/slug", async () => {
      const ctx = createMockContext();
      (ctx.prisma.category.findFirst as jest.Mock).mockResolvedValue({
        id: "cexisting000001",
        name: "Existing",
        slug: "existing",
      });

      const caller = createTestCaller(ctx);

      await expect(
        caller.category.create({ name: "Existing", slug: "existing" })
      ).rejects.toThrow(TRPCError);
    });

    it("should reject invalid slug format", async () => {
      const ctx = createMockContext();
      const caller = createTestCaller(ctx);

      await expect(
        caller.category.create({
          name: "Test",
          slug: "Invalid Slug With Spaces",
        })
      ).rejects.toThrow();
    });
  });

  describe("delete", () => {
    it("should delete a category with no posts", async () => {
      const category = {
        id: "clcat0000000001",
        name: "Empty Category",
        _count: { posts: 0 },
      };

      const ctx = createMockContext();
      (ctx.prisma.category.findUnique as jest.Mock).mockResolvedValue(category);
      (ctx.prisma.category.delete as jest.Mock).mockResolvedValue(category);

      const caller = createTestCaller(ctx);
      const result = await caller.category.delete({ id: "clcat0000000001" });

      expect(result.name).toBe("Empty Category");
    });

    it("should prevent deleting category with posts", async () => {
      const category = {
        id: "clcat0000000001",
        name: "Used Category",
        _count: { posts: 5 },
      };

      const ctx = createMockContext();
      (ctx.prisma.category.findUnique as jest.Mock).mockResolvedValue(category);

      const caller = createTestCaller(ctx);

      await expect(
        caller.category.delete({ id: "clcat0000000001" })
      ).rejects.toThrow(TRPCError);
    });
  });
});
