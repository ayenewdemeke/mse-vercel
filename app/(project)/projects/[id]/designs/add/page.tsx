'use client';

import Link from 'next/link';
import { useState, useEffect, useTransition } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { getDesignTypes } from '@/app/actions/designs';
import { ArrowLeft, Loader2 } from 'lucide-react';

type DesignType = { id: string; name: string; key: string; description: string | null };

export default function AddDesignPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const router = useRouter();
  const [types, setTypes] = useState<DesignType[]>([]);
  const [selectedKey, setSelectedKey] = useState('');
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    getDesignTypes().then(setTypes);
  }, []);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedKey) return;
    startTransition(() => {
      router.push(`/projects/${id}/designs/create/${selectedKey}`);
    });
  }

  return (
    <div className="max-w-md">
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="sm" asChild>
          <Link href={`/projects/${id}/designs`}>
            <ArrowLeft className="h-4 w-4" />Back
          </Link>
        </Button>
        <h1 className="text-2xl font-semibold text-slate-800">Add design</h1>
      </div>

      <div className="bg-card rounded-xl border p-6">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-1.5">
            <Label htmlFor="type">Design type <span className="text-red-500">*</span></Label>
            <select
              id="type"
              value={selectedKey}
              onChange={(e) => setSelectedKey(e.target.value)}
              required
              disabled={isPending || types.length === 0}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
            >
              <option value="">Select a design type…</option>
              {types.map((t) => (
                <option key={t.id} value={t.key}>{t.name}</option>
              ))}
            </select>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" type="button" asChild>
              <Link href={`/projects/${id}/designs`}>Cancel</Link>
            </Button>
            <Button type="submit" disabled={isPending || !selectedKey}>
              {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Proceed
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
