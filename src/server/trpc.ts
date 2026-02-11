import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import { type Context } from "./context";

const t = initTRPC.context<Context>().create({
  transformer: superjson,
  errorFormatter({ shape }) {
    return shape;
  },
});

// ============================================================
// Middleware
// ============================================================

/** Logger middleware - บันทึก request/response time */
const loggerMiddleware = t.middleware(async ({ path, type, next }) => {
  const start = Date.now();
  const result = await next();
  const durationMs = Date.now() - start;

  if (result.ok) {
    console.log(`[tRPC] ${type} ${path} - OK (${durationMs}ms)`);
  } else {
    console.error(`[tRPC] ${type} ${path} - ERROR (${durationMs}ms)`);
  }

  return result;
});

/** Auth middleware - ตรวจสอบว่า user login แล้ว (simulated) */
const isAuthed = t.middleware(async ({ ctx, next }) => {
  if (!ctx.userId) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "You must be logged in to perform this action",
    });
  }
  return next({
    ctx: {
      ...ctx,
      userId: ctx.userId,
    },
  });
});

/** Admin middleware - ตรวจสอบว่าเป็น admin */
const isAdmin = t.middleware(async ({ ctx, next }) => {
  if (!ctx.userId || ctx.userRole !== "ADMIN") {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Only admins can perform this action",
    });
  }
  return next({
    ctx: {
      ...ctx,
      userId: ctx.userId,
      userRole: ctx.userRole as "ADMIN",
    },
  });
});

// ============================================================
// Exports
// ============================================================

export const router = t.router;
export const publicProcedure = t.procedure.use(loggerMiddleware);
export const protectedProcedure = t.procedure.use(loggerMiddleware).use(isAuthed);
export const adminProcedure = t.procedure.use(loggerMiddleware).use(isAdmin);
