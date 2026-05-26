'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface Props {
  projectId: string;
  typeName: string;
  action: (projectId: string, formData: FormData) => Promise<{ error: string } | void>;
  isWing?: boolean;
}

export default function InternalStabilityForm({ projectId, typeName, action, isWing }: Props) {
  const [error, setError] = useState('');
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await action(projectId, fd);
      if (result?.error) setError(result.error);
    });
  }

  return (
    <div className="max-w-3xl">
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="sm" asChild>
          <Link href={`/projects/${projectId}/designs`}>← Back</Link>
        </Button>
        <h1 className="text-2xl font-semibold text-slate-800">{typeName}</h1>
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
            <Input id="name" name="name" type="text" placeholder="e.g. Bridge Wing — Station 12+00" className="mt-1" />
          </div>
        </div>
        {/* Material Properties */}
        <div className="rounded-xl border bg-card p-5">
          <h2 className="text-base font-semibold text-slate-700 mb-4">Material Properties</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <Field name="bstemBatter" label="βstem-Batter (deg)" />
            <Field name="bI" label="β(i) (deg)" />
            <Field name="deltaS" label="δs" />
            <Field name="gRFill" label="γr.fill (pcf)" />
            <Field name="phiRFill" label="φr.fill (deg)" />
          </div>
        </div>

        {/* EQ Parameters */}
        <div className="rounded-xl border bg-card p-5">
          <h2 className="text-base font-semibold text-slate-700 mb-4">EQ Parameters</h2>
          <div className="grid grid-cols-3 gap-4">
            <Field name="pga" label="PGA" />
            <Field name="fPgaEq" label="F_PGA.EQ" />
            <Field name="kV" label="K_V" />
          </div>
        </div>

        {/* Extensible Reinforcement (Geosynthetic Strips) */}
        <div className="rounded-xl border bg-card p-5">
          <h2 className="text-base font-semibold text-slate-700 mb-4">Extensible Reinforcement — Geosynthetic Strips</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <Field name="phiPoGs" label="φ/φo.Gs" />
            <Field name="alphaGs" label="α.Gs" />
            <Field name="rcGs" label="Rc.Gs" />
            {isWing && <Field name="gStrip" label="G.strip" />}
            <Field name="c" label="c" />
          </div>
        </div>

        {/* Extensible Reinforcement (Geosynthetic Grid) */}
        <div className="rounded-xl border bg-card p-5">
          <h2 className="text-base font-semibold text-slate-700 mb-4">Extensible Reinforcement — Geosynthetic Grid</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <Field name="phiPoGg" label="φ/φo.Gg" />
            <Field name="phiPoGgEe" label="φ/φo.Gg.EE" />
            <Field name="alphaGg" label="α.Gg" />
            <Field name="rcGg" label="Rc.Gg" />
            <Field name="y" label="y" />
            <Field name="a" label="a" />
            <Field name="maxDh" label="Max Dh" />
          </div>
        </div>

        {/* Inextensible Reinforcement (Steel Grid) */}
        <div className="rounded-xl border bg-card p-5">
          <h2 className="text-base font-semibold text-slate-700 mb-4">Inextensible Reinforcement — Steel Grid</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <Field name="tSt" label="t.st" />
            <Field name="stSg" label="St.Sg" />
            <Field name="phiPoSg" label="φ/φo.Sg" />
            <Field name="alphaSg" label="α.Sg" />
            <Field name="rcSg" label="Rc.Sg" />
          </div>
        </div>

        {/* Inextensible Reinforcement (Steel Strips) */}
        <div className="rounded-xl border bg-card p-5">
          <h2 className="text-base font-semibold text-slate-700 mb-4">Inextensible Reinforcement — Steel Strips</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <Field name="bSs" label="b.Ss" />
            <Field name="phiPoSs" label="φ/φo.Ss" />
            {!isWing && <Field name="f2" label="f2" />}
            <Field name="alphaSs" label="α.Ss" />
            <Field name="sh" label="Sh" />
            {isWing && <Field name="d60" label="D60" />}
            {isWing && <Field name="d10" label="D10" />}
          </div>
        </div>

        {/* Design Height and Spacing */}
        <div className="rounded-xl border bg-card p-5">
          <h2 className="text-base font-semibold text-slate-700 mb-4">Design Height and Spacing</h2>
          <div className="grid grid-cols-3 gap-4">
            <Field name="minDesignHeight" label="Min Height (ft)" />
            <Field name="maxDesignHeight" label="Max Height (ft)" />
            <Field name="sV" label="Sv (ft)" />
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <Button variant="outline" asChild>
            <Link href={`/projects/${projectId}/designs`}>Cancel</Link>
          </Button>
          <Button type="submit" disabled={isPending}>
            {isPending ? 'Saving…' : 'Create Design'}
          </Button>
        </div>
      </form>
    </div>
  );
}

function Field({ name, label }: { name: string; label: string }) {
  return (
    <div className="space-y-1">
      <Label htmlFor={name} className="text-sm text-slate-600">
        {label}
      </Label>
      <Input id={name} name={name} type="number" step="any" required />
    </div>
  );
}
