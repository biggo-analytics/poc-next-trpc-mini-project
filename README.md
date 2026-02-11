# POC Next.js + tRPC + Prisma

Proof of concept สำหรับ full-stack application ที่ใช้ Next.js เป็นทั้ง frontend และ backend, tRPC สำหรับ type-safe API communication, และ Prisma ORM เชื่อมต่อกับ PostgreSQL

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript |
| API Layer | tRPC v10 |
| ORM | Prisma 5 |
| Database | PostgreSQL 16 |
| Styling | TailwindCSS |
| State Management | TanStack React Query |
| Validation | Zod |
| Testing | Jest + ts-jest |
| Container | Docker Compose |

## Quick Start

### Prerequisites

- Node.js 18+
- Docker & Docker Compose
- npm

### Setup

```bash
# 1. Clone repository
git clone <repository-url>
cd poc-next-trpc-mini-project

# 2. Install dependencies
npm install

# 3. Setup database (starts PostgreSQL, runs migrations, seeds data)
./scripts/setup-db.sh

# 4. Start development server
npm run dev
```

เปิด [http://localhost:3000](http://localhost:3000) เพื่อดูผลลัพธ์

### Manual Setup (ถ้าไม่ใช้ script)

```bash
# Start PostgreSQL
docker compose up -d postgres

# Copy environment variables
cp .env.example .env

# Generate Prisma client
npx prisma generate

# Run migrations
npx prisma migrate dev --name init

# Seed database
npm run db:seed

# Start dev server
npm run dev
```

## Available Scripts

| Script | Description |
|---|---|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |
| `npm run test` | Run tests |
| `npm run test:watch` | Run tests in watch mode |
| `npm run test:coverage` | Run tests with coverage |
| `npm run db:generate` | Generate Prisma client |
| `npm run db:migrate` | Run database migrations |
| `npm run db:push` | Push schema to database |
| `npm run db:seed` | Seed database |
| `npm run db:studio` | Open Prisma Studio |
| `npm run db:reset` | Reset database |

## Project Structure

```
src/
├── app/                          # Next.js App Router
│   ├── api/trpc/[trpc]/route.ts  # tRPC HTTP handler
│   ├── layout.tsx                # Root layout with providers
│   ├── page.tsx                  # Dashboard
│   ├── users/page.tsx            # User management
│   ├── posts/
│   │   ├── page.tsx              # Post list with infinite scroll
│   │   └── [id]/page.tsx         # Post detail with comments
│   └── categories/page.tsx       # Category management
├── server/
│   ├── trpc.ts                   # tRPC initialization & middleware
│   ├── context.ts                # Request context
│   └── routers/
│       ├── _app.ts               # Root router
│       ├── user.ts               # User CRUD
│       ├── post.ts               # Post CRUD + status transitions
│       ├── category.ts           # Category CRUD
│       ├── comment.ts            # Comment CRUD (nested)
│       └── profile.ts            # Profile upsert (1:1)
├── lib/
│   ├── prisma.ts                 # Prisma client singleton
│   └── trpc-client.ts            # tRPC React client
└── components/
    ├── providers/trpc-provider.tsx
    └── Navigation.tsx
prisma/
├── schema.prisma                 # Database schema
└── seed.ts                       # Seed data
__tests__/
├── helpers/trpc.ts               # Test utilities
└── server/routers/               # Router unit tests
scripts/
├── setup-db.sh                   # Database setup script
└── reset-db.sh                   # Database reset script
docs/
├── ARCHITECTURE.md               # Architecture overview
├── DATABASE.md                   # Database design
├── API.md                        # API reference
├── TESTING.md                    # Testing guide
└── DEPLOYMENT.md                 # Deployment guide
```

## Documentation

- [Architecture Overview](docs/ARCHITECTURE.md)
- [Database Design](docs/DATABASE.md)
- [API Reference](docs/API.md)
- [Testing Guide](docs/TESTING.md)
- [Deployment Guide](docs/DEPLOYMENT.md)

## Features Covered

### Database Patterns
- One-to-One (User ↔ Profile)
- One-to-Many (User → Posts, Post → Comments)
- Many-to-Many (Post ↔ Category via junction table)
- Self-referencing (Comment → nested replies)
- Soft delete pattern
- Enum types (UserRole, PostStatus)

### API Patterns
- Offset-based pagination (Users)
- Cursor-based pagination (Posts, Comments)
- Full CRUD operations
- Input validation with Zod
- Error handling with TRPCError
- Middleware (Logger, Auth simulation)
- Status transitions (Draft → Published → Archived)
- Upsert pattern (Profile)

### Frontend Patterns
- Server state management with React Query
- Infinite scroll (cursor pagination)
- Optimistic UI updates
- Form handling with validation
- Search and filter
- Nested comments with replies
