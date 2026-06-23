import {
  existsSync,
  readdirSync,
  readFileSync,
  statSync,
} from 'node:fs';
import { join, relative, resolve } from 'node:path';

const databaseRoot = resolve(__dirname, '..');
const apiRoot = resolve(databaseRoot, '..');

const consumers = [
  'auth',
  'admin',
  'documents',
  'signature',
  'institution',
  'stamp',
  'meetings',
];

const forbiddenPackages = ['@prisma/client', '@prisma/adapter-pg', 'prisma'];
const forbiddenSourceImports = ['@prisma/client', '@prisma/adapter-pg'];
const sourceExtensions = new Set(['.js', '.mjs', '.cjs', '.ts', '.mts', '.cts']);

const errors: string[] = [];

function readJson(filePath: string): Record<string, any> {
  return JSON.parse(readFileSync(filePath, 'utf8'));
}

function relativeToApi(filePath: string): string {
  return relative(apiRoot, filePath);
}

function hasForbiddenScript(script: string): boolean {
  return /\bprisma\s+(migrate|db\s+push|generate)\b/.test(script);
}

function checkPackageFile(projectName: string, projectRoot: string): void {
  const packagePath = join(projectRoot, 'package.json');
  const packageJson = readJson(packagePath);
  const dependencies = packageJson.dependencies ?? {};
  const devDependencies = packageJson.devDependencies ?? {};

  if (dependencies['@gracon/database'] !== 'file:../database') {
    errors.push(`${projectName}/package.json must depend on @gracon/database as file:../database.`);
  }

  for (const packageName of forbiddenPackages) {
    if (dependencies[packageName] || devDependencies[packageName]) {
      errors.push(`${projectName}/package.json must not declare ${packageName}.`);
    }
  }

  for (const [scriptName, script] of Object.entries<string>(packageJson.scripts ?? {})) {
    if (hasForbiddenScript(script)) {
      errors.push(`${projectName}/package.json script "${scriptName}" runs a Prisma ownership command.`);
    }
  }
}

function checkPackageLock(projectName: string, projectRoot: string): void {
  const lockPath = join(projectRoot, 'package-lock.json');
  if (!existsSync(lockPath)) {
    return;
  }

  const lockJson = readJson(lockPath);
  const rootPackage = lockJson.packages?.[''] ?? {};
  const dependencies = rootPackage.dependencies ?? {};
  const devDependencies = rootPackage.devDependencies ?? {};

  if (dependencies['@gracon/database'] !== 'file:../database') {
    errors.push(`${projectName}/package-lock.json must lock @gracon/database as file:../database.`);
  }

  for (const packageName of forbiddenPackages) {
    if (dependencies[packageName] || devDependencies[packageName]) {
      errors.push(`${projectName}/package-lock.json root package must not lock ${packageName}.`);
    }
  }

  for (const packagePath of Object.keys(lockJson.packages ?? {})) {
    if (
      packagePath === 'node_modules/prisma' ||
      packagePath === 'node_modules/@prisma/client' ||
      packagePath === 'node_modules/@prisma/adapter-pg' ||
      packagePath.startsWith('node_modules/.prisma')
    ) {
      errors.push(`${projectName}/package-lock.json still contains stale ${packagePath}.`);
    }
  }
}

function checkOwnershipFiles(projectName: string, projectRoot: string): void {
  const forbiddenPaths = [
    'prisma.config.ts',
    'prisma/schema.prisma',
    'prisma/migrations',
  ];

  for (const forbiddenPath of forbiddenPaths) {
    const absolutePath = join(projectRoot, forbiddenPath);
    if (existsSync(absolutePath)) {
      errors.push(`${projectName} must not contain ${forbiddenPath}.`);
    }
  }
}

function walkFiles(directoryPath: string, files: string[] = []): string[] {
  if (!existsSync(directoryPath)) {
    return files;
  }

  for (const entry of readdirSync(directoryPath)) {
    const absolutePath = join(directoryPath, entry);
    const stats = statSync(absolutePath);

    if (stats.isDirectory()) {
      if (entry !== 'dist' && entry !== 'node_modules' && entry !== 'coverage') {
        walkFiles(absolutePath, files);
      }
      continue;
    }

    const extension = absolutePath.slice(absolutePath.lastIndexOf('.'));
    if (sourceExtensions.has(extension)) {
      files.push(absolutePath);
    }
  }

  return files;
}

function checkSourceImports(projectName: string, projectRoot: string): void {
  const files = [
    ...walkFiles(join(projectRoot, 'src')),
    ...walkFiles(join(projectRoot, 'scripts')),
    ...walkFiles(join(projectRoot, 'prisma')),
  ];

  for (const filePath of files) {
    const source = readFileSync(filePath, 'utf8');
    for (const importPath of forbiddenSourceImports) {
      if (source.includes(importPath)) {
        errors.push(`${relativeToApi(filePath)} imports ${importPath}; use @gracon/database instead.`);
      }
    }
  }
}

for (const consumer of consumers) {
  const projectRoot = join(apiRoot, consumer);
  checkPackageFile(consumer, projectRoot);
  checkPackageLock(consumer, projectRoot);
  checkOwnershipFiles(consumer, projectRoot);
  checkSourceImports(consumer, projectRoot);
}

if (errors.length > 0) {
  console.error('Database ownership boundary check failed:\n');
  for (const error of errors) {
    console.error(`- ${error}`);
  }
  process.exit(1);
}

console.log('Database ownership boundary check passed.');
