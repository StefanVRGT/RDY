import { initTRPC, TRPCError } from '@trpc/server';
import superjson from 'superjson';
import { ZodError } from 'zod';
import type { Session } from 'next-auth';
import type { Database } from '@/lib/db';

/**
 * Context for tRPC procedures
 */
export type Context = {
  session: Session | null;
  db: Database;
};

/**
 * Initialize tRPC with superjson transformer for proper serialization
 * and custom error formatter for Zod validation errors
 */
const t = initTRPC.context<Context>().create({
  transformer: superjson,
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      data: {
        ...shape.data,
        zodError: error.cause instanceof ZodError ? error.cause.flatten() : null,
      },
    };
  },
});

/**
 * Error handling middleware
 * Logs errors and handles common error cases
 */
const errorHandlingMiddleware = t.middleware(async ({ next, path }) => {
  const start = Date.now();
  const result = await next();
  const duration = Date.now() - start;

  if (!result.ok) {
    console.error(`[tRPC Error] ${path} failed after ${duration}ms:`, result.error);
  }

  return result;
});

/**
 * Public procedure - no authentication required
 * Includes error handling middleware
 */
export const publicProcedure = t.procedure.use(errorHandlingMiddleware);

/**
 * Auth middleware - ensures user is authenticated
 */
const authMiddleware = t.middleware(async ({ ctx, next }) => {
  if (!ctx.session?.user) {
    throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Not authenticated' });
  }
  return next({
    ctx: {
      ...ctx,
      session: ctx.session,
    },
  });
});

/**
 * Protected procedure - authentication required
 */
export const protectedProcedure = t.procedure.use(errorHandlingMiddleware).use(authMiddleware);

/**
 * Superadmin middleware - ensures user has superadmin role
 */
const superadminMiddleware = t.middleware(async ({ ctx, next }) => {
  if (!ctx.session?.user) {
    throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Not authenticated' });
  }
  if (!ctx.session.user.roles?.includes('superadmin')) {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'Superadmin access required' });
  }
  return next({ ctx });
});

/**
 * Superadmin procedure - superadmin role required
 */
export const superadminProcedure = t.procedure
  .use(errorHandlingMiddleware)
  .use(superadminMiddleware);

/**
 * Router and middleware exports
 */
export const router = t.router;
export const middleware = t.middleware;
export const createCallerFactory = t.createCallerFactory;
