# Architecture Overview

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Browser (Client)                        │
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────────────┐ │
│  │  React Pages  │  │  Components  │  │  React Query      │ │
│  │  (App Router) │  │  (UI/Forms)  │  │  (Cache/Refetch)  │ │
│  └──────┬───────┘  └──────────────┘  └─────────┬─────────┘ │
│         │                                       │            │
│         └──────────────┬────────────────────────┘            │
│                        │                                     │
│              ┌─────────▼──────────┐                          │
│              │   tRPC Client      │                          │
│              │   (httpBatchLink)  │                          │
│              └─────────┬──────────┘                          │
└────────────────────────┼─────────────────────────────────────┘
                         │  HTTP (Batch) — GET/POST
                         │  superjson serialization
┌────────────────────────┼─────────────────────────────────────┐
│                   Next.js Server                              │
│              ┌─────────▼──────────┐                          │
│              │  tRPC Server       │                          │
│              │  /api/trpc/[trpc]  │                          │
│              └─────────┬──────────┘                          │
│                        │                                     │
│    ┌───────────────────┼───────────────────────┐             │
│    │                   │                       │             │
│  ┌─▼──────────┐  ┌────▼──────────┐  ┌─────────▼──────────┐ │
│  │  Context    │  │  Routers      │  │  Middleware         │ │
│  │  (prisma,   │  │  (user, post, │  │  (loggerMiddleware, │ │
│  │   userId,   │  │   category,   │  │   isAuthed,         │ │
│  │   userRole) │  │   comment,    │  │   isAdmin)          │ │
│  └─────────────┘  │   profile)    │  └────────────────────┘ │
│                    └────┬─────────┘                          │
│                         │                                    │
│                  ┌──────▼──────┐                             │
│                  │   Prisma    │                             │
│                  │   Client    │                             │
│                  │ (Singleton) │                             │
│                  └──────┬──────┘                             │
└─────────────────────────┼────────────────────────────────────┘
                          │ TCP (port 5432)
                   ┌──────▼──────┐
                   │  PostgreSQL  │
                   │  (AWS RDS)   │
                   └─────────────┘
```

---

## Directory Structure

```
poc-next-trpc-mini-project/
│
├── src/
│   ├── app/                                  # Next.js App Router (Pages)
│   │   ├── layout.tsx                        # Root layout — TRPCProvider + Navigation
│   │   ├── page.tsx                          # Dashboard — สรุป users/posts/categories
│   │   ├── users/
│   │   │   └── page.tsx                      # User CRUD — ตาราง, ค้นหา, สร้าง/แก้ไข/ลบ
│   │   ├── posts/
│   │   │   ├── page.tsx                      # Post list — cursor pagination, filters, status
│   │   │   └── [id]/
│   │   │       └── page.tsx                  # Post detail — เนื้อหา, comments, replies
│   │   ├── categories/
│   │   │   └── page.tsx                      # Category CRUD — cards grid, auto-slug
│   │   └── api/
│   │       └── trpc/
│   │           └── [trpc]/
│   │               └── route.ts              # tRPC HTTP handler (GET + POST)
│   │
│   ├── server/                               # tRPC Server (Backend Logic)
│   │   ├── trpc.ts                           # tRPC initialization + middleware definitions
│   │   ├── context.ts                        # Request context factory (prisma, auth)
│   │   └── routers/
│   │       ├── _app.ts                       # Root router — รวม routers ทั้งหมด
│   │       ├── user.ts                       # User CRUD + offset pagination + search
│   │       ├── post.ts                       # Post CRUD + cursor pagination + status flow
│   │       ├── category.ts                   # Category CRUD + delete protection
│   │       ├── comment.ts                    # Comment CRUD + nested replies
│   │       └── profile.ts                    # Profile get + upsert (1:1 pattern)
│   │
│   ├── lib/                                  # Shared utilities
│   │   ├── prisma.ts                         # PrismaClient singleton
│   │   └── trpc-client.ts                    # tRPC React client (createTRPCReact)
│   │
│   └── components/                           # Shared UI components
│       ├── providers/
│       │   └── trpc-provider.tsx             # QueryClient + tRPC provider setup
│       └── Navigation.tsx                    # Nav bar with active link detection
│
├── prisma/
│   ├── schema.prisma                         # Database schema (models, relations, enums)
│   └── seed.ts                               # Seed script — สร้างข้อมูลตัวอย่าง
│
├── __tests__/                                # Jest unit tests
│   ├── setup.ts                              # Global test configuration
│   ├── helpers/
│   │   └── trpc.ts                           # Mock context + test caller
│   └── server/routers/                       # Router unit tests
│       ├── user.test.ts
│       ├── post.test.ts
│       ├── category.test.ts
│       ├── comment.test.ts
│       └── profile.test.ts
│
├── docs/                                     # Documentation
│   ├── ARCHITECTURE.md                       # ไฟล์นี้
│   ├── DATABASE.md                           # Database schema + relations
│   ├── API.md                                # API reference ทุก endpoint
│   ├── TESTING.md                            # Testing guide
│   └── DEPLOYMENT.md                         # AWS Amplify deployment
│
├── scripts/
│   ├── setup-db.sh                           # Start Docker + migrate + seed
│   └── reset-db.sh                           # Reset DB + re-seed
│
├── amplify.yml                               # AWS Amplify build configuration
├── docker-compose.yml                        # Local PostgreSQL (dev + test)
├── next.config.mjs                           # Next.js config (standalone output)
├── tailwind.config.ts                        # TailwindCSS configuration
├── tsconfig.json                             # TypeScript configuration
├── jest.config.ts                            # Jest test configuration
└── package.json                              # Dependencies + scripts
```

---

## Technology Stack

| Layer | Technology | Version | Purpose |
|-------|-----------|---------|---------|
| **Framework** | Next.js | 14.2.18 | Full-stack React framework (App Router) |
| **Language** | TypeScript | 5.7 | Type safety ตลอด full stack |
| **API** | tRPC | 10.45.2 | Type-safe RPC — client/server types shared อัตโนมัติ |
| **ORM** | Prisma | 5.22.0 | Type-safe database queries + migration system |
| **Database** | PostgreSQL | 17 | Relational database (AWS RDS) |
| **Validation** | Zod | 3.23.8 | Runtime input validation + TypeScript type inference |
| **State** | React Query | 4.36.1 | Server state management — caching, refetching, mutations |
| **Serialization** | superjson | 2.2.1 | Extended JSON — Date, BigInt, Map, Set support |
| **Styling** | TailwindCSS | 3.4.15 | Utility-first CSS |
| **Testing** | Jest + ts-jest | 29.7.0 | Unit testing with TypeScript support |
| **Hosting** | AWS Amplify | — | SSR hosting (WEB_COMPUTE platform) |

---

## Layer Details

### 1. Presentation Layer — `src/app/`, `src/components/`

Next.js App Router ใช้ file-based routing โดยแต่ละ page เป็น React component

**Root Layout** (`src/app/layout.tsx`):
```
<html>
  <body>
    <TRPCProvider>         ← React Query + tRPC Client
      <Navigation />       ← Nav bar (Dashboard, Users, Posts, Categories)
      <main>{children}</main>
    </TRPCProvider>
  </body>
</html>
```

**Pages ทั้งหมด** ใช้ `"use client"` directive เพราะต้องการ React hooks สำหรับ tRPC queries:

| Route | Page | Description |
|-------|------|-------------|
| `/` | Dashboard | แสดงสรุป Total Users, Posts, Categories + รายการล่าสุด |
| `/users` | Users | ตารางผู้ใช้ + ค้นหา + สร้าง/แก้ไข/ลบ (offset pagination) |
| `/posts` | Posts | รายการ posts + filters (status, search) + cursor pagination |
| `/posts/[id]` | Post Detail | เนื้อหา post + comments + nested replies |
| `/categories` | Categories | Grid cards + สร้าง/แก้ไข/ลบ + auto slug generation |

**tRPC Provider** (`src/components/providers/trpc-provider.tsx`):
- สร้าง `QueryClient` — staleTime 5 วินาที, ปิด refetchOnWindowFocus
- สร้าง `trpcClient` — httpBatchLink ไปที่ `/api/trpc` + superjson transformer
- Wrap children ด้วย `trpc.Provider` + `QueryClientProvider`

### 2. API Layer — `src/server/`, `src/app/api/trpc/`

tRPC จัดการ API ทั้งหมดผ่าน endpoint เดียว `/api/trpc/[trpc]`

**tRPC Initialization** (`src/server/trpc.ts`):
```
initTRPC.context<Context>().create({
  transformer: superjson,    ← serialize Date, BigInt etc.
  errorFormatter: shape → shape
})
```

**Middleware Chain**:
```
publicProcedure    = procedure + loggerMiddleware
protectedProcedure = procedure + loggerMiddleware + isAuthed
adminProcedure     = procedure + loggerMiddleware + isAdmin
```

- `loggerMiddleware` — log ทุก request: `[tRPC] query user.list - OK (15ms)`
- `isAuthed` — ตรวจ `ctx.userId` → throw UNAUTHORIZED ถ้าไม่มี
- `isAdmin` — ตรวจ `ctx.userRole === "ADMIN"` → throw FORBIDDEN

**Context** (`src/server/context.ts`):
ทุก request สร้าง context ใหม่ที่มี:
- `prisma` — PrismaClient singleton
- `userId` — จาก header `x-user-id` (simulated auth)
- `userRole` — จาก header `x-user-role`

**Root Router** (`src/server/routers/_app.ts`):
```typescript
export const appRouter = router({
  user:     userRouter,
  post:     postRouter,
  category: categoryRouter,
  comment:  commentRouter,
  profile:  profileRouter,
});
export type AppRouter = typeof appRouter;
```
`AppRouter` type ถูก export ไปใช้ที่ client เพื่อให้ได้ type safety อัตโนมัติ

### 3. Data Layer — `src/lib/prisma.ts`, `prisma/`

**PrismaClient Singleton** (`src/lib/prisma.ts`):
- ใช้ global singleton เพื่อป้องกัน connection leak ใน development (hot reload)
- Production mode: log เฉพาะ `error`
- Development mode: log `query`, `error`, `warn`
- ส่ง `datasourceUrl: process.env.DATABASE_URL` ตรงเข้า constructor เพื่อรองรับ Amplify SSR runtime

**Prisma Schema** (`prisma/schema.prisma`):
- 6 models: User, Profile, Post, Category, PostCategory, Comment
- 2 enums: UserRole, PostStatus
- ดูรายละเอียดเพิ่มเติมที่ [DATABASE.md](./DATABASE.md)

### 4. Database Layer — PostgreSQL (AWS RDS)

- **Instance:** `energy-platform` (db.t3.micro)
- **Engine:** PostgreSQL 17.2
- **Database:** `energy-next-poc`
- **Region:** ap-southeast-1
- **Public Access:** Yes (สำหรับ POC)
- **Security Group:** Allow 0.0.0.0/0 on port 5432

---

## Data Flow

### Query Flow — ตัวอย่าง: โหลดรายการ Users

```
Browser                    Next.js Server              PostgreSQL
───────                    ──────────────              ──────────
   │                            │                          │
   │  1. trpc.user.list         │                          │
   │     .useQuery({            │                          │
   │       page: 1,             │                          │
   │       limit: 10            │                          │
   │     })                     │                          │
   │                            │                          │
   │  2. React Query checks     │                          │
   │     cache → stale          │                          │
   │                            │                          │
   │  3. GET /api/trpc/         │                          │
   │     user.list?batch=1&     │                          │
   │     input={...}            │                          │
   │ ──────────────────────────>│                          │
   │                            │                          │
   │                 4. loggerMiddleware                    │
   │                    logs request                       │
   │                            │                          │
   │                 5. Zod validates input                 │
   │                    { page: 1, limit: 10 }             │
   │                            │                          │
   │                 6. prisma.user.findMany({              │
   │                      where: { deletedAt: null },      │
   │                      skip: 0, take: 10,               │
   │                      orderBy: { createdAt: "desc" },  │
   │                      include: { profile: true,        │
   │                        _count: { select: {            │
   │                          posts: true,                 │
   │                          comments: true }}}           │
   │                    })                                 │
   │                            │ ────────────────────────>│
   │                            │                          │
   │                            │  7. SQL: SELECT ...      │
   │                            │     FROM "users"         │
   │                            │     LEFT JOIN "profiles" │
   │                            │     WHERE ...            │
   │                            │ <────────────────────────│
   │                            │                          │
   │                 8. Prisma returns typed result         │
   │                            │                          │
   │                 9. superjson serializes                │
   │                    (Date → { json: "...",             │
   │                     meta: { values: { "Date" }}})     │
   │                            │                          │
   │  10. HTTP 200 JSON         │                          │
   │ <──────────────────────────│                          │
   │                            │                          │
   │  11. React Query caches    │                          │
   │      result (5s stale)     │                          │
   │                            │                          │
   │  12. UI re-renders with    │                          │
   │      user data             │                          │
```

### Mutation Flow — ตัวอย่าง: สร้าง User ใหม่

```
Browser                    Next.js Server              PostgreSQL
───────                    ──────────────              ──────────
   │                            │                          │
   │  1. User submits form      │                          │
   │     mutation.mutate({      │                          │
   │       email: "a@b.com",    │                          │
   │       name: "Alice"        │                          │
   │     })                     │                          │
   │                            │                          │
   │  2. POST /api/trpc/       │                          │
   │     user.create            │                          │
   │ ──────────────────────────>│                          │
   │                            │                          │
   │                 3. Zod validates email format          │
   │                            │                          │
   │                 4. Check duplicate:                    │
   │                    prisma.user.findUnique({            │
   │                      where: { email: "a@b.com" }      │
   │                    })                                 │
   │                            │ ────────────────────────>│
   │                            │ <────── null ────────────│
   │                            │                          │
   │                 5. No duplicate → create:              │
   │                    prisma.user.create({                │
   │                      data: { email, name, role }      │
   │                    })                                 │
   │                            │ ────────────────────────>│
   │                            │ <──── new user ──────────│
   │                            │                          │
   │  6. HTTP 200 + new user    │                          │
   │ <──────────────────────────│                          │
   │                            │                          │
   │  7. onSuccess callback:    │                          │
   │     invalidate user.list   │                          │
   │     → auto refetch         │                          │
   │                            │                          │
   │  8. UI shows new user      │                          │
   │     in table               │                          │
```

---

## Key Design Decisions

### ทำไมใช้ tRPC แทน REST/GraphQL?

| Feature | REST | GraphQL | tRPC |
|---------|------|---------|------|
| Type Safety | ต้องเขียน types แยก | ต้อง codegen | อัตโนมัติ (infer จาก router) |
| Code Gen | ไม่จำเป็น | จำเป็น (codegen) | ไม่จำเป็น |
| Batch Requests | ไม่รองรับ | รองรับ | รองรับ (httpBatchLink) |
| Learning Curve | ง่าย | ปานกลาง | ง่าย (ถ้ารู้ TypeScript) |
| Overfetching | มีปัญหา | แก้ได้ | ไม่มี (กำหนดจาก server) |
| Dev Experience | ปานกลาง | ดี | ดีมาก (auto-complete ทุก layer) |

### ทำไมใช้ superjson?

JSON ปกติไม่รองรับ `Date` object — serialize เป็น string แล้วไม่แปลงกลับอัตโนมัติ
superjson แก้ปัญหานี้:
```typescript
// ไม่ใช้ superjson: createdAt เป็น string
{ createdAt: "2026-02-11T07:00:00.000Z" }  // typeof === "string"

// ใช้ superjson: createdAt เป็น Date object
{ createdAt: new Date("2026-02-11T07:00:00.000Z") }  // typeof === Date
```

### ทำไมใช้ App Router แทน Pages Router?

- **Latest pattern** — Recommended โดย Next.js team
- **React Server Components** — ลด JavaScript ที่ส่งไป client
- **Nested Layouts** — `layout.tsx` share UI ระหว่าง pages
- **Loading/Error states** — Built-in `loading.tsx`, `error.tsx`

### ทำไมใช้ Prisma?

- **Type-safe queries** — TypeScript types สร้างจาก schema อัตโนมัติ
- **Migration system** — Version-controlled schema changes
- **Relation handling** — `include`, `select`, nested writes
- **Prisma Studio** — Visual database browser (`npx prisma studio`)

### ทำไมใช้ output: "standalone"?

Next.js `output: "standalone"` สร้าง self-contained build ที่:
- ไม่ต้องพึ่ง `node_modules` ตัวเต็ม (copy เฉพาะที่จำเป็น)
- เหมาะกับ containerized deployment (Docker, Amplify SSR)
- ลดขนาด deployment package อย่างมาก

---

## npm Scripts

| Script | Command | Description |
|--------|---------|-------------|
| `dev` | `next dev` | Start development server (port 3000) |
| `build` | `next build` | Production build (standalone output) |
| `start` | `next start` | Start production server |
| `lint` | `next lint` | Run ESLint |
| `db:generate` | `prisma generate` | Generate Prisma Client จาก schema |
| `db:push` | `prisma db push` | Push schema ไป database (ไม่สร้าง migration) |
| `db:migrate` | `prisma migrate dev` | สร้าง + apply migration |
| `db:seed` | `ts-node prisma/seed.ts` | Seed ข้อมูลตัวอย่าง |
| `db:studio` | `prisma studio` | เปิด Visual database browser |
| `db:reset` | `prisma migrate reset` | Reset database + re-migrate |
| `test` | `jest` | Run all tests |
| `test:watch` | `jest --watch` | Re-run tests on file changes |
| `test:coverage` | `jest --coverage` | Run tests + coverage report |
| `postinstall` | `prisma generate` | Auto-generate Prisma Client หลัง `npm install` |
