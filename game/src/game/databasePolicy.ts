/**
 * DB policy (GDD 5.6): SQLite deferred — single-player state fits localStorage + JSON files.
 * Revisit if: cloud sync, multi-realm search over huge yishi corpora, or server-side analytics.
 */
export const SQLITE_DEFERRED_REASON =
  'Electron build uses localStorage plus optional userData JSON mirrors; no SQLite until sync or corpus scale requires it.'
