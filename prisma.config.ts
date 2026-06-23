import 'dotenv/config';
import { defineConfig } from 'prisma/config';
import { normalizeDatabaseUrl } from './src/database-url.util';

const databaseUrl = process.env.DATABASE_MIGRATION_URL;

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'tsx prisma/seed.ts',
  },
  datasource: {
    url: databaseUrl ? normalizeDatabaseUrl(databaseUrl) : undefined,
  },
});

