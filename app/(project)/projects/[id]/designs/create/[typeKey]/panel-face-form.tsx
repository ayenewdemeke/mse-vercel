'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface Props {
  projectId: string;
  typeName: string;
  designId?: string;
  designName?: string | null;
  data?: Record<string, unknown>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  action: (...args: any[]) => Promise<{ error: string } | void>;
}

export default function PanelFaceForm({
  projectId, typeName, designId, designName, data, action,
}: Props) {
  const isEdit = !!designId;
  const [error, setError] = useState('');
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = isEdit
        ? await action(designId, projectId, fd)
        : await action(projectId, fd);
      if (result?.error) setError(result.error);
    });
  }

  const cancelHref = isEdit
    ? `/projects/${projectId}/designs/${designId}`
    : `/projects/${projectId}/designs`;

  return (
    <div className="max-w-3xl">
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="sm" asChild>
          <Link href={cancelHref}>← Back</Link>
        </Button>
        <h1 className="text-2xl font-semibold text-slate-800">
          {isEdit ? `Edit — ${typeName}` : typeName}
        </h1>
      </div>

      {error && (
        <div className="mb-4 bg-red-50 text-red-600 text-sm px-4 py-3 rounded-lg border border-red-200">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card title="Design Name">
          <div className="max-w-sm">
            <Label htmlFor="name" className="text-sm text-slate-600">Name (optional)</Label>
            <Input
              id="name" name="name" type="text"
              placeholder="e.g. Abutment Panel Check"
              defaultValue={designName ?? ''}
              className="mt-1"
            />
          </div>
        </Card>

        <div className="rounded-xl border bg-card p-5">
          <h2 className="text-base font-semibold text-slate-700 mb-3">Design Constants (AASHTO LRFD)</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs text-slate-600">
            <div className="rounded border p-2">
              <div className="font-medium text-slate-700 mb-1">Resistance</div>
              <div>φV = 0.9</div>
            </div>
            <div className="rounded border p-2">
              <div className="font-medium text-slate-700 mb-1">Shear</div>
              <div>β (simplified) = 2.0</div>
            </div>
            <div className="rounded border p-2">
              <div className="font-medium text-slate-700 mb-1">Crack Control</div>
              <div>γe = 1.0</div>
            </div>
            <div className="rounded border p-2">
              <div className="font-medium text-slate-700 mb-1">Load Factor</div>
              <div>γEV.Str-I = 1.35</div>
            </div>
          </div>
        </div>

        <Card title="Material Properties">
          <Grid cols={3}>
            <Field name="fc" label="f'c (ksi)" data={data} />
            <Field name="fy" label="fy (ksi)" data={data} />
          </Grid>
        </Card>

        <Card title="Panel Geometry">
          <Grid cols={3}>
            <Field name="lPanel" label="L panel (ft)" data={data} />
            <Field name="hPanel" label="h panel (ft)" data={data} />
            <Field name="tPanel" label="t panel (in)" data={data} />
            <Field name="ssr" label="S sr (in)" data={data} />
            <Field name="cCoverPos" label="Cover +ve (in)" data={data} />
            <Field name="cCoverNeg" label="Cover −ve (in)" data={data} />
          </Grid>
        </Card>

        <Card title="Panel Reinforcement">
          <Grid cols={4}>
            <Field name="barNumVert" label="Vertical bar #" data={data} />
            <Field name="spacingVert" label="Vertical spacing (in)" data={data} />
            <Field name="barNumHor" label="Horizontal bar #" data={data} />
            <Field name="spacingHor" label="Horizontal spacing (in)" data={data} />
          </Grid>
        </Card>

        <Card title="Loads from Internal Stability">
          <p className="text-sm text-slate-500 mb-4">
            Enter the maximum T<sub>max</sub> values from the internal stability analysis.
          </p>
          <Grid cols={2}>
            <Field name="huStr" label="HU Strength I (kip/ft)" data={data} />
            <Field name="huEe" label="HU Extreme Event I (kip/ft)" data={data} />
          </Grid>
        </Card>

        <div className="flex justify-end gap-3">
          <Button variant="outline" asChild>
            <Link href={cancelHref}>Cancel</Link>
          </Button>
          <Button type="submit" disabled={isPending}>
            {isPending ? 'Saving…' : isEdit ? 'Save Changes' : 'Create Design'}
          </Button>
        </div>
      </form>
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border bg-card p-5">
      <h2 className="text-base font-semibold text-slate-700 mb-4">{title}</h2>
      {children}
    </div>
  );
}

function Grid({ cols, children }: { cols: 2 | 3 | 4; children: React.ReactNode }) {
  const cls =
    cols === 2 ? 'grid grid-cols-2 gap-4'
    : cols === 3 ? 'grid grid-cols-2 md:grid-cols-3 gap-4'
    : 'grid grid-cols-2 md:grid-cols-4 gap-4';
  return <div className={cls}>{children}</div>;
}

function Field({
  name, label, data,
}: {
  name: string; label: string; data?: Record<string, unknown>;
}) {
  return (
    <div className="space-y-1">
      <Label htmlFor={name} className="text-sm text-slate-600">{label}</Label>
      <Input
        id={name} name={name} type="number" step="any" required
        defaultValue={data?.[name] !== undefined ? (data[name] as number) : undefined}
      />
    </div>
  );
}
