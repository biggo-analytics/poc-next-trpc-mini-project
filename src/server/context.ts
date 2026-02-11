import { prisma } from "@/lib/prisma";
import type { FetchCreateContextFnOptions } from "@trpc/server/adapters/fetch";

export async function createContext(opts?: FetchCreateContextFnOptions) {
  // Simulate auth by reading from header
  const userId = opts?.req.headers.get("x-user-id") ?? undefined;
  const userRole = opts?.req.headers.get("x-user-role") ?? undefined;

  return {
    prisma,
    userId,
    userRole,
  };
}

export type Context = Awaited<ReturnType<typeof createContext>>;
