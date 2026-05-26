'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface Props {
  projectId: string;
  typeKey: string;
  typeName: string;
  action: (projectId: string, formData: FormData) => Promise<{ error: string } | void>;
  hasTheta?: boolean;
}

export default function ExternalStabilityForm({ projectId, typeName, action, hasTheta }: Props) {
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
            <Input id="name" name="name" type="text" placeholder="e.g. Bridge Abutment — Station 12+00" className="mt-1" />
          </div>
        </div>
        {/* Load Factors Info */}
        <div className="rounded-xl border bg-card p-5">
          <h2 className="text-base font-semibold text-slate-700 mb-3">Load &amp; Resistance Factors (AASHTO LRFD)</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs text-slate-600">
            <div className="rounded border p-2">
              <div className="font-medium text-slate-700 mb-1">Resistance</div>
              <div>φb.str = 0.65</div>
              <div>φb.ee = 0.90</div>
              <div>φsliding = 1.0</div>
            </div>
            <div className="rounded border p-2">
              <div className="font-medium text-slate-700 mb-1">Strength I</div>
              <div>γLS = 1.75</div>
              <div>γEH = 1.50</div>
              <div>γEV = 1.35 / 1.0</div>
            </div>
            <div className="rounded border p-2">
              <div className="font-medium text-slate-700 mb-1">Service I</div>
              <div>γLS = 1.0</div>
              <div>γEH = 1.0</div>
              <div>γEV = 1.0</div>
            </div>
            <div className="rounded border p-2">
              <div className="font-medium text-slate-700 mb-1">Extreme Event I</div>
              <div>γLS = 0.5</div>
              <div>γEH = 0.0</div>
              <div>γEV = 1.0 / γEQ = 1.0</div>
            </div>
          </div>
        </div>

        {/* LS Moment Arm */}
        <div className="rounded-xl border bg-card p-5">
          <h2 className="text-base font-semibold text-slate-700 mb-4">LS Moment Arm</h2>
          <div className="grid grid-cols-2 gap-4">
            <Field name="yev" label="YEV" />
            <Field name="ylsV" label="YLS.V" />
          </div>
        </div>

        {/* Material Properties */}
        <div className="rounded-xl border bg-card p-5">
          <h2 className="text-base font-semibold text-slate-700 mb-4">Material Properties</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <Field name="bstemBatter" label="βstem-Batter (deg)" />
            {hasTheta && <Field name="theta" label="θ (deg)" />}
            <Field name="bI" label="β(i) (deg)" />
            <Field name="sigmaBrg" label="σ_brg (ksf)" />
            <Field name="deltaS" label="δs" />
            <Field name="gRFill" label="γr.fill (pcf)" />
            <Field name="phiRFill" label="φr.fill (deg)" />
            <Field name="phiFSoil" label="φF.soil (deg)" />
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
