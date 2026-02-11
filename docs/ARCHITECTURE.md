# Architecture Overview

## System Architecture

```
┌─────────────────────────────────────────────────────┐
│                    Browser (Client)                   │
│  ┌──────────────┐  ┌──────────────┐  ┌────────────┐ │
│  │  React Pages  │  │  Components  │  │  React     │ │
│  │  (App Router) │  │              │  │  Query     │ │
│  └──────┬───────┘  └──────────────┘  └─────┬──────┘ │
│         │                                    │        │
│         └────────────┬───────────────────────┘        │
│                      │                                │
│              ┌───────▼───────┐                        │
│              │  tRPC Client  │                        │
│              └───────┬───────┘                        │
└──────────────────────┼────────────────────────────────┘
                       │ HTTP (Batch)
┌──────────────────────┼────────────────────────────────┐
│                 Next.js Server                         │
│              ┌───────▼───────┐                        │
│              │  tRPC Server  │                        │
│              │  (API Route)  │                        │
│              └───────┬───────┘                        │
│                      │                                │
│         ┌────────────┼────────────────┐               │
│         │            │                │               │
│    ┌────▼────┐  ┌────▼────┐  ┌───────▼──────┐       │
│    │ Context │  │ Routers │  │  Middleware   │       │
│    │         │  │         │  │ (Logger/Auth) │       │
│    └────┬────┘  └────┬────┘  └──────────────┘       │
│         │            │                                │
│         └─────┬──────┘                                │
│               │                                       │
│        ┌──────▼──────┐                                │
│        │   Prisma    │                                │
│        │   Client    │                                │
│        └──────┬──────┘                                │
└───────────────┼───────────────────────────────────────┘
                │ TCP
         ┌──────▼──────┐
         │  PostgreSQL  │
         │  (Docker)    │
         └─────────────┘
```

## Layer Responsibilities

### 1. Presentation Layer (Frontend)

**Location:** `src/app/`, `src/components/`

- **Next.js App Router** — File-based routing, layouts, React Server Components support
- **React Components** — UI components พร้อม client-side interactivity
- **TailwindCSS** — Utility-first styling
- **React Query** — Server state management, caching, background refetching

### 2. API Layer (tRPC)

**Location:** `src/server/`, `src/app/api/trpc/`

- **tRPC Server** — Type-safe API endpoints, auto-generated types shared ระหว่าง client-server
- **Routers** — แยก business logic ตาม domain (user, post, category, comment, profile)
- **Middleware** — Cross-cutting concerns เช่น logging, authentication
- **Zod Validation** — Runtime input validation ที่ generate types ด้วย
- **Context** — Request-scoped data เช่น Prisma client, user session

### 3. Data Layer (Prisma)

**Location:** `src/lib/prisma.ts`, `prisma/`

- **Prisma Client** — Type-safe database queries, auto-generated from schema
- **Prisma Schema** — Database schema definition (models, relations, indexes)
- **Migrations** — Version-controlled database schema changes
- **Seed** — Initial data for development/testing

### 4. Database Layer (PostgreSQL)

**Location:** `docker-compose.yml`

- **PostgreSQL** — Relational database
- **Docker Compose** — Containerized database for consistent dev environment

## Data Flow

### Query Flow (อ่านข้อมูล)

```
1. User interacts with UI
2. React component calls trpc.post.list.useQuery()
3. React Query checks cache → if stale, makes request
4. tRPC client batches requests → sends HTTP GET to /api/trpc
5. tRPC server routes to post.list handler
6. Logger middleware logs the request
7. Handler validates input with Zod
8. Handler calls Prisma to query PostgreSQL
9. Prisma returns typed result
10. tRPC serializes with superjson → HTTP response
11. React Query caches result → triggers re-render
12. UI updates with new data
```

### Mutation Flow (เขียนข้อมูล)

```
1. User submits form
2. Component calls trpc.post.create.useMutation()
3. tRPC client sends HTTP POST to /api/trpc
4. tRPC server routes to post.create handler
5. Middleware chain executes (logger → auth if needed)
6. Zod validates input → throws if invalid
7. Business logic executes (check duplicates, etc.)
8. Prisma executes INSERT/UPDATE → returns result
9. Response sent back to client
10. React Query invalidates related queries → auto-refetch
11. UI updates with fresh data
```

## Key Design Decisions

### ทำไมใช้ tRPC แทน REST?
- **Type safety** — Types shared โดยอัตโนมัติ ไม่ต้องเขียน API types แยก
- **No code generation** — ไม่เหมือน GraphQL ที่ต้อง generate types
- **Batch requests** — tRPC batch multiple queries ใน single HTTP request
- **Developer experience** — Auto-complete, type checking ตลอด full stack

### ทำไมใช้ Prisma แทน raw SQL?
- **Type-safe queries** — TypeScript types generate จาก schema
- **Migration system** — Version-controlled schema changes
- **Relations** — Declare relations ใน schema, query with `include`
- **Studio** — Visual database browser

### ทำไมใช้ App Router แทน Pages Router?
- **Latest Next.js pattern** — Recommended โดย Vercel
- **React Server Components** — Better performance, streaming
- **Nested layouts** — Share UI between pages
- **Better data fetching** — Built-in loading/error states

### ทำไมใช้ superjson?
- **Date serialization** — JSON ไม่รองรับ Date objects, superjson แปลงให้อัตโนมัติ
- **BigInt, Map, Set** — รองรับ types ที่ JSON ปกติไม่รองรับ
