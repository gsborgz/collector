import { Minus, Plus } from 'lucide-react';
import { concatClassNames } from '@lib/utils';

interface QuantityStepperProps {
  label: string;
  value: number;
  target?: number;
  onChange: (next: number) => void;
  className?: string;
}

export default function QuantityStepper({ label, value, target, onChange, className }: QuantityStepperProps) {
  const hasTarget = target !== undefined && target > 0;
  const reached = hasTarget && value >= target;

  return (
    <div
      onClick={(e) => e.stopPropagation()}
      className={concatClassNames('flex items-center gap-1.5 text-xs', className)}
    >
      <span className={concatClassNames(reached && 'font-semibold text-emerald-600 dark:text-emerald-400')}>
        {label}
      </span>

      <button
        type='button'
        onClick={() => onChange(Math.max(0, value - 1))}
        disabled={value <= 0}
        className='cursor-pointer h-5 w-5 flex items-center justify-center rounded border border-slate-400 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-300/40 dark:hover:bg-slate-700/40'
      >
        <Minus className='h-3 w-3' />
      </button>

      <span className='w-8 text-center tabular-nums'>
        {value}
        {target !== undefined && <span className='text-slate-400'>/{target}</span>}
      </span>

      <button
        type='button'
        onClick={() => onChange(value + 1)}
        disabled={reached}
        className='cursor-pointer h-5 w-5 flex items-center justify-center rounded border border-slate-400 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-300/40 dark:hover:bg-slate-700/40'
      >
        <Plus className='h-3 w-3' />
      </button>
    </div>
  );
}
