import { createTestCaller, createMockContext } from "../../helpers/trpc";
import { TRPCError } from "@trpc/server";

describe("User Router", () => {
  describe("list", () => {
    it("should return paginated users", async () => {
      const mockUsers = [
        {
          id: "cluser00000001",
          email: "user1@example.com",
          name: "User 1",
          role: "USER",
          createdAt: new Date(),
          updatedAt: new Date(),
          deletedAt: null,
          profile: null,
          _count: { posts: 2, comments: 5 },
        },
      ];

      const ctx = createMockContext();
      (ctx.prisma.user.findMany as jest.Mock).mockResolvedValue(mockUsers);
      (ctx.prisma.user.count as jest.Mock).mockResolvedValue(1);

      const caller = createTestCaller(ctx);
      const result = await caller.user.list({ page: 1, limit: 10 });

      expect(result.items).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(result.totalPages).toBe(1);
      expect(ctx.prisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 0,
          take: 10,
          orderBy: { createdAt: "desc" },
        })
      );
    });

    it("should support search filter", async () => {
      const ctx = createMockContext();
      (ctx.prisma.user.findMany as jest.Mock).mockResolvedValue([]);
      (ctx.prisma.user.count as jest.Mock).mockResolvedValue(0);

      const caller = createTestCaller(ctx);
      await caller.user.list({ page: 1, limit: 10, search: "john" });

      expect(ctx.prisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.arrayContaining([
              expect.objectContaining({
                name: { contains: "john", mode: "insensitive" },
              }),
            ]),
          }),
        })
      );
    });

    it("should support role filter", async () => {
      const ctx = createMockContext();
      (ctx.prisma.user.findMany as jest.Mock).mockResolvedValue([]);
      (ctx.prisma.user.count as jest.Mock).mockResolvedValue(0);

      const caller = createTestCaller(ctx);
      await caller.user.list({ page: 1, limit: 10, role: "ADMIN" });

      expect(ctx.prisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ role: "ADMIN" }),
        })
      );
    });
  });

  describe("getById", () => {
    it("should return a user by ID", async () => {
      const mockUser = {
        id: "cluser00000001",
        email: "user1@example.com",
        name: "User 1",
        role: "USER",
        profile: null,
        posts: [],
        _count: { posts: 0, comments: 0 },
      };

      const ctx = createMockContext();
      (ctx.prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);

      const caller = createTestCaller(ctx);
      const result = await caller.user.getById({ id: "cluser00000001" });

      expect(result).toEqual(mockUser);
    });

    it("should throw NOT_FOUND for non-existent user", async () => {
      const ctx = createMockContext();
      (ctx.prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      const caller = createTestCaller(ctx);

      await expect(
        caller.user.getById({ id: "clnonexistent01" })
      ).rejects.toThrow(TRPCError);
    });
  });

  describe("create", () => {
    it("should create a new user", async () => {
      const newUser = {
        id: "clnewuser00001",
        email: "new@example.com",
        name: "New User",
        role: "USER",
        profile: null,
      };

      const ctx = createMockContext();
      (ctx.prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
      (ctx.prisma.user.create as jest.Mock).mockResolvedValue(newUser);

      const caller = createTestCaller(ctx);
      const result = await caller.user.create({
        email: "new@example.com",
        name: "New User",
      });

      expect(result.email).toBe("new@example.com");
      expect(ctx.prisma.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ email: "new@example.com" }),
        })
      );
    });

    it("should throw CONFLICT for duplicate email", async () => {
      const ctx = createMockContext();
      (ctx.prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: "cexisting000001",
        email: "existing@example.com",
      });

      const caller = createTestCaller(ctx);

      await expect(
        caller.user.create({ email: "existing@example.com" })
      ).rejects.toThrow(TRPCError);
    });

    it("should reject invalid email format", async () => {
      const ctx = createMockContext();
      const caller = createTestCaller(ctx);

      await expect(
        caller.user.create({ email: "not-an-email" })
      ).rejects.toThrow();
    });
  });

  describe("update", () => {
    it("should update an existing user", async () => {
      const existingUser = {
        id: "cluser00000001",
        email: "user1@example.com",
        name: "User 1",
        role: "USER",
        deletedAt: null,
      };

      const updatedUser = { ...existingUser, name: "Updated User" };

      const ctx = createMockContext();
      (ctx.prisma.user.findUnique as jest.Mock).mockResolvedValue(existingUser);
      (ctx.prisma.user.findFirst as jest.Mock).mockResolvedValue(null);
      (ctx.prisma.user.update as jest.Mock).mockResolvedValue(updatedUser);

      const caller = createTestCaller(ctx);
      const result = await caller.user.update({
        id: "cluser00000001",
        name: "Updated User",
      });

      expect(result.name).toBe("Updated User");
    });
  });

  describe("delete", () => {
    it("should soft delete a user", async () => {
      const existingUser = {
        id: "cluser00000001",
        email: "user1@example.com",
        deletedAt: null,
      };

      const ctx = createMockContext();
      (ctx.prisma.user.findUnique as jest.Mock).mockResolvedValue(existingUser);
      (ctx.prisma.user.update as jest.Mock).mockResolvedValue({
        ...existingUser,
        deletedAt: new Date(),
      });

      const caller = createTestCaller(ctx);
      const result = await caller.user.delete({ id: "cluser00000001" });

      expect(result.deletedAt).toBeTruthy();
      expect(ctx.prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            deletedAt: expect.any(Date),
          }),
        })
      );
    });

    it("should throw NOT_FOUND for non-existent user", async () => {
      const ctx = createMockContext();
      (ctx.prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      const caller = createTestCaller(ctx);

      await expect(
        caller.user.delete({ id: "clnonexistent01" })
      ).rejects.toThrow(TRPCError);
    });
  });
});
