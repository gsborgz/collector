export interface Pokemon {
  id: number;
  name: string;
  cries: {
    latest: string;
    legacy: string;
  },
  sprites: {
    front_default: string;
    front_shiny?: string;
    other: {
      'official-artwork': {
        front_default: string;
      };
    };
  };
  game_indices: {
    game_index: number;
    version: {
      name: string;
      url: string;
    };
  }[];
  types: PokemonType[];
  height: number;
  weight: number;
  base_experience: number;
  moves: PokemonMove[];
  species: {
    url: string;
  };
}

export interface PokemonType {
  slot: number;
  type: {
    name: string;
    url: string;
  };
}

export interface PokemonMove {
  move: {
    name: string;
    url: string;
  };
}

export interface PokemonListResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: PokemonListItem[];
}

export interface PokemonListItem {
  name: string;
  url: string;
}

export interface PokemonSpecies {
  id: number;
  flavor_text_entries: FlavorTextEntry[];
  genera: Genus[];
  names: {
    name: string;
    language: {
      name: string;
    };
  }[];
}

export interface FlavorTextEntry {
  flavor_text: string;
  language: {
    name: string;
  };
  version: {
    name: string;
    url: string
  };
}

export interface Genus {
  genus: string;
  language: {
    name: string;
  };
}
