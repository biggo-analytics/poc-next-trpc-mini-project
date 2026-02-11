import { appRouter } from "@/server/routers/_app";
import type { Context } from "@/server/context";

/**
 * Helper สำหรับสร้าง tRPC caller สำหรับ test
 * ใช้ mock Prisma client แทน database จริง
 */
export function createTestCaller(ctx: Context) {
  return appRouter.createCaller(ctx);
}

/**
 * สร้าง mock context สำหรับ test
 */
export function createMockContext(overrides?: Partial<Context>): Context {
  return {
    prisma: createMockPrisma(),
    userId: undefined,
    userRole: undefined,
    ...overrides,
  };
}

/**
 * สร้าง mock Prisma client
 * ใช้ Jest mock สำหรับแต่ละ model
 */
export function createMockPrisma() {
  return {
    user: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    profile: {
      findUnique: jest.fn(),
      upsert: jest.fn(),
    },
    post: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    category: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    postCategory: {
      deleteMany: jest.fn(),
    },
    comment: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  } as unknown as Context["prisma"];
}
