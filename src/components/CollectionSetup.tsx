'use client'

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useCollection } from '@providers/CollectionProvider';
import { isValidCollectionId } from '@lib/collectionKey';
import Card, { CardTitle } from '@components/ui/Card';
import { Button } from '@components/ui/Button';
import Input from '@components/ui/Input';
import PokemonPicker, { PokemonPickerResult } from '@components/PokemonPicker';
import { DEFAULT_TARGET } from '@lib/collectionTargets';

type Step = 'menu' | 'custom-picker';

export default function CollectionSetup() {
  const { t } = useTranslation();
  const { createCollection, loadCollection } = useCollection();
  const [step, setStep] = useState<Step>('menu');
  const [loadCode, setLoadCode] = useState('');
  const [loadError, setLoadError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const handleLoad = async () => {
    const code = loadCode.trim();

    if (!isValidCollectionId(code)) {
      setLoadError(t('setup.invalidCode'));
      return;
    }

    setLoadError(null);
    setBusy(true);

    try {
      await loadCollection(code);
    } catch {
      setLoadError(t('setup.loadError'));
      setBusy(false);
    }
  };

  const handleCreatePokedex = async () => {
    setBusy(true);

    try {
      await createCollection('pokedex');
    } catch {
      alert(t('setup.createError'));
      setBusy(false);
    }
  };

  const handleCreateCustom = async ({ pokemonIds }: PokemonPickerResult) => {
    setBusy(true);

    try {
      await createCollection('custom', pokemonIds ?? []);
    } catch {
      alert(t('setup.createError'));
      setBusy(false);
    }
  };

  if (step === 'custom-picker') {
    return (
      <div className='flex flex-col gap-4 max-w-4xl mx-auto'>
        <CardTitle className='text-center mb-0'>{t('setup.customTitle')}</CardTitle>

        <PokemonPicker
          mode='membership'
          initialSelectedIds={[]}
          initialDefaultTarget={DEFAULT_TARGET}
          showTargets={false}
          confirmLabel={t('setup.createCustomConfirm')}
          onConfirm={handleCreateCustom}
          onCancel={() => setStep('menu')}
        />
      </div>
    );
  }

  return (
    <div className='flex flex-col gap-6 max-w-2xl mx-auto py-8'>
      <div className='text-center'>
        <h1 className='text-2xl font-bold text-primary'>{t('setup.title')}</h1>
        <p className='text-sm text-slate-500 mt-1'>{t('setup.subtitle')}</p>
      </div>

      <Card className='flex flex-col gap-3'>
        <CardTitle className='mb-0'>{t('setup.loadTitle')}</CardTitle>
        <p className='text-sm text-slate-500'>{t('setup.loadDescription')}</p>

        <div className='flex flex-col sm:flex-row gap-2'>
          <Input
            value={loadCode}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
              setLoadCode(e.target.value);
              setLoadError(null);
            }}
            placeholder={t('setup.loadPlaceholder')}
            className='flex-1'
          />

          <Button variant='default' primary disabled={busy || !loadCode.trim()} onClick={handleLoad}>
            {t('setup.loadAction')}
          </Button>
        </div>

        {loadError && <p className='text-sm text-red-500'>{loadError}</p>}
      </Card>

      <div className='grid sm:grid-cols-2 gap-4'>
        <Card className='flex flex-col gap-3'>
          <CardTitle className='mb-0'>{t('setup.pokedexTitle')}</CardTitle>
          <p className='text-sm text-slate-500 flex-1'>{t('setup.pokedexDescription')}</p>
          <Button variant='default' primary disabled={busy} onClick={handleCreatePokedex}>
            {t('setup.pokedexAction')}
          </Button>
        </Card>

        <Card className='flex flex-col gap-3'>
          <CardTitle className='mb-0'>{t('setup.customTitle')}</CardTitle>
          <p className='text-sm text-slate-500 flex-1'>{t('setup.customDescription')}</p>
          <Button variant='default' primary disabled={busy} onClick={() => setStep('custom-picker')}>
            {t('setup.customAction')}
          </Button>
        </Card>
      </div>
    </div>
  );
}
