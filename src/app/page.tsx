'use client'

import { useTranslation } from 'react-i18next';
import PokemonList from '@components/PokemonList';
import CollectionSetup from '@components/CollectionSetup';
import NewCollectionNotice from '@components/NewCollectionNotice';
import { useCollection } from '@providers/CollectionProvider';

export default function Home() {
  const { t } = useTranslation();
  const { status, newCollectionNotice, acknowledgeNewCollectionNotice } = useCollection();

  return (
    <>
      {status === 'loading' && (
        <div className='text-center py-12'>
          <p className='text-sm text-slate-500'>{t('loading')}</p>
        </div>
      )}

      {status === 'needsSelection' && <CollectionSetup />}

      {status === 'ready' && <PokemonList />}

      <NewCollectionNotice notice={newCollectionNotice} onClose={acknowledgeNewCollectionNotice} />
    </>
  );
}
