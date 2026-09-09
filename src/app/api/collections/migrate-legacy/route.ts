import { NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { redis } from '@lib/redis';
import { collectionKey } from '@lib/collectionKey';
import { DEFAULT_TARGET } from '@lib/collectionTargets';
import { CollectionData, CollectionEntries } from '@models/collection';

const LEGACY_COLLECTION_KEY = 'collection';

export async function POST() {
  const legacy = await redis.get<CollectionEntries>(LEGACY_COLLECTION_KEY);

  if (!legacy || Object.keys(legacy).length === 0) {
    return NextResponse.json({ id: null });
  }

  const id = randomUUID();
  const collection: CollectionData = { type: 'pokedex', defaultTarget: DEFAULT_TARGET, entries: legacy };

  await redis.set(collectionKey(id), collection);
  await redis.del(LEGACY_COLLECTION_KEY);

  return NextResponse.json({ id });
}
