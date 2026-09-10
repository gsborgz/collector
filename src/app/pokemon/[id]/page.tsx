'use client'

import { useParams, useRouter } from 'next/navigation';
import { useState, useEffect, useRef, useCallback } from 'react';
import { Pokemon, PokemonSpecies } from '@models/pokemon';
import { usePokemonDetails, usePokemonSpeciesById, MIN_POKEMON_ID, MAX_POKEMON_ID } from '@hooks/useApi';
import { usePokemonCards, matchesPokemonName } from '@hooks/usePokemonCards';
import { ArrowLeft, ArrowRight, Check, Play, Pause } from 'lucide-react';
import { concatClassNames } from '@lib/utils';
import { useTranslation } from 'react-i18next';
import { Button } from '@components/ui/Button';
import Skeleton from '@components/ui/Skeleton';
import Image from 'next/image';
import Badge from '@components/ui/Badge';
import { Select } from '@components/ui/Select';
import Separator from '@components/ui/Separator';
import Checkbox from '@components/ui/Checkbox';
import QuantityStepper from '@components/ui/QuantityStepper';
import { useCollection } from '@providers/CollectionProvider';
import InfiniteScroll from '@components/InifiniteScroll';
import Modal from '@components/ui/Modal';
import { pokemonDexEntriesPtBR } from '@data/pokemonDescriptions.pt-br';

export default function PokemonDetails() {
  const router = useRouter();
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pokemon, setPokemon] = useState<Pokemon | null>(null);
  const [species, setSpecies] = useState<PokemonSpecies | null>(null);
  const currentId = parseInt(id, 10);
  const returnToList = () => {
    router.push('/');
  };
  const navigateToPokemon = (targetId: number) => {
    router.push(`/pokemon/${targetId}`);
  };

  useEffect(() => {
    const getPokemonDetails = async (id: string) => {
      const [pokemonData, speciesData] = await Promise.all([
        usePokemonDetails(id),
        usePokemonSpeciesById(id),
      ]);

      setPokemon(pokemonData);
      setSpecies(speciesData);
    };

    getPokemonDetails(id)
      .catch((err) => {
        setError(err.message);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [id]);

  // Warms the cache for the neighboring pages so the prev/next arrows feel
  // instant instead of triggering a fresh PokeAPI round trip on click.
  useEffect(() => {
    const prevId = currentId - 1;
    const nextId = currentId + 1;

    if (prevId >= MIN_POKEMON_ID) {
      usePokemonDetails(prevId.toString()).catch(() => {});
      usePokemonSpeciesById(prevId.toString()).catch(() => {});
    }

    if (nextId <= MAX_POKEMON_ID) {
      usePokemonDetails(nextId.toString()).catch(() => {});
      usePokemonSpeciesById(nextId.toString()).catch(() => {});
    }
  }, [currentId]);

  return (
    <section className='flex flex-col gap-4'>
      <div className='container'>
        <Button onClick={returnToList} variant='ghost'>
          <ArrowLeft className='w-4 h-4 ml-2' />
          {t('returnToPokedex')}
        </Button>
      </div>

      <div className='container max-w-4xl mx-auto py-8'>
        <div className='flex items-start gap-2 md:gap-4'>
          <Button
            variant='ghost'
            size='icon'
            className='shrink-0 mt-16 md:mt-20 lg:mt-28'
            onClick={() => navigateToPokemon(currentId - 1)}
            disabled={currentId <= MIN_POKEMON_ID}
            aria-label={t('previousPokemon')}
          >
            <ArrowLeft className='w-5 h-5' />
          </Button>

          <div className='flex-1 min-w-0 cursor-default border border-slate-400 shadow-md rounded-lg bg-slate-50 dark:bg-slate-950'>
            { (loading && <LoadingDetails />) || (error && <ErrorDetails message={error} />) || (pokemon && (
              <>
                <NormalDetails pokemon={pokemon} species={species} />
                <TcgCards pokemon={pokemon} species={species} />
              </>
            )) }
          </div>

          <Button
            variant='ghost'
            size='icon'
            className='shrink-0 mt-16 md:mt-20 lg:mt-28'
            onClick={() => navigateToPokemon(currentId + 1)}
            disabled={currentId >= MAX_POKEMON_ID}
            aria-label={t('nextPokemon')}
          >
            <ArrowRight className='w-5 h-5' />
          </Button>
        </div>
      </div>
    </section>
  );
}

const CARDS_PER_PAGE = 8;

function TcgCards({ pokemon, species }: { pokemon: Pokemon, species: PokemonSpecies | null }) {
  const { t, i18n } = useTranslation();
  const { getEntry, toggleOwned } = useCollection();
  const name = (species && getPokemonName(species, i18n.language)) || pokemon.name;
  const [loading, setLoading] = useState(true);
  const [isFetchingNextPage, setIsFetchingNextPage] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cards, setCards] = useState<Awaited<ReturnType<typeof usePokemonCards>>>([]);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const pageRef = useRef(1);
  const isFetchingRef = useRef(false);
  const pendingCardAdvance = useRef(false);
  const selectedCard = selectedIndex !== null ? cards[selectedIndex] ?? null : null;

  useEffect(() => {
    pageRef.current = 1;
    isFetchingRef.current = false;
    setLoading(true);
    setError(null);
    setCards([]);
    setHasNextPage(false);

    usePokemonCards(name, i18n.language, 1, CARDS_PER_PAGE)
      .then((cardsData) => {
        setCards(cardsData.filter((card) => card.image && matchesPokemonName(card.name, name)));
        setHasNextPage(cardsData.length === CARDS_PER_PAGE);
      })
      .catch((err) => {
        setError(err.message);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [name, i18n.language]);

  const loadMoreCards = useCallback(() => {
    if (isFetchingRef.current) return;

    const nextPage = pageRef.current + 1;

    isFetchingRef.current = true;
    setIsFetchingNextPage(true);

    usePokemonCards(name, i18n.language, nextPage, CARDS_PER_PAGE)
      .then((cardsData) => {
        pageRef.current = nextPage;
        setCards((prev) => [...prev, ...cardsData.filter((card) => card.image && matchesPokemonName(card.name, name))]);
        setHasNextPage(cardsData.length === CARDS_PER_PAGE);
      })
      .catch((err) => {
        setError(err.message);
      })
      .finally(() => {
        setIsFetchingNextPage(false);
        isFetchingRef.current = false;
      });
  }, [name, i18n.language]);

  useEffect(() => {
    if (!pendingCardAdvance.current) return;

    pendingCardAdvance.current = false;
    setSelectedIndex((prev) => (prev !== null && prev + 1 < cards.length ? prev + 1 : prev));
  }, [cards]);

  const goToPreviousCard = () => {
    setSelectedIndex((prev) => (prev !== null && prev > 0 ? prev - 1 : prev));
  };

  const goToNextCard = () => {
    setSelectedIndex((prev) => {
      if (prev === null) return prev;

      if (prev + 1 < cards.length) {
        return prev + 1;
      }

      if (hasNextPage && !isFetchingRef.current) {
        pendingCardAdvance.current = true;
        loadMoreCards();
      }

      return prev;
    });
  };

  return (
    <div className='cursor-default p-6 pt-0'>
      <Separator className='mb-6' />

      <h2 className='text-lg font-semibold mb-4'>{t('tcgCards')}</h2>

      { loading && (
        <div className='grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4'>
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className='h-40 sm:h-64 w-full rounded-lg' />
          ))}
        </div>
      ) }

      { !loading && error && (
        <p className='text-center text-red-500'>{t('error')}</p>
      ) }

      { !loading && !error && cards.length === 0 && (
        <p className='text-center text-muted-foreground'>{t('noCards')}</p>
      ) }

      { !loading && !error && cards.length > 0 && (
        <InfiniteScroll
          onLoadMore={loadMoreCards}
          hasNextPage={hasNextPage}
          isFetchingNextPage={isFetchingNextPage}
        >
          <div className='grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4'>
            {cards.map((card, index) => {
              const owned = getEntry(card.id).owned;

              return (
                <div key={card.id} className='relative'>
                  <Image
                    src={card.getImageURL('high', 'png')}
                    alt={card.name}
                    width={245}
                    height={342}
                    className={concatClassNames(
                      'w-full h-auto cursor-pointer transition-transform duration-200 hover:scale-110 hover:relative hover:z-10',
                      owned && 'rounded-xl ring-2 ring-emerald-400 ring-offset-2 ring-offset-white dark:ring-offset-slate-900'
                    )}
                    onError={handleImageError}
                    onClick={() => setSelectedIndex(index)}
                  />

                  {owned && (
                    <div className='absolute top-1.5 right-1.5 bg-emerald-500 text-white rounded-full p-1 shadow-md ring-2 ring-white dark:ring-slate-900'>
                      <Check className='h-3 w-3' strokeWidth={3} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </InfiniteScroll>
      ) }

      <Modal open={selectedIndex !== null} onClose={() => setSelectedIndex(null)}>
        {selectedCard && (
          <div className='flex items-center gap-2 md:gap-4'>
            <button
              type='button'
              onClick={goToPreviousCard}
              disabled={selectedIndex === null || selectedIndex <= 0}
              aria-label={t('previousCard')}
              className='cursor-pointer shrink-0 text-slate-50 hover:text-slate-300 transition-colors disabled:opacity-30 disabled:pointer-events-none'
            >
              <ArrowLeft className='w-6 h-6 md:w-8 md:h-8' />
            </button>

            <div className='flex flex-col items-center gap-3'>
              <Image
                src={selectedCard.getImageURL('high', 'png')}
                alt={selectedCard.name}
                width={735}
                height={1026}
                className='max-h-[85vh] w-auto rounded-lg'
                onError={handleImageError}
              />

              <Checkbox
                checked={getEntry(selectedCard.id).owned}
                onChange={() => toggleOwned(selectedCard.id)}
                label={t('collection.owned')}
                className='text-slate-50 bg-black/60 px-3 py-1.5 rounded-full'
              />
            </div>

            <button
              type='button'
              onClick={goToNextCard}
              disabled={selectedIndex === null || (selectedIndex >= cards.length - 1 && !hasNextPage)}
              aria-label={t('nextCard')}
              className='cursor-pointer shrink-0 text-slate-50 hover:text-slate-300 transition-colors disabled:opacity-30 disabled:pointer-events-none'
            >
              <ArrowRight className='w-6 h-6 md:w-8 md:h-8' />
            </button>
          </div>
        )}
      </Modal>
    </div>
  );
}

function LoadingDetails() {
  return (
    <div className='cursor-default border border-slate-400 rounded-lg'>
      <div className='flex items-center gap-4'>
        <Skeleton className='h-32 w-32 rounded-full' />
        <div className='space-y-2'>
          <Skeleton className='h-8 w-40' />
          <div className='flex gap-2'>
            <Skeleton className='h-6 w-16 rounded-full' />
            <Skeleton className='h-6 w-16 rounded-full' />
          </div>
        </div>
      </div>
      <Skeleton className='h-20 w-full' />
      <Skeleton className='h-40 w-full' />
    </div>
  );
}

function ErrorDetails({ message }: { message: string }) {
  return (
    <div className='text-center text-red-500 p-6'>
      <p>Erro ao carregar os dados da Pokédex: {message}</p>
    </div>
  );
}

function NormalDetails({ pokemon, species }: { pokemon: Pokemon, species: PokemonSpecies | null }) {
  const { t, i18n } = useTranslation();
  const { getTarget, getOwnedQuantity, getFullArtQuantity, setOwnedQuantity, setFullArtQuantity } = useCollection();
  const pokemonTarget = getTarget(pokemon.id);
  const ownedQuantity = getOwnedQuantity(pokemon.id);
  const fullArtQuantity = getFullArtQuantity(pokemon.id);
  const availableVersions = getAvailableVersions(species);
  const initialDescription = getDescription(availableVersions[0].value, species, i18n.language, pokemon.id) || t('noDescription');
  const cry = pokemon.cries.latest;
  const [gameVersion, setGameVersion] = useState<string>(availableVersions[0].value);
  const [versionDescription, setVersionDescription] = useState<string>(initialDescription);
  const [pokemonName, setPokemonName] = useState<string>(getPokemonName(species, i18n.language));
  const [genus, setGenus] = useState<string>(getGenus(species, i18n.language));
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  
  useEffect(() => {
    const description = getDescription(gameVersion, species, i18n.language, pokemon.id) || t('noDescription');

    setVersionDescription(description);
    setPokemonName(getPokemonName(species, i18n.language));
    setGenus(getGenus(species, i18n.language));

    if (audioRef.current) {
      audioRef.current.volume = 0.05;
    }
  }, [i18n.language, gameVersion, species, t, pokemon.id]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    const onEnded = () => setIsPlaying(false);

    audio.addEventListener('play', onPlay);
    audio.addEventListener('pause', onPause);
    audio.addEventListener('ended', onEnded);

    return () => {
      audio.removeEventListener('play', onPlay);
      audio.removeEventListener('pause', onPause);
      audio.removeEventListener('ended', onEnded);
    };
  }, []);

  return (
    <div className='flex flex-col rounded-lg'>
      <div className='flex flex-col rounded-t-lg p-6 gap-4 bg-slate-200 dark:bg-slate-800'>
        <div className='flex gap-4 items-center'>
          <Image
            src={`https://assets.pokemon.com/assets/cms2/img/pokedex/detail/${pokemon.id.toString().padStart(3, '0')}.png`}
            alt={pokemonName}
            width={250}
            height={250}
            className='shrink-0 w-20 h-20 md:w-30 md:h-30 lg:w-50 lg:h-50'
            data-retry-count='0'
            onError={handleImageError}
          />

          <div className='flex flex-1 min-w-0 flex-col gap-4 justify-center'>
            <span className='text-sm text-gray-500'>#{pokemon.id.toString().padStart(3, '0')}</span>

            <div className='flex flex-col'>
              <span className='text-md md:text-2xl font-bold capitalize'>{pokemonName}</span>
              <span className='text-xs md:text-sm text-gray-500'>{genus}</span>
            </div>

            <div className='flex gap-2 mt-2'>
              {pokemon?.types.map((type) => (
                <Badge key={type.type.name} className={`type-${type.type.name} text-slate-50 capitalize`}>{t(`type.${type.type.name}`)}</Badge>
              ))}
            </div>
          </div>

          <div className='flex items-center shrink-0'>
            <audio ref={audioRef} className='hidden' preload='auto'>
              <source src={cry} type='audio/mpeg' />
            </audio>

            <button
              onClick={() => {
                const audio = audioRef.current;
                if (!audio) return;

                if (audio.paused) {
                  audio.play();
                } else {
                  audio.pause();
                }
              }}
              aria-label={isPlaying ? t('pause') : t('play')}
              className='cursor-pointer h-8 w-8 md:h-12 md:w-12 flex items-center justify-center rounded-full border border-slate-400 bg-slate-100 dark:bg-slate-700'
            >
              {isPlaying ? <Pause className='h-3 w-3 md:h-6 md:w-6' /> : <Play className='h-3 w-3 md:h-6 md:w-6' />}
            </button>
          </div>
        </div>

        <div className='flex justify-center gap-4'>
          <QuantityStepper
            label={t('collection.owned')}
            value={ownedQuantity}
            target={pokemonTarget.normal}
            onChange={(next) => setOwnedQuantity(pokemon.id, next)}
          />

          <QuantityStepper
            label={t('collection.fullArt')}
            value={fullArtQuantity}
            target={pokemonTarget.fullArt}
            onChange={(next) => setFullArtQuantity(pokemon.id, next)}
          />
        </div>
      </div>

      <div className='flex flex-col p-6 gap-4'>
        <div className='flex gap-2 items-center'>
          <span className='text-lg font-semibold'>{t('description')}</span>

          <Select
            options={availableVersions}
            defaultValue={availableVersions[0].value}
            placeholder={t('selectVersion')}
            onValueChange={(value) => {
              const description = getDescription(value, species, i18n.language, pokemon.id) || t('noDescription');

              setVersionDescription(description);
              setGameVersion(value);
            }}
          />
        </div>

        <p className='text-gray-700 dark:text-gray-300'>
          {versionDescription}
        </p>
      </div>
    </div>
  );
}

function handleImageError(e: React.SyntheticEvent<HTMLImageElement, Event>) {
  const target = e.target as HTMLImageElement;
  
  target.src = '/missingno.png';
}

function getAvailableVersions(species: PokemonSpecies): { value: string, label: string }[] {
  const { t } = useTranslation();
  const versions = [
    { value: 'red', label: t('version.red') },
    { value: 'blue', label: t('version.blue') },
    { value: 'yellow', label: t('version.yellow') },
    { value: 'gold', label: t('version.gold') },
    { value: 'silver', label: t('version.silver') },
    { value: 'crystal', label: t('version.crystal') },
    { value: 'ruby', label: t('version.ruby') },
    { value: 'sapphire', label: t('version.sapphire') },
    { value: 'emerald', label: t('version.emerald') },
    { value: 'firered', label: t('version.firered') },
    { value: 'leafgreen', label: t('version.leafgreen') },
    { value: 'diamond', label: t('version.diamond') },
    { value: 'pearl', label: t('version.pearl') },
    { value: 'platinum', label: t('version.platinum') },
    { value: 'heartgold', label: t('version.heartgold') },
    { value: 'soulsilver', label: t('version.soulsilver') },
    { value: 'black', label: t('version.black') },
    { value: 'white', label: t('version.white') },
    { value: 'black-2', label: t('version.black-2') },
    { value: 'white-2', label: t('version.white-2') },
    { value: 'x', label: t('version.x') },
    { value: 'y', label: t('version.y') },
    { value: 'omega-ruby', label: t('version.omega-ruby') },
    { value: 'alpha-sapphire', label: t('version.alpha-sapphire') },
    { value: 'sun', label: t('version.sun') },
    { value: 'moon', label: t('version.moon') },
    { value: 'ultra-sun', label: t('version.ultra-sun') },
    { value: 'ultra-moon', label: t('version.ultra-moon') },
    { value: 'lets-go-pikachu', label: t('version.lets-go-pikachu') },
    { value: 'lets-go-eevee', label: t('version.lets-go-eevee') },
    { value: 'sword', label: t('version.sword') },
    { value: 'shield', label: t('version.shield') },
    { value: 'brilliant-diamond', label: t('version.brilliant-diamond') },
    { value: 'shining-pearl', label: t('version.shining-pearl') },
    { value: 'legends-arceus', label: t('version.legends-arceus') },
    { value: 'scarlet', label: t('version.scarlet') },
    { value: 'violet', label: t('version.violet') },
  ];
  const availableVersions = new Set(species?.flavor_text_entries.map(entry => {
    return versions.find(version => version.value === entry.version?.name)
  }).filter(Boolean));

  return Array.from(availableVersions) || [];
}

function getDescription(selectedVersion: string, species: PokemonSpecies, language: string, pokemonId: number): string {
  if (!selectedVersion) return '';

  if (language === 'pt') {
    const translation = pokemonDexEntriesPtBR[pokemonId]?.[selectedVersion];

    if (translation) {
      return translation;
    }
  }

  const languageCode = language !== 'pt' ? language : 'en';
  const dexEntries = species.flavor_text_entries.filter((entry) => entry.language.name === languageCode);
  const entry = dexEntries?.find((entry) => entry.version?.name === selectedVersion);
  const text = entry?.flavor_text;

  return text ? text?.replace(/\f/g, ' ').trim() : '';
}

function getPokemonName(species: PokemonSpecies, language: string): string {
  const languageCode = language !== 'pt' ? language : 'en';

  return species?.names.find((entry) => entry.language.name === languageCode)?.name || '';
}

function getGenus(species: PokemonSpecies, language: string): string {
  const languageCode = language !== 'pt' ? language : 'en';

  return species?.genera.find((entry) => entry.language.name === languageCode)?.genus;
}
