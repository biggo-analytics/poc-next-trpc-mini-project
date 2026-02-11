# Testing Guide

## Overview

Project นี้ใช้ Jest + ts-jest สำหรับ testing โดยเน้น unit test ของ tRPC routers ผ่าน mock Prisma client

## Test Structure

```
__tests__/
├── helpers/
│   └── trpc.ts                  # Test utilities (mock context, caller)
├── setup.ts                     # Global test setup
└── server/
    └── routers/
        ├── user.test.ts         # User router tests
        ├── post.test.ts         # Post router tests
        ├── category.test.ts     # Category router tests
        ├── comment.test.ts      # Comment router tests
        └── profile.test.ts      # Profile router tests
```

## Running Tests

```bash
# Run all tests
npm test

# Run in watch mode (re-run on file changes)
npm run test:watch

# Run with coverage report
npm run test:coverage

# Run specific test file
npx jest __tests__/server/routers/user.test.ts

# Run tests matching pattern
npx jest --testPathPattern="user"
```

## Test Approach

### Mock-based Unit Tests

ใช้ mock Prisma client แทน database จริง เพื่อ:
- ทดสอบ business logic แยกจาก database
- ทำงานเร็ว ไม่ต้องมี database
- ควบคุม test data ได้สมบูรณ์

### Test Helper: `createTestCaller`

```typescript
import { createTestCaller, createMockContext } from "../helpers/trpc";

// สร้าง mock context
const ctx = createMockContext();

// Mock return value
(ctx.prisma.user.findMany as jest.Mock).mockResolvedValue([...]);

// สร้าง caller สำหรับเรียก router
const caller = createTestCaller(ctx);

// เรียก router procedure
const result = await caller.user.list({ page: 1, limit: 10 });
```

### Test Helper: `createMockContext`

```typescript
// Default context (no auth)
const ctx = createMockContext();

// Authenticated context
const ctx = createMockContext({
  userId: "user-id",
  userRole: "ADMIN",
});
```

## Test Patterns

### 1. Testing Queries

```typescript
describe("user.list", () => {
  it("should return paginated users", async () => {
    const ctx = createMockContext();
    (ctx.prisma.user.findMany as jest.Mock).mockResolvedValue(mockUsers);
    (ctx.prisma.user.count as jest.Mock).mockResolvedValue(1);

    const caller = createTestCaller(ctx);
    const result = await caller.user.list({ page: 1, limit: 10 });

    expect(result.items).toHaveLength(1);
    expect(result.total).toBe(1);
  });
});
```

### 2. Testing Mutations

```typescript
describe("user.create", () => {
  it("should create a new user", async () => {
    const ctx = createMockContext();
    (ctx.prisma.user.findUnique as jest.Mock).mockResolvedValue(null); // No duplicate
    (ctx.prisma.user.create as jest.Mock).mockResolvedValue(newUser);

    const caller = createTestCaller(ctx);
    const result = await caller.user.create({ email: "new@example.com" });

    expect(result.email).toBe("new@example.com");
  });
});
```

### 3. Testing Error Cases

```typescript
describe("user.create", () => {
  it("should throw CONFLICT for duplicate email", async () => {
    const ctx = createMockContext();
    (ctx.prisma.user.findUnique as jest.Mock).mockResolvedValue(existingUser);

    const caller = createTestCaller(ctx);

    await expect(
      caller.user.create({ email: "existing@example.com" })
    ).rejects.toThrow(TRPCError);
  });
});
```

### 4. Testing Input Validation

```typescript
it("should reject invalid email format", async () => {
  const ctx = createMockContext();
  const caller = createTestCaller(ctx);

  await expect(
    caller.user.create({ email: "not-an-email" })
  ).rejects.toThrow(); // Zod validation error
});
```

### 5. Testing Status Transitions

```typescript
describe("post.publish", () => {
  it("should publish a draft post", async () => {
    // Mock: post exists with DRAFT status
    (ctx.prisma.post.findUnique as jest.Mock).mockResolvedValue({
      status: "DRAFT",
    });
    // ...
    expect(result.status).toBe("PUBLISHED");
  });

  it("should reject publishing non-draft posts", async () => {
    (ctx.prisma.post.findUnique as jest.Mock).mockResolvedValue({
      status: "PUBLISHED", // Already published
    });

    await expect(caller.post.publish({ id })).rejects.toThrow(TRPCError);
  });
});
```

### 6. Testing Cursor-based Pagination

```typescript
it("should return nextCursor when more items exist", async () => {
  // Return limit + 1 items to indicate more pages
  const mockPosts = Array.from({ length: 11 }, ...);
  (ctx.prisma.post.findMany as jest.Mock).mockResolvedValue(mockPosts);

  const result = await caller.post.list({ limit: 10 });

  expect(result.items).toHaveLength(10);
  expect(result.nextCursor).toBeDefined();
});
```

## Test Coverage

ครอบคลุม test cases ต่อไปนี้:

| Router | Tests | Patterns Tested |
|---|---|---|
| User | 9 | CRUD, pagination, search, soft delete, validation |
| Post | 10 | CRUD, cursor pagination, status transitions, filters |
| Category | 6 | CRUD, slug validation, delete protection |
| Comment | 5 | CRUD, nested replies, cross-post validation |
| Profile | 3 | Get, upsert (1:1 pattern) |

## Adding New Tests

เมื่อเพิ่ม router ใหม่:

1. สร้าง test file ใน `__tests__/server/routers/`
2. Import helpers: `createTestCaller`, `createMockContext`
3. เพิ่ม mock methods ใน `__tests__/helpers/trpc.ts` ถ้าจำเป็น
4. เขียน tests ครอบคลุม: success cases, error cases, validation, edge cases
