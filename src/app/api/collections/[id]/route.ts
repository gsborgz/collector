import { NextRequest, NextResponse } from 'next/server';
import { isValidCollectionId } from '@lib/collectionKey';
import { readCollection, writeCollection } from '@lib/collectionStore';
import { CollectionEntry } from '@models/collection';

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  if (!isValidCollectionId(id)) {
    return NextResponse.json({ message: 'Invalid collection id' }, { status: 400 });
  }

  const collection = await readCollection(id);

  if (!collection) {
    return NextResponse.json({ message: 'Collection not found' }, { status: 404 });
  }

  return NextResponse.json({ id, ...collection });
}

function isNonNegativeInteger(value: unknown): value is number {
  return Number.isInteger(value) && (value as number) >= 0;
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  if (!isValidCollectionId(id)) {
    return NextResponse.json({ message: 'Invalid collection id' }, { status: 400 });
  }

  const body = await request.json();
  const { pokemonId, owned, ownedCount, fullArtCount } = body as {
    pokemonId: string;
    owned?: boolean;
    ownedCount?: number;
    fullArtCount?: number;
  };

  if (!pokemonId) {
    return NextResponse.json({ message: 'Missing pokemon id' }, { status: 400 });
  }

  if (ownedCount !== undefined && !isNonNegativeInteger(ownedCount)) {
    return NextResponse.json({ message: 'Invalid ownedCount' }, { status: 400 });
  }

  if (fullArtCount !== undefined && !isNonNegativeInteger(fullArtCount)) {
    return NextResponse.json({ message: 'Invalid fullArtCount' }, { status: 400 });
  }

  const collection = await readCollection(id);

  if (!collection) {
    return NextResponse.json({ message: 'Collection not found' }, { status: 404 });
  }

  const current: CollectionEntry = collection.entries[pokemonId] || { owned: false, fullArt: false };
  const updated: CollectionEntry = {
    ...current,
    owned: owned ?? current.owned,
    ownedCount: ownedCount ?? current.ownedCount,
    fullArtCount: fullArtCount ?? current.fullArtCount,
  };

  collection.entries[pokemonId] = updated;

  await writeCollection(id, collection);

  return NextResponse.json(updated);
}
