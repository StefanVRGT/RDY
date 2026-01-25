// Server-side exports
export {
  router,
  publicProcedure,
  protectedProcedure,
  superadminProcedure,
  middleware,
  createCallerFactory,
} from './trpc';
export type { Context } from './trpc';

// Router exports
export { appRouter } from './routers';
export type { AppRouter } from './routers';

// Client exports (for use in React components)
export { trpc } from './client';
