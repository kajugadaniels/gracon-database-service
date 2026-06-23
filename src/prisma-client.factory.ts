import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client';
import { normalizeDatabaseUrl } from './database-url.util';

type PrismaClientConstructorOptions = NonNullable<
  ConstructorParameters<typeof PrismaClient>[0]
>;

export interface CreatePrismaClientOptions {
  connectionString?: string;
  prismaOptions?: Omit<PrismaClientConstructorOptions, 'adapter'>;
}

export function createPrismaClient(
  options: CreatePrismaClientOptions = {},
): PrismaClient {
  const connectionString = options.connectionString ?? process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error('DATABASE_URL environment variable is not set');
  }

  const adapter = new PrismaPg({
    connectionString: normalizeDatabaseUrl(connectionString),
  });

  return new PrismaClient({
    ...options.prismaOptions,
    adapter,
  } as PrismaClientConstructorOptions);
}
