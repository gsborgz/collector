'use client'

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import { GripVertical, Search } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import {
  DndContext,
  DragEndEvent,
  PointerSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { SortableContext, arrayMove, rectSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useWindowVirtualizer } from '@tanstack/react-virtual';
import { getPokemonIdFromUrl, usePokemonList } from '@hooks/useApi';
import { PokemonListItem } from '@models/pokemon';
import { PokemonTarget } from '@models/collection';
import { Button } from '@components/ui/Button';
import Input from '@components/ui/Input';
import QuantityStepper from '@components/ui/QuantityStepper';
import { concatClassNames } from '@lib/utils';

export interface PokemonPickerResult {
  pokemonIds?: number[];
  defaultTarget: PokemonTarget;
  targetOverrides: Record<string, PokemonTarget>;
}

interface PokemonPickerProps {
  mode: 'membership' | 'targets';
  initialSelectedIds?: number[];
  initialDefaultTarget: PokemonTarget;
  initialTargetOverrides?: Record<string, PokemonTarget>;
  showTargets?: boolean;
  confirmLabel: string;
  savingLabel?: string;
  saving?: boolean;
  onConfirm: (result: PokemonPickerResult) => void;
  onCancel: () => void;
}

// Single source of truth for the grid's responsive column count: these are the
// same classes applied to the actual rendered rows further down. Column count
// is derived by measuring the live computed style (see useMeasuredColumns)
// instead of duplicating the breakpoint pixel values in JS, so it can never
// drift out of sync with the CSS.
const GRID_COLUMNS_CLASSNAME = 'grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6';
const ROW_HEIGHT_ESTIMATE = 116;

function useMeasuredColumns(gridClassName: string) {
  const probeRef = useRef<HTMLDivElement>(null);
  const [columns, setColumns] = useState(3);

  useLayoutEffect(() => {
    const el = probeRef.current;

    if (!el || typeof ResizeObserver === 'undefined') return;

    const measure = () => {
      const columnCount = window.getComputedStyle(el).gridTemplateColumns.split(' ').filter(Boolean).length;

      if (columnCount > 0) {
        setColumns((prev) => (prev === columnCount ? prev : columnCount));
      }
    };

    measure();

    const observer = new ResizeObserver(measure);
    observer.observe(el);

    return () => observer.disconnect();
  }, [gridClassName]);

  return { columns, probeRef };
}

export default function PokemonPicker({
  mode,
  initialSelectedIds = [],
  initialDefaultTarget,
  initialTargetOverrides = {},
  showTargets = true,
  confirmLabel,
  savingLabel,
  saving = false,
  onConfirm,
  onCancel,
}: PokemonPickerProps) {
  const { t } = useTranslation();
  const [data, setData] = useState<PokemonListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<number[]>(() => [...initialSelectedIds]);
  const [defaultTarget, setDefaultTarget] = useState<PokemonTarget>(initialDefaultTarget);
  const [overrides, setOverrides] = useState<Record<number, PokemonTarget>>(() => {
    const parsed: Record<number, PokemonTarget> = {};

    Object.entries(initialTargetOverrides).forEach(([id, target]) => {
      parsed[Number(id)] = target;
    });

    return parsed;
  });
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } })
  );
  const { columns, probeRef } = useMeasuredColumns(GRID_COLUMNS_CLASSNAME);
  const gridContainerRef = useRef<HTMLDivElement>(null);
  const [scrollMargin, setScrollMargin] = useState(0);

  useLayoutEffect(() => {
    const next = gridContainerRef.current?.offsetTop ?? 0;

    setScrollMargin((prev) => (prev === next ? prev : next));
  });

  useEffect(() => {
    usePokemonList()
      .then((response) => setData(response.results))
      .finally(() => setLoading(false));
  }, []);

  const selectedIdsSet = useMemo(() => new Set(selectedOrder), [selectedOrder]);

  const dataById = useMemo(() => {
    const map = new Map<number, PokemonListItem>();

    data.forEach((pokemon) => map.set(getPokemonIdFromUrl(pokemon.url), pokemon));

    return map;
  }, [data]);

  const filteredData = useMemo(() => {
    const term = search.trim().toLowerCase();

    if (!term) return data;

    return data.filter((pokemon) => pokemon.name.toLowerCase().includes(term));
  }, [data, search]);

  // Selected Pokémon are always pulled to the front, in the user's custom
  // order, so they stay visible and reorderable without having to scroll
  // through the whole dex to find them again.
  const orderedData = useMemo(() => {
    if (mode !== 'membership') return filteredData;

    const filteredIds = new Set(filteredData.map((pokemon) => getPokemonIdFromUrl(pokemon.url)));
    const selectedItems = selectedOrder
      .filter((id) => filteredIds.has(id))
      .map((id) => dataById.get(id))
      .filter((pokemon): pokemon is PokemonListItem => Boolean(pokemon));
    const unselectedItems = filteredData.filter((pokemon) => !selectedIdsSet.has(getPokemonIdFromUrl(pokemon.url)));

    return [...selectedItems, ...unselectedItems];
  }, [filteredData, selectedOrder, selectedIdsSet, dataById, mode]);

  // The full dex (up to ~1025 entries) is already loaded in memory, so instead
  // of incrementally rendering more items as the user scrolls, we virtualize
  // rows of the grid: only the rows actually in (or near) the viewport are
  // mounted, regardless of how many Pokémon are selected or how large the list is.
  const rows = useMemo(() => {
    const grouped: PokemonListItem[][] = [];

    for (let i = 0; i < orderedData.length; i += columns) {
      grouped.push(orderedData.slice(i, i + columns));
    }

    return grouped;
  }, [orderedData, columns]);

  const rowVirtualizer = useWindowVirtualizer({
    count: rows.length,
    estimateSize: () => ROW_HEIGHT_ESTIMATE,
    overscan: 4,
    scrollMargin,
  });

  const toggleSelected = (id: number) => {
    setSelectedOrder((prev) => (prev.includes(id) ? prev.filter((existing) => existing !== id) : [...prev, id]));
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || active.id === over.id) return;

    setSelectedOrder((prev) => {
      const oldIndex = prev.indexOf(Number(active.id));
      const newIndex = prev.indexOf(Number(over.id));

      if (oldIndex === -1 || newIndex === -1) return prev;

      return arrayMove(prev, oldIndex, newIndex);
    });
  };

  const handleConfirm = () => {
    const targetOverrides: Record<string, PokemonTarget> = {};

    Object.entries(overrides).forEach(([id, target]) => {
      targetOverrides[id] = target;
    });

    onConfirm({
      pokemonIds: mode === 'membership' ? selectedOrder : undefined,
      defaultTarget,
      targetOverrides,
    });
  };

  const canConfirm = mode === 'targets' || selectedOrder.length > 0;

  return (
    <div className='flex flex-col gap-4'>
      <div className='relative'>
        <Search className='absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 h-4 w-4' />
        <Input
          value={search}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
          placeholder={t('searchByNamePlaceholder')}
          className='pl-10'
        />
      </div>

      <div className='sticky top-16 z-10 flex flex-col gap-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50/90 dark:bg-slate-900/90 backdrop-blur px-4 py-3'>
        <div className='flex items-center justify-between gap-4 flex-wrap'>
          <span className='text-sm text-slate-500'>
            {mode === 'membership' ? t('setup.customSelectedCount', { count: selectedOrder.length }) : t('setup.editTargetsTitle')}
          </span>

          <div className='flex gap-2'>
            <Button variant='ghost' onClick={onCancel} disabled={saving}>{t('setup.cancel')}</Button>

            <Button variant='default' primary disabled={!canConfirm || saving} onClick={handleConfirm}>
              {saving ? (savingLabel ?? confirmLabel) : confirmLabel}
            </Button>
          </div>
        </div>

        {mode === 'membership' && selectedOrder.length > 1 && (
          <p className='text-xs text-slate-400'>{t('setup.dragToReorder')}</p>
        )}

        {showTargets && (
          <div className='flex items-center gap-4 flex-wrap'>
            <QuantityStepper
              label={t('setup.defaultTarget')}
              value={defaultTarget.normal}
              onChange={(next) => setDefaultTarget({ normal: next, fullArt: next })}
            />
          </div>
        )}
      </div>

      <div ref={probeRef} aria-hidden className={concatClassNames('grid', GRID_COLUMNS_CLASSNAME, 'invisible absolute h-0 w-full overflow-hidden')} />

      {loading && (
        <div className='text-center py-4'>
          <p className='text-sm text-slate-500'>{t('loading')}</p>
        </div>
      )}

      {!loading && rows.length === 0 && (
        <div className='text-center py-4'>
          <p className='text-sm text-slate-500'>{t('noResults')}</p>
        </div>
      )}

      {!loading && rows.length > 0 && (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={selectedOrder} strategy={rectSortingStrategy}>
            <div ref={gridContainerRef} className='relative mb-8' style={{ height: rowVirtualizer.getTotalSize() }}>
              {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                const rowItems = rows[virtualRow.index];

                return (
                  <div
                    key={virtualRow.key}
                    data-index={virtualRow.index}
                    ref={rowVirtualizer.measureElement}
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      transform: `translateY(${virtualRow.start - rowVirtualizer.options.scrollMargin}px)`,
                    }}
                    className={concatClassNames('grid', GRID_COLUMNS_CLASSNAME, 'gap-3 pb-3')}
                  >
                    {rowItems.map((pokemon) => {
                      const id = getPokemonIdFromUrl(pokemon.url);
                      const selected = mode === 'targets' || selectedIdsSet.has(id);

                      if (mode === 'membership' && selected) {
                        return (
                          <SortablePickerCard
                            key={id}
                            id={id}
                            pokemon={pokemon}
                            onToggle={() => toggleSelected(id)}
                          />
                        );
                      }

                      return (
                        <PickerCard
                          key={id}
                          id={id}
                          pokemon={pokemon}
                          selected={selected}
                          clickable={mode === 'membership'}
                          onToggle={() => toggleSelected(id)}
                        />
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </SortableContext>
        </DndContext>
      )}
    </div>
  );
}

interface PickerCardBodyProps {
  pokemon: PokemonListItem;
  id: number;
}

function PickerCardBody({ pokemon, id }: PickerCardBodyProps) {
  return (
    <>
      <Image
        src={`https://assets.pokemon.com/assets/cms2/img/pokedex/detail/${id.toString().padStart(3, '0')}.png`}
        alt={pokemon.name}
        width={64}
        height={64}
        className='w-14 h-14'
        data-retry-count='0'
        onError={handleImageError}
      />

      <span className='text-xs capitalize text-center truncate w-full'>{pokemon.name}</span>
    </>
  );
}

interface PickerCardProps {
  id: number;
  pokemon: PokemonListItem;
  selected: boolean;
  clickable: boolean;
  onToggle: () => void;
}

function PickerCard({ id, pokemon, selected, clickable, onToggle }: PickerCardProps) {
  return (
    <div
      className={concatClassNames(
        'flex flex-col items-center gap-1 rounded-lg border p-2 transition-colors',
        selected
          ? 'border-indigo-500 bg-indigo-500/10 dark:border-indigo-400 dark:bg-indigo-400/10'
          : 'border-slate-300 dark:border-slate-600 hover:border-indigo-400/60'
      )}
    >
      {clickable ? (
        <button
          type='button'
          onClick={onToggle}
          className='cursor-pointer flex flex-col items-center gap-1 w-full'
        >
          <PickerCardBody pokemon={pokemon} id={id} />
        </button>
      ) : (
        <div className='flex flex-col items-center gap-1 w-full'>
          <PickerCardBody pokemon={pokemon} id={id} />
        </div>
      )}
    </div>
  );
}

interface SortablePickerCardProps {
  id: number;
  pokemon: PokemonListItem;
  onToggle: () => void;
}

function SortablePickerCard({ id, pokemon, onToggle }: SortablePickerCardProps) {
  const { t } = useTranslation();
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className='relative flex flex-col items-center gap-1 rounded-lg border p-2 transition-colors border-indigo-500 bg-indigo-500/10 dark:border-indigo-400 dark:bg-indigo-400/10'
    >
      <button
        type='button'
        {...attributes}
        {...listeners}
        className='absolute right-1 top-1 cursor-grab touch-none rounded p-0.5 text-indigo-500/70 hover:text-indigo-500 active:cursor-grabbing dark:text-indigo-400/70 dark:hover:text-indigo-400'
        aria-label={t('setup.dragHandleLabel')}
      >
        <GripVertical className='h-3.5 w-3.5' />
      </button>

      <button
        type='button'
        onClick={onToggle}
        className='cursor-pointer flex flex-col items-center gap-1 w-full'
      >
        <PickerCardBody pokemon={pokemon} id={id} />
      </button>
    </div>
  );
}

function handleImageError(e: React.SyntheticEvent<HTMLImageElement, Event>) {
  const target = e.target as HTMLImageElement;

  target.src = '/missingno.png';
}
