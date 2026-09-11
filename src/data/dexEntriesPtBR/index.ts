import type { PokemonDexEntry } from './types';

export type { PokemonDexEntry } from './types';

interface Generation {
  minId: number;
  maxId: number;
  load: () => Promise<Record<number, PokemonDexEntry>>;
}

// Cada geração vive em seu próprio arquivo e só é baixada pelo cliente quando
// um Pokémon daquela faixa de ids é exibido em pt-BR, em vez de todo o
// dicionário de traduções entrar no bundle inicial da página.
const GENERATIONS: Generation[] = [
  {
    minId: 1,
    maxId: 151,
    load: () => import('./gen1').then((module) => module.pokemonDexEntriesPtBRGen1),
  },
];

const generationCache = new Map<Generation, Promise<Record<number, PokemonDexEntry>>>();

export async function getPokemonDexEntryPtBR(speciesId: number): Promise<PokemonDexEntry | null> {
  const generation = GENERATIONS.find((gen) => speciesId >= gen.minId && speciesId <= gen.maxId);

  if (!generation) return null;

  let entriesPromise = generationCache.get(generation);

  if (!entriesPromise) {
    entriesPromise = generation.load().catch((error) => {
      // Não mantém uma promise rejeitada em cache (ex: chunk desatualizado
      // após um deploy), para que uma tentativa futura possa ter sucesso.
      generationCache.delete(generation);

      throw error;
    });
    generationCache.set(generation, entriesPromise);
  }

  const entries = await entriesPromise;

  return entries[speciesId] ?? null;
}
