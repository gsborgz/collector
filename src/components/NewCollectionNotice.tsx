'use client'

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Copy, CopyCheck } from 'lucide-react';
import Modal from '@components/ui/Modal';
import Card, { CardTitle } from '@components/ui/Card';
import { Button } from '@components/ui/Button';

interface NewCollectionNoticeProps {
  notice: { id: string; migrated: boolean } | null;
  onClose: () => void;
}

export default function NewCollectionNotice({ notice, onClose }: NewCollectionNoticeProps) {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (!notice) return;

    try {
      await navigator.clipboard.writeText(notice.id);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore, the code is still visible for manual copy
    }
  };

  return (
    <Modal open={!!notice} onClose={onClose} className='w-full max-w-md'>
      <Card className='flex flex-col gap-3'>
        <CardTitle className='mb-0'>
          {notice?.migrated ? t('setup.noticeMigratedTitle') : t('setup.noticeCreatedTitle')}
        </CardTitle>

        <p className='text-sm text-slate-600 dark:text-slate-300'>{t('setup.noticeDescription')}</p>

        <div className='flex items-center gap-2 rounded-md border border-slate-300 dark:border-slate-600 bg-slate-100/60 dark:bg-slate-800/60 px-3 py-2'>
          <code className='flex-1 text-sm break-all'>{notice?.id}</code>

          <Button variant='ghost' size='icon' onClick={handleCopy} title={t('collection.copyCode')}>
            {copied ? <CopyCheck className='w-5 h-5' /> : <Copy className='w-5 h-5' />}
          </Button>
        </div>

        <Button variant='default' primary onClick={onClose}>
          {t('setup.noticeAcknowledge')}
        </Button>
      </Card>
    </Modal>
  );
}
