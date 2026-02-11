# Database Design

## Entity Relationship Diagram

```
┌──────────────┐       ┌──────────────┐
│    users     │  1:1  │   profiles   │
│──────────────│───────│──────────────│
│ id (PK)      │       │ id (PK)      │
│ email (UQ)   │       │ bio          │
│ name         │       │ avatar       │
│ role (enum)  │       │ website      │
│ createdAt    │       │ userId (FK)  │
│ updatedAt    │       │ createdAt    │
│ deletedAt    │       │ updatedAt    │
└──────┬───────┘       └──────────────┘
       │
       │ 1:N
       │
┌──────▼───────┐       ┌────────────────┐       ┌──────────────┐
│    posts     │  M:N  │post_categories │  M:N  │  categories  │
│──────────────│───────│────────────────│───────│──────────────│
│ id (PK)      │       │ postId (FK)    │       │ id (PK)      │
│ title        │       │ categoryId(FK) │       │ name (UQ)    │
│ content      │       │ assignedAt     │       │ slug (UQ)    │
│ status (enum)│       └────────────────┘       │ createdAt    │
│ authorId (FK)│                                │ updatedAt    │
│ createdAt    │                                └──────────────┘
│ updatedAt    │
│ deletedAt    │
└──────┬───────┘
       │
       │ 1:N
       │
┌──────▼───────┐
│   comments   │
│──────────────│
│ id (PK)      │
│ content      │
│ authorId (FK)│──── FK → users
│ postId (FK)  │──── FK → posts
│ parentId(FK) │──── FK → comments (self-ref)
│ createdAt    │
│ updatedAt    │
└──────────────┘
```

## Relationship Patterns

### 1. One-to-One: User ↔ Profile

```prisma
model User {
  profile Profile? // optional 1:1
}

model Profile {
  userId String @unique
  user   User   @relation(fields: [userId], references: [id], onDelete: Cascade)
}
```

**Use case:** ข้อมูลเพิ่มเติมที่ไม่จำเป็นต้องโหลดทุกครั้ง

### 2. One-to-Many: User → Posts

```prisma
model User {
  posts Post[]
}

model Post {
  authorId String
  author   User @relation(fields: [authorId], references: [id], onDelete: Cascade)
}
```

**Use case:** User คนหนึ่งมีได้หลาย Post

### 3. Many-to-Many: Post ↔ Category

```prisma
model Post {
  categories PostCategory[]
}

model Category {
  posts PostCategory[]
}

model PostCategory {
  postId     String
  categoryId String
  post       Post     @relation(...)
  category   Category @relation(...)
  @@id([postId, categoryId])
}
```

**Use case:** Post มีได้หลาย Category, Category มีได้หลาย Post
**ใช้ explicit junction table** เพราะเก็บ `assignedAt` ด้วย

### 4. Self-Referencing: Comment → Comment (Nested Replies)

```prisma
model Comment {
  parentId String?
  parent   Comment?  @relation("CommentReplies", fields: [parentId], references: [id])
  replies  Comment[] @relation("CommentReplies")
}
```

**Use case:** Comment ที่ตอบกลับ Comment อื่น (nested)

## Enums

### UserRole
| Value | Description |
|---|---|
| `ADMIN` | ผู้ดูแลระบบ |
| `USER` | ผู้ใช้ทั่วไป |

### PostStatus
| Value | Description | Transitions |
|---|---|---|
| `DRAFT` | ฉบับร่าง | → PUBLISHED |
| `PUBLISHED` | เผยแพร่แล้ว | → ARCHIVED |
| `ARCHIVED` | จัดเก็บแล้ว | (terminal) |

## Soft Delete Pattern

ใช้ `deletedAt` field แทนการลบข้อมูลจริง:

```prisma
model User {
  deletedAt DateTime?
}
```

**Query pattern:**
```typescript
// ดึงเฉพาะข้อมูลที่ยังไม่ถูกลบ
where: { deletedAt: null }
```

**ข้อดี:**
- กู้คืนข้อมูลได้
- เก็บประวัติ
- ไม่กระทบ foreign key constraints

## Indexes

```prisma
@@index([email])      // User: search by email
@@index([role])       // User: filter by role
@@index([authorId])   // Post: filter by author
@@index([status])     // Post: filter by status
@@index([createdAt])  // Post: sort by date
@@index([postId])     // Comment: filter by post
@@index([authorId])   // Comment: filter by author
@@index([parentId])   // Comment: find replies
```

## Migration Commands

```bash
# สร้าง migration ใหม่
npx prisma migrate dev --name <migration-name>

# Apply migration (production)
npx prisma migrate deploy

# Reset database (ลบทุกอย่าง แล้วสร้างใหม่)
npx prisma migrate reset

# ดู status ของ migrations
npx prisma migrate status
```

## Seed Data

`prisma/seed.ts` สร้างข้อมูลตัวอย่าง:
- 1 Admin user + 5 Regular users (พร้อม Profiles)
- 5 Categories
- 15 Posts (กระจายทุก status)
- Comments พร้อม nested replies

```bash
npm run db:seed
```
