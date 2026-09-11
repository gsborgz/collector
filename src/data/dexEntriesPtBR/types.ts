export interface PokemonDexEntryVariant {
  text: string;
  versions: string[];
}

// Um Pokémon pode ter mais de um texto traduzido (ex: Red/Blue compartilham o
// mesmo texto, mas Yellow tem um texto próprio) — por isso é uma lista.
export type PokemonDexEntry = PokemonDexEntryVariant[];
