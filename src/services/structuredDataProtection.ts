import { loadSnapshot, persistSnapshot } from '@/db/repositories';
import type { AppDataSnapshot } from '@/types/models';

export async function protectStructuredDataAtRest(snapshot: AppDataSnapshot) {
  if (snapshot.appPreferences.structuredDataProtected) {
    return { migrated: false, snapshot };
  }

  await persistSnapshot({
    ...snapshot,
    appPreferences: {
      ...snapshot.appPreferences,
      structuredDataProtected: true,
    },
  });

  return {
    migrated: true,
    snapshot: await loadSnapshot(),
  };
}
