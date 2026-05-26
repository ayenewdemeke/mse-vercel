'use client';

import { useRouter, usePathname } from 'next/navigation';
import { useState } from 'react';
import { Button } from '@/components/ui/button';

export function MinRlForm({ defaultValue }: { defaultValue: number }) {
  const router = useRouter();
  const pathname = usePathname();
  const [value, setValue] = useState(String(defaultValue));

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    router.push(`${pathname}?minRl=${encodeURIComponent(value)}`);
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-2">
      <label className="text-sm text-slate-600">Min RL (ft):</label>
      <input
        type="number"
        step="any"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className="w-20 rounded border border-input px-2 py-1 text-sm"
      />
      <Button type="submit" size="sm" variant="outline">Update</Button>
    </form>
  );
}
