import { fetchRequestHandler } from '@trpc/server/adapters/fetch';
import { appRouter } from '@/lib/trpc/routers';
import type { Context } from '@/lib/trpc/trpc';
import { auth } from '@/auth';
import { db } from '@/lib/db';

/**
 * Create context for each request
 * Includes session and database connection
 */
const createContext = async (): Promise<Context> => {
  const session = await auth();
  return {
    session,
    db,
  };
};

/**
 * tRPC request handler for Next.js App Router
 */
const handler = (req: Request) =>
  fetchRequestHandler({
    endpoint: '/api/trpc',
    req,
    router: appRouter,
    createContext,
    onError:
      process.env.NODE_ENV === 'development'
        ? ({ path, error }) => {
            console.error(`❌ tRPC failed on ${path ?? '<no-path>'}: ${error.message}`);
          }
        : undefined,
  });

export { handler as GET, handler as POST };
