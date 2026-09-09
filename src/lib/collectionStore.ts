import { redis } from '@lib/redis';
import { collectionKey } from '@lib/collectionKey';
import { DEFAULT_TARGET } from '@lib/collectionTargets';
import { CollectionData, CollectionEntry } from '@models/collection';

type StoredCollection = CollectionData | Record<string, CollectionEntry>;

function isLegacyShape(stored: StoredCollection): stored is Record<string, CollectionEntry> {
  return !('type' in stored) || !('entries' in stored);
}

export async function readCollection(id: string): Promise<CollectionData | null> {
  const stored = await redis.get<StoredCollection>(collectionKey(id));

  if (!stored) return null;

  if (isLegacyShape(stored)) {
    const normalized: CollectionData = { type: 'pokedex', defaultTarget: DEFAULT_TARGET, entries: stored };

    await redis.set(collectionKey(id), normalized);

    return normalized;
  }

  if (!stored.defaultTarget) {
    const normalized: CollectionData = { ...stored, defaultTarget: DEFAULT_TARGET };

    await redis.set(collectionKey(id), normalized);

    return normalized;
  }

  return stored;
}

export async function writeCollection(id: string, collection: CollectionData): Promise<void> {
  await redis.set(collectionKey(id), collection);
}
