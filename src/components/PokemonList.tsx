import InfiniteScroll from '@components/InifiniteScroll';
import { getPokemonIdFromUrl, usePokemonList } from '@hooks/useApi';
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { PokemonListItem } from '@models/pokemon';
import { useTranslation } from 'react-i18next';
import { useDebouncedSearchTerm } from '@providers/SearchProvider';
import { useCollection } from '@providers/CollectionProvider';
import { useCollectionFilters } from '@providers/FilterProvider';
import PokemonCard from './PokemonCard';
import PokemonPicker, { PokemonPickerResult } from './PokemonPicker';
import { Button } from '@components/ui/Button';

const MIN_SEARCH_LENGTH = 2;
const SEARCH_TRAILING_BUFFER = 12;

export default function PokemonList() {
  const { t } = useTranslation();
  const {
    ownedCount,
    fullArtCount,
    totalCount,
    totalFullArtCount,
    collectionType,
    pokemonIds,
    defaultTarget,
    targetOverrides,
    updateCustomList,
    updateTargets,
    getTarget,
    getOwnedQuantity,
    getFullArtQuantity,
  } = useCollection();
  const { filters } = useCollectionFilters();
  const debouncedSearchTerm = useDebouncedSearchTerm();
  const [data, setData] = useState<PokemonListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [baseCount, setBaseCount] = useState(24);
  const [searchExpansion, setSearchExpansion] = useState(0);
  const [highlightedName, setHighlightedName] = useState<string | null>(null);
  const [editingList, setEditingList] = useState(false);
  const [savingList, setSavingList] = useState(false);
  const itemsPerPage = 12;
  const cardRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const cardRefCallbacks = useRef<Map<string, (el: HTMLDivElement | null) => void>>(new Map());
  const hadSearchExpansion = useRef(false);
  const searchExpansionRef = useRef(0);
  const scopedData = useMemo(() => {
    if (collectionType !== 'custom' || !pokemonIds) return data;

    const dataById = new Map<number, PokemonListItem>();

    data.forEach((pokemon) => dataById.set(getPokemonIdFromUrl(pokemon.url), pokemon));

    return pokemonIds
      .map((id) => dataById.get(id))
      .filter((pokemon): pokemon is PokemonListItem => Boolean(pokemon));
  }, [data, collectionType, pokemonIds]);
  const filteredData = useMemo(() => {
    if (filters.size === 0) return scopedData;

    return scopedData.filter((pokemon) => {
      const id = getPokemonIdFromUrl(pokemon.url);
      const target = getTarget(id);
      const isOwned = target.normal > 0 && getOwnedQuantity(id) >= target.normal;
      const isFullArt = target.fullArt > 0 && getFullArtQuantity(id) >= target.fullArt;

      return (
        (filters.has('owned') && isOwned) ||
        (filters.has('notOwned') && !isOwned) ||
        (filters.has('fullArt') && isFullArt)
      );
    });
  }, [scopedData, filters, getTarget, getOwnedQuantity, getFullArtQuantity]);
  const displayedCount = Math.max(baseCount, searchExpansion);
  const visiblePokemon = filteredData.slice(0, displayedCount);
  const hasNextPage = displayedCount < filteredData.length;

  useEffect(() => {
    searchExpansionRef.current = searchExpansion;
  }, [searchExpansion]);

  // Stable across renders: InfiniteScroll recreates its IntersectionObserver
  // whenever this reference changes, and a freshly (re)observed target fires
  // an immediate callback with its current intersection state. An inline
  // function here would recreate the observer on every load, causing it to
  // keep re-triggering itself in a runaway loop. It extends from the current
  // effective maximum (not just its own previous value) so that scrolling
  // past a search match keeps loading new content immediately, instead of
  // growing invisibly until it catches up to searchExpansion.
  const loadMorePokemon = useCallback(() => {
    setBaseCount(prev => {
      const current = Math.max(prev, searchExpansionRef.current);

      return Math.min(current + itemsPerPage, filteredData.length);
    });
  }, [filteredData.length]);
  const getCardRef = (name: string) => {
    let callback = cardRefCallbacks.current.get(name);

    if (!callback) {
      callback = (el) => {
        if (el) {
          cardRefs.current.set(name, el);
        } else {
          cardRefs.current.delete(name);
        }
      };
      cardRefCallbacks.current.set(name, callback);
    }

    return callback;
  };

  useEffect(() => {
    usePokemonList()
      .then((response) => {
        const data = response.results;

        setData(data);
      })
      .catch((err) => {
        setError(err);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    const term = debouncedSearchTerm.trim().toLowerCase();

    if (term.length < MIN_SEARCH_LENGTH) {
      setSearchExpansion(0);
      setHighlightedName(null);
      return;
    }

    const matchIndex = filteredData.findIndex(pokemon => pokemon.name.toLowerCase().includes(term));

    if (matchIndex === -1) {
      setSearchExpansion(0);
      setHighlightedName(null);
      return;
    }

    setSearchExpansion(Math.min(matchIndex + 1 + SEARCH_TRAILING_BUFFER, filteredData.length));
    setHighlightedName(filteredData[matchIndex].name);
  }, [debouncedSearchTerm, filteredData]);

  useEffect(() => {
    if (!highlightedName) return;

    cardRefs.current.get(highlightedName)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [highlightedName, searchExpansion]);

  useLayoutEffect(() => {
    if (searchExpansion > 0) {
      hadSearchExpansion.current = true;
      return;
    }

    if (hadSearchExpansion.current) {
      hadSearchExpansion.current = false;
      window.scrollTo({ top: 0 });
    }
  }, [searchExpansion]);

  if (editingList) {
    const isCustom = collectionType === 'custom';

    const handleConfirmEdit = async (result: PokemonPickerResult) => {
      setSavingList(true);

      try {
        if (isCustom) {
          await updateCustomList(result.pokemonIds ?? [], result.defaultTarget, result.targetOverrides);
        } else {
          await updateTargets(result.defaultTarget, result.targetOverrides);
        }

        setEditingList(false);
      } finally {
        setSavingList(false);
      }
    };

    return (
      <div className='flex flex-col gap-4'>
        <h2 className='text-center text-xl font-semibold text-primary'>
          {isCustom ? t('setup.editListTitle') : t('setup.editTargetsTitle')}
        </h2>

        <PokemonPicker
          mode={isCustom ? 'membership' : 'targets'}
          initialSelectedIds={pokemonIds ?? []}
          initialDefaultTarget={defaultTarget}
          initialTargetOverrides={targetOverrides}
          confirmLabel={isCustom ? t('setup.editListConfirm') : t('setup.editTargetsConfirm')}
          savingLabel={t('setup.saving')}
          saving={savingList}
          onConfirm={handleConfirmEdit}
          onCancel={() => setEditingList(false)}
        />
      </div>
    );
  }

  return (
    <div className='flex flex-col gap-6'>
      <div className='flex flex-wrap items-center justify-center gap-x-6 gap-y-1 text-center text-sm text-slate-500'>
        <p>{t('collection.progress', { owned: ownedCount, total: totalCount })}</p>
        <p>{t('collection.fullArtProgress', { owned: fullArtCount, total: totalFullArtCount })}</p>

        <Button variant='ghost' size='default' onClick={() => setEditingList(true)}>
          {collectionType === 'custom' ? t('setup.editList') : t('setup.editTargets')}
        </Button>
      </div>

      <InfiniteScroll
        onLoadMore={loadMorePokemon}
        hasNextPage={hasNextPage}
        isFetchingNextPage={false}
      >
        <div className='flex flex-wrap gap-4 mb-8 items-center justify-center'>
          {loading && (
            <div className='col-span-full text-center py-4'>
              <p className='text-sm text-slate-500'>{t('loading')}</p>
            </div>
          )}

          {visiblePokemon.length === 0 && !loading && (
            <div className='col-span-full text-center py-4'>
              <p className='text-sm text-slate-500'>{t('noResults')}</p>
            </div>
          )}

          {error && (
            <div className='col-span-full text-center py-4'>
              <p className='text-sm text-slate-500'>{t('error')}</p>
            </div>
          )}

          {visiblePokemon.map((pokemon) => (
            <PokemonCard
              key={pokemon.name}
              pokemon={pokemon}
              highlighted={pokemon.name === highlightedName}
              cardRef={getCardRef(pokemon.name)}
            />
          ))}
        </div>
      </InfiniteScroll>
    </div>
  );
}
