# API Reference

## Overview

ทุก API endpoint ถูกจัดการผ่าน tRPC routers ที่ `/api/trpc` endpoint เดียว
tRPC ให้ type safety ตลอด full-stack โดยอัตโนมัติ

## Routers

### User Router (`trpc.user.*`)

#### `user.list` (Query)
ดึง list ของ users พร้อม offset-based pagination

**Input:**
```typescript
{
  page: number;     // default: 1
  limit: number;    // default: 10, max: 100
  search?: string;  // search by name or email
  role?: "ADMIN" | "USER";
}
```

**Output:**
```typescript
{
  items: User[];      // array of users with profile and counts
  total: number;      // total records
  page: number;       // current page
  limit: number;      // items per page
  totalPages: number; // total pages
}
```

#### `user.getById` (Query)
ดึง user ตาม ID พร้อม profile, posts, และ counts

**Input:** `{ id: string }`
**Output:** `User` with relations

#### `user.create` (Mutation)
สร้าง user ใหม่

**Input:**
```typescript
{
  email: string;           // required, valid email
  name?: string;           // optional
  role?: "ADMIN" | "USER"; // default: "USER"
}
```

**Errors:**
- `CONFLICT` — email ซ้ำ

#### `user.update` (Mutation)
แก้ไข user

**Input:**
```typescript
{
  id: string;              // required, cuid
  email?: string;          // valid email
  name?: string;
  role?: "ADMIN" | "USER";
}
```

**Errors:**
- `NOT_FOUND` — user ไม่เจอ
- `CONFLICT` — email ซ้ำ

#### `user.delete` (Mutation)
Soft delete user (set deletedAt)

**Input:** `{ id: string }`
**Errors:** `NOT_FOUND`

---

### Post Router (`trpc.post.*`)

#### `post.list` (Query)
ดึง list ของ posts พร้อม **cursor-based pagination**

**Input:**
```typescript
{
  limit: number;     // default: 10, max: 100
  cursor?: string;   // post ID for cursor pagination
  status?: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  authorId?: string;
  search?: string;   // search in title and content
}
```

**Output:**
```typescript
{
  items: Post[];         // array of posts with author, categories, counts
  nextCursor?: string;   // cursor for next page (undefined = no more)
}
```

**Usage (infinite scroll):**
```typescript
const { data, fetchNextPage, hasNextPage } = trpc.post.list.useInfiniteQuery(
  { limit: 10 },
  { getNextPageParam: (lastPage) => lastPage.nextCursor }
);
```

#### `post.getById` (Query)
ดึง post ตาม ID พร้อม author, categories, nested comments

**Input:** `{ id: string }`

#### `post.getByUser` (Query)
ดึง posts ทั้งหมดของ user

**Input:**
```typescript
{
  userId: string;
  status?: "DRAFT" | "PUBLISHED" | "ARCHIVED";
}
```

#### `post.create` (Mutation)
สร้าง post ใหม่ (status = DRAFT)

**Input:**
```typescript
{
  title: string;          // 1-255 characters
  content?: string;
  authorId: string;
  categoryIds?: string[]; // array of category IDs
}
```

#### `post.update` (Mutation)
แก้ไข post (รวมถึง categories)

**Input:**
```typescript
{
  id: string;
  title?: string;
  content?: string;
  categoryIds?: string[]; // replace all categories
}
```

#### `post.publish` (Mutation)
เปลี่ยน status: DRAFT → PUBLISHED

**Input:** `{ id: string }`
**Errors:** `BAD_REQUEST` — ถ้า status ไม่ใช่ DRAFT

#### `post.archive` (Mutation)
เปลี่ยน status: PUBLISHED → ARCHIVED

**Input:** `{ id: string }`
**Errors:** `BAD_REQUEST` — ถ้า status ไม่ใช่ PUBLISHED

#### `post.delete` (Mutation)
Soft delete post

**Input:** `{ id: string }`

---

### Category Router (`trpc.category.*`)

#### `category.list` (Query)
ดึงทุก categories พร้อม post count

**Output:** `Category[]` with `_count.posts`

#### `category.getById` (Query)
ดึง category พร้อม associated posts

**Input:** `{ id: string }`

#### `category.getBySlug` (Query)
ดึง category ตาม slug

**Input:** `{ slug: string }`

#### `category.create` (Mutation)
สร้าง category ใหม่

**Input:**
```typescript
{
  name: string;  // 1-100 characters
  slug: string;  // lowercase, alphanumeric, hyphens only
}
```

**Errors:** `CONFLICT` — name หรือ slug ซ้ำ

#### `category.update` (Mutation)
**Input:** `{ id: string; name?: string; slug?: string }`

#### `category.delete` (Mutation)
ลบ category (hard delete)

**Input:** `{ id: string }`
**Errors:** `PRECONDITION_FAILED` — ถ้ามี posts เชื่อมอยู่

---

### Comment Router (`trpc.comment.*`)

#### `comment.getByPost` (Query)
ดึง comments ของ post พร้อม nested replies (cursor-based pagination)

**Input:**
```typescript
{
  postId: string;
  limit: number;    // default: 20, max: 50
  cursor?: string;
}
```

**Output:**
```typescript
{
  items: Comment[];      // top-level comments with nested replies (2 levels)
  nextCursor?: string;
}
```

#### `comment.create` (Mutation)
สร้าง comment หรือ reply

**Input:**
```typescript
{
  content: string;    // 1-5000 characters
  authorId: string;
  postId: string;
  parentId?: string;  // ถ้าเป็น reply
}
```

**Errors:**
- `NOT_FOUND` — post หรือ parent comment ไม่เจอ
- `BAD_REQUEST` — parent comment อยู่คนละ post

#### `comment.update` (Mutation)
**Input:** `{ id: string; content: string }`

#### `comment.delete` (Mutation)
ลบ comment พร้อม replies ทั้งหมด (cascade)

**Input:** `{ id: string }`

---

### Profile Router (`trpc.profile.*`)

#### `profile.getByUser` (Query)
ดึง profile ตาม user ID

**Input:** `{ userId: string }`

#### `profile.upsert` (Mutation)
สร้างหรืออัปเดต profile (upsert pattern)

**Input:**
```typescript
{
  userId: string;
  bio?: string;      // max 500 characters
  avatar?: string;   // valid URL
  website?: string;  // valid URL
}
```

---

## Middleware

### Logger Middleware
บันทึกทุก request พร้อม execution time

```
[tRPC] query user.list - OK (15ms)
[tRPC] mutation post.create - OK (42ms)
[tRPC] query post.getById - ERROR (5ms)
```

### Auth Middleware (Simulated)
ตรวจสอบ authentication จาก request headers:
- `x-user-id` — User ID
- `x-user-role` — User role

ใช้กับ `protectedProcedure` และ `adminProcedure` (ยังไม่ได้ใช้ใน POC routes แต่พร้อมใช้)

## Error Codes

| Code | HTTP Status | Description |
|---|---|---|
| `NOT_FOUND` | 404 | Resource ไม่เจอ |
| `CONFLICT` | 409 | ข้อมูลซ้ำ |
| `BAD_REQUEST` | 400 | Input ไม่ถูกต้อง / Business rule violation |
| `UNAUTHORIZED` | 401 | ไม่ได้ login |
| `FORBIDDEN` | 403 | ไม่มีสิทธิ์ |
| `PRECONDITION_FAILED` | 412 | ไม่สามารถทำได้ตาม condition |
