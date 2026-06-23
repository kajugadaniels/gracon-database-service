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

export function createPrismaClientOptions(
  options: CreatePrismaClientOptions = {},
): PrismaClientConstructorOptions {
  const connectionString = options.connectionString ?? process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error('DATABASE_URL environment variable is not set');
  }

  const adapter = new PrismaPg({
    connectionString: normalizeDatabaseUrl(connectionString),
  });

  return {
    ...options.prismaOptions,
    adapter,
  } as PrismaClientConstructorOptions;
}

export function createPrismaClient(
  options: CreatePrismaClientOptions = {},
): PrismaClient {
  return new PrismaClient(createPrismaClientOptions(options));
}
