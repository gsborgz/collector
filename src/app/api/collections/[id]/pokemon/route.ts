import { NextRequest, NextResponse } from 'next/server';
import { isValidCollectionId } from '@lib/collectionKey';
import { readCollection, writeCollection } from '@lib/collectionStore';
import { isValidTarget, isValidTargetOverrides } from '@lib/collectionTargets';
import { MIN_POKEMON_ID, MAX_POKEMON_ID } from '@hooks/useApi';
import { PokemonTarget } from '@models/collection';

function isValidPokemonIdList(pokemonIds: unknown): pokemonIds is number[] {
  return (
    Array.isArray(pokemonIds) &&
    pokemonIds.length > 0 &&
    pokemonIds.every((id) => Number.isInteger(id) && id >= MIN_POKEMON_ID && id <= MAX_POKEMON_ID)
  );
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  if (!isValidCollectionId(id)) {
    return NextResponse.json({ message: 'Invalid collection id' }, { status: 400 });
  }

  const body = await request.json();
  const { pokemonIds, defaultTarget, targetOverrides } = body as {
    pokemonIds?: number[];
    defaultTarget?: PokemonTarget;
    targetOverrides?: Record<string, PokemonTarget>;
  };

  if (!isValidPokemonIdList(pokemonIds)) {
    return NextResponse.json({ message: 'Invalid pokemon id list' }, { status: 400 });
  }

  if (defaultTarget !== undefined && !isValidTarget(defaultTarget)) {
    return NextResponse.json({ message: 'Invalid default target' }, { status: 400 });
  }

  if (targetOverrides !== undefined && !isValidTargetOverrides(targetOverrides)) {
    return NextResponse.json({ message: 'Invalid target overrides' }, { status: 400 });
  }

  const collection = await readCollection(id);

  if (!collection) {
    return NextResponse.json({ message: 'Collection not found' }, { status: 404 });
  }

  if (collection.type !== 'custom') {
    return NextResponse.json({ message: 'Only custom collections can have their pokemon list edited' }, { status: 400 });
  }

  collection.pokemonIds = Array.from(new Set(pokemonIds)).sort((a, b) => a - b);

  if (defaultTarget !== undefined) {
    collection.defaultTarget = defaultTarget;
  }

  if (targetOverrides !== undefined) {
    collection.targetOverrides = targetOverrides;
  }

  await writeCollection(id, collection);

  return NextResponse.json({ id, ...collection });
}
