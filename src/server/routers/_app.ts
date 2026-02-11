import { router } from "../trpc";
import { userRouter } from "./user";
import { postRouter } from "./post";
import { categoryRouter } from "./category";
import { commentRouter } from "./comment";
import { profileRouter } from "./profile";

export const appRouter = router({
  user: userRouter,
  post: postRouter,
  category: categoryRouter,
  comment: commentRouter,
  profile: profileRouter,
});

export type AppRouter = typeof appRouter;
