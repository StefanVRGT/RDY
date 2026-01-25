import { createTRPCReact } from '@trpc/react-query';
import type { AppRouter } from './routers';

/**
 * tRPC React client with TanStack Query integration
 * Provides type-safe hooks for all API procedures
 */
export const trpc = createTRPCReact<AppRouter>();
