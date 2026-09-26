'use client';
import { useState } from 'react';
import { cn } from './cn';

/** Accessible switch that also posts as a normal checkbox inside <form>. */
export function Switch({ name, defaultChecked, label }: { name: string; defaultChecked?: boolean; label: string }) {
  const [on, setOn] = useState(!!defaultChecked);
  return (
    <label className="relative inline-flex shrink-0 cursor-pointer">
      <input type="checkbox" name={name} checked={on} onChange={(e) => setOn(e.target.checked)} className="peer sr-only" aria-label={label} />
      <span className={cn('flex h-[22px] w-10 rounded-full p-0.5 transition-colors peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-brand', on ? 'justify-end bg-ink' : 'justify-start bg-[#d8d6cf]')}>
        <span className="block size-[18px] rounded-full bg-white shadow-sm" />
      </span>
    </label>
  );
}
