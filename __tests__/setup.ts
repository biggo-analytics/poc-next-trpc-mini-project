// Global test setup - runs before each test suite
process.env.DATABASE_URL =
  process.env.DATABASE_URL ||
  "postgresql://postgres:postgres@localhost:5432/poc_next_trpc_test?schema=public";
