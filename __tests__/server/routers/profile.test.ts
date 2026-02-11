import { createTestCaller, createMockContext } from "../../helpers/trpc";
import { TRPCError } from "@trpc/server";

describe("Profile Router", () => {
  describe("getByUser", () => {
    it("should return profile with user info", async () => {
      const mockProfile = {
        id: "clprofile000001",
        bio: "Hello world",
        avatar: "https://example.com/avatar.png",
        website: "https://example.com",
        userId: "cluser00000001",
        user: {
          id: "cluser00000001",
          name: "User 1",
          email: "user1@example.com",
          role: "USER",
        },
      };

      const ctx = createMockContext();
      (ctx.prisma.profile.findUnique as jest.Mock).mockResolvedValue(mockProfile);

      const caller = createTestCaller(ctx);
      const result = await caller.profile.getByUser({ userId: "cluser00000001" });

      expect(result.bio).toBe("Hello world");
      expect(result.user.name).toBe("User 1");
    });

    it("should throw NOT_FOUND for missing profile", async () => {
      const ctx = createMockContext();
      (ctx.prisma.profile.findUnique as jest.Mock).mockResolvedValue(null);

      const caller = createTestCaller(ctx);

      await expect(
        caller.profile.getByUser({ userId: "cluser00000001" })
      ).rejects.toThrow(TRPCError);
    });
  });

  describe("upsert", () => {
    it("should create profile for user without one", async () => {
      const mockProfile = {
        id: "clnewprofile001",
        bio: "New bio",
        avatar: null,
        website: null,
        userId: "cluser00000001",
        user: { id: "cluser00000001", name: "User", email: "u@b.com", role: "USER" },
      };

      const ctx = createMockContext();
      (ctx.prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: "cluser00000001",
        deletedAt: null,
      });
      (ctx.prisma.profile.upsert as jest.Mock).mockResolvedValue(mockProfile);

      const caller = createTestCaller(ctx);
      const result = await caller.profile.upsert({
        userId: "cluser00000001",
        bio: "New bio",
      });

      expect(result.bio).toBe("New bio");
      expect(ctx.prisma.profile.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: "cluser00000001" },
          create: expect.objectContaining({ userId: "cluser00000001", bio: "New bio" }),
          update: expect.objectContaining({ bio: "New bio" }),
        })
      );
    });

    it("should throw NOT_FOUND for non-existent user", async () => {
      const ctx = createMockContext();
      (ctx.prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      const caller = createTestCaller(ctx);

      await expect(
        caller.profile.upsert({ userId: "clnonexistent01", bio: "Bio" })
      ).rejects.toThrow(TRPCError);
    });
  });
});
