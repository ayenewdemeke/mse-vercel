'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface ExternalData {
  yev: number;
  ylsV: number;
  bstemBatter: number;
  theta?: number;
  bI: number;
  sigmaBrg: number;
  deltaS: number;
  gRFill: number;
  phiRFill: number;
  phiFSoil: number;
  pga: number;
  fPgaEq: number;
  kV: number;
  minDesignHeight: number;
  maxDesignHeight: number;
  sV: number;
}

interface Props {
  projectId: string;
  designId: string;
  typeName: string;
  designName?: string | null;
  data: ExternalData;
  hasTheta: boolean;
  action: (
    designId: string,
    projectId: string,
    formData: FormData,
  ) => Promise<{ error: string } | void>;
}

export default function ExternalStabilityEditForm({
  projectId,
  designId,
  typeName,
  designName,
  data,
  hasTheta,
  action,
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
            <Input id="name" name="name" type="text" defaultValue={designName ?? ''} placeholder="e.g. Bridge Abutment — Station 12+00" className="mt-1" />
          </div>
        </div>

        <div className="rounded-xl border bg-card p-5">
          <h2 className="text-base font-semibold text-slate-700 mb-4">LS Moment Arm</h2>
          <div className="grid grid-cols-2 gap-4">
            <Field name="yev" label="YEV" defaultValue={data.yev} />
            <Field name="ylsV" label="YLS.V" defaultValue={data.ylsV} />
          </div>
        </div>

        <div className="rounded-xl border bg-card p-5">
          <h2 className="text-base font-semibold text-slate-700 mb-4">Material Properties</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <Field name="bstemBatter" label="βstem-Batter (deg)" defaultValue={data.bstemBatter} />
            {hasTheta && data.theta !== undefined && (
              <Field name="theta" label="θ (deg)" defaultValue={data.theta} />
            )}
            <Field name="bI" label="β(i) (deg)" defaultValue={data.bI} />
            <Field name="sigmaBrg" label="σ_brg (ksf)" defaultValue={data.sigmaBrg} />
            <Field name="deltaS" label="δs" defaultValue={data.deltaS} />
            <Field name="gRFill" label="γr.fill (pcf)" defaultValue={data.gRFill} />
            <Field name="phiRFill" label="φr.fill (deg)" defaultValue={data.phiRFill} />
            <Field name="phiFSoil" label="φF.soil (deg)" defaultValue={data.phiFSoil} />
          </div>
        </div>

        <div className="rounded-xl border bg-card p-5">
          <h2 className="text-base font-semibold text-slate-700 mb-4">EQ Parameters</h2>
          <div className="grid grid-cols-3 gap-4">
            <Field name="pga" label="PGA" defaultValue={data.pga} />
            <Field name="fPgaEq" label="F_PGA.EQ" defaultValue={data.fPgaEq} />
            <Field name="kV" label="K_V" defaultValue={data.kV} />
          </div>
        </div>

        <div className="rounded-xl border bg-card p-5">
          <h2 className="text-base font-semibold text-slate-700 mb-4">Design Height and Spacing</h2>
          <div className="grid grid-cols-3 gap-4">
            <Field name="minDesignHeight" label="Min Height (ft)" defaultValue={data.minDesignHeight} />
            <Field name="maxDesignHeight" label="Max Height (ft)" defaultValue={data.maxDesignHeight} />
            <Field name="sV" label="Sv (ft)" defaultValue={data.sV} />
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

function Field({
  name,
  label,
  defaultValue,
}: {
  name: string;
  label: string;
  defaultValue: number;
}) {
  return (
    <div className="space-y-1">
      <Label htmlFor={name} className="text-sm text-slate-600">
        {label}
      </Label>
      <Input id={name} name={name} type="number" step="any" required defaultValue={defaultValue} />
    </div>
  );
}
