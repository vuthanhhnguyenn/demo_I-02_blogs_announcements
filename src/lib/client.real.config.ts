import type { CreateClientConfig } from '@/lib/api-real/client.gen';

export const createClientConfig: CreateClientConfig = (config) => ({
  ...config,
  baseUrl: process.env.NEXT_PUBLIC_REAL_API_URL ?? 'http://localhost:8000',
});
