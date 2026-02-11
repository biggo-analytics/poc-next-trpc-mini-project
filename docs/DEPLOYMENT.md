# Deployment Guide — AWS Amplify

## Overview

Guide สำหรับ deploy Next.js + tRPC + Prisma application บน AWS Amplify พร้อม Amazon RDS PostgreSQL

## Architecture บน AWS

```
┌─────────────────────────────────────────┐
│              AWS Amplify                 │
│  ┌───────────────────────────────────┐  │
│  │      Next.js Application          │  │
│  │  (SSR + API Routes + tRPC)        │  │
│  └────────────────┬──────────────────┘  │
└───────────────────┼─────────────────────┘
                    │
                    │ VPC / Security Group
                    │
┌───────────────────▼─────────────────────┐
│            Amazon RDS                    │
│  ┌───────────────────────────────────┐  │
│  │      PostgreSQL 16                │  │
│  │  (db.t3.micro for POC)           │  │
│  └───────────────────────────────────┘  │
└─────────────────────────────────────────┘
```

## Prerequisites

1. AWS Account
2. AWS CLI configured
3. GitHub repository (สำหรับ auto deploy)

## Step 1: Setup Amazon RDS PostgreSQL

### สร้าง RDS Instance

1. เข้า AWS Console → RDS → Create Database
2. ตั้งค่า:
   - **Engine:** PostgreSQL 16
   - **Template:** Free tier (สำหรับ POC)
   - **DB Instance Class:** db.t3.micro
   - **Storage:** 20 GB gp3
   - **DB Instance Identifier:** `poc-next-trpc-db`
   - **Master Username:** `postgres`
   - **Master Password:** (สร้าง password ที่ปลอดภัย)
   - **Database Name:** `poc_next_trpc`

3. Network Settings:
   - **VPC:** Default VPC
   - **Public Access:** Yes (สำหรับ POC เท่านั้น, production ควรใช้ VPC endpoint)
   - **Security Group:** สร้างใหม่ อนุญาต port 5432

4. คัดลอก **Endpoint** หลังจากสร้างเสร็จ เช่น:
   ```
   poc-next-trpc-db.xxxxxxxxxxxx.ap-southeast-1.rds.amazonaws.com
   ```

### Connection String

```
DATABASE_URL="postgresql://postgres:<password>@<endpoint>:5432/poc_next_trpc?schema=public"
```

## Step 2: Run Migrations

ก่อน deploy ครั้งแรก ต้อง run migrations กับ production database:

```bash
# Set production DATABASE_URL
export DATABASE_URL="postgresql://postgres:<password>@<endpoint>:5432/poc_next_trpc?schema=public"

# Run migrations
npx prisma migrate deploy

# (Optional) Seed initial data
npm run db:seed
```

## Step 3: Setup AWS Amplify

### สร้าง Amplify App

1. เข้า AWS Console → AWS Amplify → New App → Host Web App
2. เลือก **GitHub** → Authorize → เลือก repository
3. เลือก branch: `main`
4. Build settings:
   - Amplify จะตรวจจับ `amplify.yml` อัตโนมัติ
   - หรือใช้ build settings ต่อไปนี้:

### Build Configuration (`amplify.yml`)

```yaml
version: 1
frontend:
  phases:
    preBuild:
      commands:
        - npm ci
        - npx prisma generate
    build:
      commands:
        - npm run build
  artifacts:
    baseDirectory: .next
    files:
      - "**/*"
  cache:
    paths:
      - node_modules/**/*
      - .next/cache/**/*
```

### Environment Variables

ตั้งค่าใน Amplify Console → App Settings → Environment Variables:

| Variable | Value | Description |
|---|---|---|
| `DATABASE_URL` | `postgresql://...` | RDS connection string |
| `NEXT_PUBLIC_APP_URL` | `https://xxx.amplifyapp.com` | App URL |

**สำคัญ:** อย่าเก็บ `DATABASE_URL` ใน code หรือ `.env` file ใน repository

## Step 4: Deploy

### Auto Deploy
- Push code ไปที่ branch ที่เชื่อมกับ Amplify
- Amplify จะ build และ deploy อัตโนมัติ

### Manual Deploy
```bash
# ผ่าน Amplify Console
# App → branch → Redeploy this version
```

## Step 5: Verify

1. เปิด Amplify App URL
2. ตรวจสอบว่าหน้า Dashboard แสดงข้อมูลจาก database
3. ทดสอบ CRUD operations ทุก feature

## Production Considerations

### Database

- [ ] ใช้ **VPC Endpoint** แทน public access
- [ ] Enable **Multi-AZ** สำหรับ high availability
- [ ] ตั้งค่า **automated backups**
- [ ] ใช้ **AWS Secrets Manager** สำหรับเก็บ credentials
- [ ] ตั้งค่า **connection pooling** (PgBouncer หรือ Prisma Accelerate)

### Application

- [ ] ตั้งค่า **custom domain**
- [ ] Enable **HTTPS** (Amplify ให้ฟรี)
- [ ] ตั้งค่า **environment variables** สำหรับแต่ละ environment (dev/staging/prod)
- [ ] เพิ่ม **monitoring** (CloudWatch, Sentry)
- [ ] ตั้งค่า **rate limiting**

### Security

- [ ] เพิ่ม **real authentication** (NextAuth.js, Cognito)
- [ ] ตั้งค่า **CORS** อย่างเหมาะสม
- [ ] ใช้ **environment-specific** configurations
- [ ] Enable **WAF** สำหรับ protection

### Performance

- [ ] ใช้ **Prisma Accelerate** สำหรับ connection pooling
- [ ] ตั้งค่า **caching strategy** (Redis, CloudFront)
- [ ] Optimize **database queries** ด้วย indexes
- [ ] Enable **ISR/SSG** สำหรับ static pages

## Alternative: Deploy with Docker

สำหรับ deploy บน ECS/EKS หรือ self-hosted:

```dockerfile
FROM node:18-alpine AS base

# Install dependencies
FROM base AS deps
WORKDIR /app
COPY package*.json ./
COPY prisma ./prisma/
RUN npm ci
RUN npx prisma generate

# Build
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# Production
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

EXPOSE 3000
CMD ["node", "server.js"]
```

## Troubleshooting

### Build Fails: "prisma generate"
```
ตรวจสอบว่า prisma อยู่ใน dependencies (ไม่ใช่แค่ devDependencies)
หรือเพิ่มใน preBuild commands
```

### Database Connection Timeout
```
ตรวจสอบ:
1. Security Group อนุญาต traffic จาก Amplify
2. RDS endpoint ถูกต้อง
3. DATABASE_URL format ถูกต้อง
```

### Migration Issues
```
Run migrations locally ก่อน deploy:
DATABASE_URL="<production-url>" npx prisma migrate deploy
```
