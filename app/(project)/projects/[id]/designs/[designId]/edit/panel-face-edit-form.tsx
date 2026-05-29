'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface Props {
  projectId: string;
  designId: string;
  typeName: string;
  designName?: string | null;
  data: Record<string, unknown>;
  action: (
    designId: string,
    projectId: string,
    formData: FormData,
  ) => Promise<{ error: string } | void>;
}

export default function PanelFaceEditForm({
  projectId, designId, typeName, designName, data, action,
}: Props) {
  const [error, setError] = useState('');
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await action(designId, projectId, fd);
      if (result?.error) setError(result.error);
    });
  }

  return (
    <div className="max-w-3xl">
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="sm" asChild>
          <Link href={`/projects/${projectId}/designs/${designId}`}>← Back</Link>
        </Button>
        <h1 className="text-2xl font-semibold text-slate-800">Edit — {typeName}</h1>
      </div>

      {error && (
        <div className="mb-4 bg-red-50 text-red-600 text-sm px-4 py-3 rounded-lg border border-red-200">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="rounded-xl border bg-card p-5">
          <h2 className="text-base font-semibold text-slate-700 mb-4">Design Name</h2>
          <div className="max-w-sm">
            <Label htmlFor="name" className="text-sm text-slate-600">Name (optional)</Label>
            <Input id="name" name="name" type="text" defaultValue={designName ?? ''} placeholder="e.g. Abutment Panel Check" className="mt-1" />
          </div>
        </div>

        <div className="rounded-xl border bg-card p-5">
          <h2 className="text-base font-semibold text-slate-700 mb-4">Material Properties</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <Field name="fc" label="f'c (ksi)" data={data} />
            <Field name="fy" label="fy (ksi)" data={data} />
          </div>
        </div>

        <div className="rounded-xl border bg-card p-5">
          <h2 className="text-base font-semibold text-slate-700 mb-4">Panel Geometry</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <Field name="lPanel" label="L panel (ft)" data={data} />
            <Field name="hPanel" label="h panel (ft)" data={data} />
            <Field name="tPanel" label="t panel (in)" data={data} />
            <Field name="ssr" label="S sr (in)" data={data} />
            <Field name="cCoverPos" label="Cover +ve (in)" data={data} />
            <Field name="cCoverNeg" label="Cover −ve (in)" data={data} />
          </div>
        </div>

        <div className="rounded-xl border bg-card p-5">
          <h2 className="text-base font-semibold text-slate-700 mb-4">Panel Reinforcement</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Field name="barNumVert" label="Vertical bar #" data={data} />
            <Field name="spacingVert" label="Vertical spacing (in)" data={data} />
            <Field name="barNumHor" label="Horizontal bar #" data={data} />
            <Field name="spacingHor" label="Horizontal spacing (in)" data={data} />
          </div>
        </div>

        <div className="rounded-xl border bg-card p-5">
          <h2 className="text-base font-semibold text-slate-700 mb-4">Loads from Internal Stability</h2>
          <p className="text-sm text-slate-500 mb-4">
            Enter the maximum T<sub>max</sub> values from the internal stability analysis.
          </p>
          <div className="grid grid-cols-2 gap-4">
            <Field name="huStr" label="HU Strength I (kip/ft)" data={data} />
            <Field name="huEe" label="HU Extreme Event I (kip/ft)" data={data} />
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <Button variant="outline" asChild>
            <Link href={`/projects/${projectId}/designs/${designId}`}>Cancel</Link>
          </Button>
          <Button type="submit" disabled={isPending}>
            {isPending ? 'Saving…' : 'Save Changes'}
          </Button>
        </div>
      </form>
    </div>
  );
}

function Field({ name, label, data }: { name: string; label: string; data: Record<string, unknown> }) {
  return (
    <div className="space-y-1">
      <Label htmlFor={name} className="text-sm text-slate-600">{label}</Label>
      <Input id={name} name={name} type="number" step="any" required defaultValue={data[name] as number} />
    </div>
  );
}
