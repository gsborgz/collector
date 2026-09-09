import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { redis } from '@lib/redis';
import { collectionKey } from '@lib/collectionKey';
import { DEFAULT_TARGET, isValidTarget } from '@lib/collectionTargets';
import { MIN_POKEMON_ID, MAX_POKEMON_ID } from '@hooks/useApi';
import { CollectionData, CollectionType, PokemonTarget } from '@models/collection';

function isValidPokemonIdList(pokemonIds: unknown): pokemonIds is number[] {
  return (
    Array.isArray(pokemonIds) &&
    pokemonIds.length > 0 &&
    pokemonIds.every((id) => Number.isInteger(id) && id >= MIN_POKEMON_ID && id <= MAX_POKEMON_ID)
  );
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { type, pokemonIds, defaultTarget } = body as { type: CollectionType; pokemonIds?: number[]; defaultTarget?: PokemonTarget };

  if (type !== 'pokedex' && type !== 'custom') {
    return NextResponse.json({ message: 'Invalid collection type' }, { status: 400 });
  }

  if (type === 'custom' && !isValidPokemonIdList(pokemonIds)) {
    return NextResponse.json({ message: 'Invalid pokemon id list' }, { status: 400 });
  }

  if (defaultTarget !== undefined && !isValidTarget(defaultTarget)) {
    return NextResponse.json({ message: 'Invalid default target' }, { status: 400 });
  }

  const id = randomUUID();
  const collection: CollectionData = {
    type,
    ...(type === 'custom' ? { pokemonIds: Array.from(new Set(pokemonIds)).sort((a, b) => a - b) } : {}),
    defaultTarget: defaultTarget ?? DEFAULT_TARGET,
    entries: {},
  };

  await redis.set(collectionKey(id), collection);

  return NextResponse.json({ id, ...collection });
}
