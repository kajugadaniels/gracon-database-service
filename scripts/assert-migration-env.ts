import 'dotenv/config';

const commandName = process.argv[2] ?? 'database command';
const migrationUrl = process.env.DATABASE_MIGRATION_URL;

if (!migrationUrl) {
  console.error(
    `${commandName} requires DATABASE_MIGRATION_URL. ` +
      'Do not use service runtime DATABASE_URL for migration commands.',
  );
  process.exit(1);
}

try {
  const parsedUrl = new URL(migrationUrl);
  const username = decodeURIComponent(parsedUrl.username).toLowerCase();

  if (username.includes('_app') || username.includes('readonly')) {
    console.error(
      `${commandName} appears to be using a runtime database role (${username}). ` +
        'Use the dedicated migration owner role instead.',
    );
    process.exit(1);
  }
} catch {
  console.error(`${commandName} received an invalid DATABASE_MIGRATION_URL.`);
  process.exit(1);
}

