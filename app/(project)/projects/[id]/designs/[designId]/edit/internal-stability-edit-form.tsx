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
  isWing: boolean;
  data: Record<string, unknown>;
  action: (
    designId: string,
    projectId: string,
    formData: FormData,
  ) => Promise<{ error: string } | void>;
}

export default function InternalStabilityEditForm({
  projectId, designId, typeName, designName, isWing, data, action,
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
            <Input id="name" name="name" type="text" defaultValue={designName ?? ''} placeholder="e.g. Bridge Wing — Station 12+00" className="mt-1" />
          </div>
        </div>

        <div className="rounded-xl border bg-card p-5">
          <h2 className="text-base font-semibold text-slate-700 mb-4">Material Properties</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <Field name="bstemBatter" label="βstem-Batter (deg)" data={data} />
            <Field name="bI" label="β(i) (deg)" data={data} />
            <Field name="deltaS" label="δs" data={data} />
            <Field name="gRFill" label="γr.fill (pcf)" data={data} />
            <Field name="phiRFill" label="φr.fill (deg)" data={data} />
          </div>
        </div>

        <div className="rounded-xl border bg-card p-5">
          <h2 className="text-base font-semibold text-slate-700 mb-4">EQ Parameters</h2>
          <div className="grid grid-cols-3 gap-4">
            <Field name="pga" label="PGA" data={data} />
            <Field name="fPgaEq" label="F_PGA.EQ" data={data} />
            <Field name="kV" label="K_V" data={data} />
          </div>
        </div>

        <div className="rounded-xl border bg-card p-5">
          <h2 className="text-base font-semibold text-slate-700 mb-4">Extensible Reinforcement — Geosynthetic Strips</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <Field name="phiPoGs" label="φ/φo.Gs" data={data} />
            <Field name="alphaGs" label="α.Gs" data={data} />
            <Field name="rcGs" label="Rc.Gs" data={data} />
            {isWing && <Field name="gStrip" label="G.strip" data={data} />}
            <Field name="c" label="c" data={data} />
          </div>
        </div>

        <div className="rounded-xl border bg-card p-5">
          <h2 className="text-base font-semibold text-slate-700 mb-4">Extensible Reinforcement — Geosynthetic Grid</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <Field name="phiPoGg" label="φ/φo.Gg" data={data} />
            <Field name="phiPoGgEe" label="φ/φo.Gg.EE" data={data} />
            <Field name="alphaGg" label="α.Gg" data={data} />
            <Field name="rcGg" label="Rc.Gg" data={data} />
            <Field name="y" label="y" data={data} />
            <Field name="a" label="a" data={data} />
            <Field name="maxDh" label="Max Dh" data={data} />
          </div>
        </div>

        <div className="rounded-xl border bg-card p-5">
          <h2 className="text-base font-semibold text-slate-700 mb-4">Inextensible Reinforcement — Steel Grid</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <Field name="tSt" label="t.st" data={data} />
            <Field name="stSg" label="St.Sg" data={data} />
            <Field name="phiPoSg" label="φ/φo.Sg" data={data} />
            <Field name="alphaSg" label="α.Sg" data={data} />
            <Field name="rcSg" label="Rc.Sg" data={data} />
          </div>
        </div>

        <div className="rounded-xl border bg-card p-5">
          <h2 className="text-base font-semibold text-slate-700 mb-4">Inextensible Reinforcement — Steel Strips</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <Field name="bSs" label="b.Ss" data={data} />
            <Field name="phiPoSs" label="φ/φo.Ss" data={data} />
            {!isWing && <Field name="f2" label="f2" data={data} />}
            <Field name="alphaSs" label="α.Ss" data={data} />
            <Field name="sh" label="Sh" data={data} />
            {isWing && <Field name="d60" label="D60" data={data} />}
            {isWing && <Field name="d10" label="D10" data={data} />}
          </div>
        </div>

        <div className="rounded-xl border bg-card p-5">
          <h2 className="text-base font-semibold text-slate-700 mb-4">Design Height and Spacing</h2>
          <div className="grid grid-cols-3 gap-4">
            <Field name="minDesignHeight" label="Min Height (ft)" data={data} />
            <Field name="maxDesignHeight" label="Max Height (ft)" data={data} />
            <Field name="sV" label="Sv (ft)" data={data} />
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
