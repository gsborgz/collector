'use client'

import ThemeToggle from '@components/ThemeToggle';
import { LanguageToggle } from '@components/LanguageToggle';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Button } from '@components/ui/Button';
import { BookAlert, Copy, CopyCheck, ClipboardPaste, ListFilter, LogOut, Search } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useState } from 'react';
import { useCollection } from '@providers/CollectionProvider';
import { useSearch } from '@providers/SearchProvider';
import { useCollectionFilters } from '@providers/FilterProvider';
import { CollectionFilterOption } from '@models/collection';
import Input from '@components/ui/Input';
import { concatClassNames } from '@lib/utils';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent } from '@components/ui/DropdownMenu';

const FILTER_OPTIONS: CollectionFilterOption[] = ['notOwned', 'owned', 'fullArt'];

export default function Header() {
  const { t } = useTranslation();
  const router = useRouter();
  const currentRoute = usePathname();
  const { status, collectionId, loadCollection, switchCollection } = useCollection();
  const isPokedex = currentRoute === '/' && status === 'ready';
  const { searchTerm, setSearchTerm } = useSearch();
  const [copied, setCopied] = useState(false);

  const handleCopyCode = async () => {
    if (!collectionId) return;

    try {
      await navigator.clipboard.writeText(collectionId);

      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      alert(t('collection.copyCodeError'));
    }
  };

  const handleImportCode = async () => {
    const code = window.prompt(t('collection.pasteCodePrompt'));

    if (!code) return;

    try {
      await loadCollection(code.trim());
    } catch {
      alert(t('collection.invalidCode'));
    }
  };

  const handleSwitchCollection = () => {
    if (!window.confirm(t('setup.switchConfirm'))) return;

    switchCollection();
  };

  return (
    <HeaderBar>
      <div className='flex items-center justify-between gap-2 px-4 py-3'>
        <div className='flex md:hidden items-center gap-2'>
          <Button variant="default" primary={isPokedex} onClick={() => router.push('/')} className='flex items-center'>
            <BookAlert className='w-6 h-6' />
          </Button>
        </div>

        <div className='hidden md:flex items-center gap-2'>
          <Link className="flex items-center space-x-2" href="/">
            <span className={`hidden font-bold sm:inline-block ${isPokedex ? 'link-primary' : 'link-secondary'}`}>
              Collector
            </span>
          </Link>
        </div>

        <div className={concatClassNames('flex-1 items-center gap-2 max-w-md mx-4', isPokedex ? 'hidden md:flex' : 'hidden')}>
          <SearchBar
            value={searchTerm}
            onChange={setSearchTerm}
            placeholder={t('searchByNamePlaceholder')}
            className='flex-1'
          />

          <CollectionFilterDropdown />
        </div>

        <div className='flex items-center justify-end gap-2'>
          {status === 'ready' && (
            <>
              <Button variant='ghost' size='icon' onClick={handleCopyCode} title={t('collection.copyCode')}>
                {copied ? <CopyCheck className='w-5 h-5' /> : <Copy className='w-5 h-5' />}
              </Button>

              <Button variant='ghost' size='icon' onClick={handleImportCode} title={t('collection.pasteCode')}>
                <ClipboardPaste className='w-5 h-5' />
              </Button>

              <Button variant='ghost' size='icon' onClick={handleSwitchCollection} title={t('setup.switchCollection')}>
                <LogOut className='w-5 h-5' />
              </Button>
            </>
          )}

          <LanguageToggle />
          <ThemeToggle />
        </div>
      </div>

      <div className={concatClassNames('flex items-center gap-2 px-4 pb-3', isPokedex ? 'md:hidden' : 'hidden')}>
        <SearchBar
          value={searchTerm}
          onChange={setSearchTerm}
          placeholder={t('searchByNamePlaceholder')}
          className='flex-1'
        />

        <CollectionFilterDropdown />
      </div>
    </HeaderBar>
  );
}

function CollectionFilterDropdown() {
  const { t } = useTranslation();
  const { filters, toggleFilter } = useCollectionFilters();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant='ghost' size='icon' title={t('filter.title')}>
          <ListFilter className='w-5 h-5' />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align='end' className='min-w-40'>
        {FILTER_OPTIONS.map((option) => (
          <label
            key={option}
            className='flex items-center gap-2 cursor-pointer select-none rounded-sm px-2 py-1.5 text-sm text-slate-950 dark:text-slate-50 hover:bg-slate-300 dark:hover:bg-slate-700'
          >
            <input
              type='checkbox'
              checked={filters.has(option)}
              onChange={() => toggleFilter(option)}
              className='h-4 w-4 rounded border-slate-400 accent-slate-950 dark:accent-slate-50 cursor-pointer'
            />
            {t(`filter.${option}`)}
          </label>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function SearchBar({ value, onChange, placeholder, className }: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  className?: string;
}) {
  return (
    <div className={className}>
      <div className='relative'>
        <Search className='absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 dark:text-slate-500 h-4 w-4' />
        <Input
          placeholder={placeholder}
          value={value}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange(e.target.value)}
          className='pl-10 text-xs md:text-sm'
        />
      </div>
    </div>
  );
}

function HeaderBar({ children }: { children: React.ReactNode }) {
  return (
    <header className='sticky flex flex-col top-0 z-50 w-full !p-0 border-b backdrop-blur border-slate-400'>
      {children}
    </header>
  );
}
