const LEGACY_SSL_MODES = new Set(['prefer', 'require', 'verify-ca']);

/**
 * Preserves strict TLS behavior by rewriting legacy sslmode aliases to
 * sslmode=verify-full unless libpq compatibility was explicitly requested.
 */
export function normalizeDatabaseUrl(databaseUrl: string): string {
  try {
    const parsedUrl = new URL(databaseUrl);
    const sslMode = parsedUrl.searchParams.get('sslmode')?.toLowerCase();
    const useLibpqCompat =
      parsedUrl.searchParams.get('uselibpqcompat')?.toLowerCase() === 'true';

    if (!sslMode || useLibpqCompat || !LEGACY_SSL_MODES.has(sslMode)) {
      return databaseUrl;
    }

    parsedUrl.searchParams.set('sslmode', 'verify-full');
    return parsedUrl.toString();
  } catch {
    return databaseUrl;
  }
}

