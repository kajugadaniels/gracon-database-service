import { existsSync } from 'node:fs';
import { join, resolve } from 'node:path';

const databaseRoot = resolve(__dirname, '..');
const generatedClientFiles = [
  join(databaseRoot, 'src/generated/prisma/client.js'),
  join(databaseRoot, 'src/generated/prisma/client.d.ts'),
];

const missingFiles = generatedClientFiles.filter((filePath) => !existsSync(filePath));

if (missingFiles.length > 0) {
  console.error(
    [
      'The shared Prisma client has not been generated yet.',
      'Run this from api/database before building or checking the package:',
      '',
      '  npm run prisma:generate',
    ].join('\n'),
  );
  process.exit(1);
}
