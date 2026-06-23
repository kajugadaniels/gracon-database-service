import { existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const databaseRoot = resolve(__dirname, '..');
const repoRoot = resolve(databaseRoot, '..', '..');

const requiredFiles = [
  'api/database/SECURITY.md',
  'api/database/docs/runtime-database-roles.md',
  'api/database/docs/table-privilege-matrix.md',
  'api/database/docs/runtime-table-grants.sql',
  'api/database/docs/deployment-secret-map.md',
  'api/database/docs/service-to-service-auth.md',
  'api/database/docs/secret-decoupling-roadmap.md',
  'api/database/docs/ci-security-checks.md',
  'api/database/docs/audit-and-monitoring.md',
  'api/database/docs/backup-and-recovery.md',
  'api/database/docs/api-edge-hardening.md',
];

const requiredRuntimeRoles = [
  'gracon_auth_app',
  'gracon_admin_app',
  'gracon_documents_app',
  'gracon_signature_app',
  'gracon_institution_app',
  'gracon_stamp_app',
  'gracon_meetings_app',
];

const errors: string[] = [];

function readRepoFile(relativePath: string): string {
  return readFileSync(join(repoRoot, relativePath), 'utf8');
}

for (const relativePath of requiredFiles) {
  if (!existsSync(join(repoRoot, relativePath))) {
    errors.push(`${relativePath} is required by the security hardening baseline.`);
  }
}

if (existsSync(join(repoRoot, 'api/database/docs/runtime-table-grants.sql'))) {
  const grantsSql = readRepoFile('api/database/docs/runtime-table-grants.sql');

  for (const role of requiredRuntimeRoles) {
    if (!grantsSql.includes(role)) {
      errors.push(`runtime-table-grants.sql must mention ${role}.`);
    }
  }

  for (const ddlPrivilege of ['CREATE ON SCHEMA', 'ALTER ', 'DROP ']) {
    if (grantsSql.includes(ddlPrivilege)) {
      errors.push(`runtime-table-grants.sql must not grant or run ${ddlPrivilege.trim()}.`);
    }
  }
}

if (existsSync(join(repoRoot, 'api/meetings/package.json'))) {
  const meetingsPackage = JSON.parse(readRepoFile('api/meetings/package.json'));
  if (!meetingsPackage.dependencies?.helmet) {
    errors.push('api/meetings must depend on helmet for API edge hardening.');
  }
}

if (existsSync(join(repoRoot, 'api/meetings/src/main.ts'))) {
  const meetingsMain = readRepoFile('api/meetings/src/main.ts');
  if (!meetingsMain.includes('app.use(helmet())')) {
    errors.push('api/meetings/src/main.ts must apply Helmet.');
  }
  if (!meetingsMain.includes("json({ limit: '25kb' })")) {
    errors.push('api/meetings/src/main.ts must enforce a JSON body limit.');
  }
}

if (existsSync(join(repoRoot, 'api/stamp/agents/security.md'))) {
  const stampSecurity = readRepoFile('api/stamp/agents/security.md');
  if (!stampSecurity.includes('internal signing APIs or KMS-backed')) {
    errors.push('api/stamp security rules must mark private-key secret sharing as transitional.');
  }
}

if (errors.length > 0) {
  console.error('Security hardening check failed:\n');
  for (const error of errors) {
    console.error(`- ${error}`);
  }
  process.exit(1);
}

console.log('Security hardening check passed.');
