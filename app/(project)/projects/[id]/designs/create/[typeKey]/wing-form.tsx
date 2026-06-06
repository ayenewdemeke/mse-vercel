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

export default function WingForm({
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
        <Card title="Design name">
          <div className="max-w-sm">
            <Label htmlFor="name" className="text-sm text-slate-600">Name (optional)</Label>
            <Input
              id="name" name="name" type="text"
              placeholder="e.g. South Wing Wall"
              defaultValue={designName ?? ''}
              className="mt-1"
            />
          </div>
        </Card>

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

        <Card title="LS Moment Arm">
          <Grid cols={2}>
            <Field name="yev" label="YEV" data={data} />
            <Field name="ylsV" label="YLS.V" data={data} />
          </Grid>
        </Card>

        <Card title="Geometry & Materials">
          <Grid cols={3}>
            <Field name="bstemBatter" label="βstem-Batter (deg)" data={data} />
            <Field name="theta" label="θ (deg)" data={data} />
            <Field name="bI" label="β(i) (deg)" data={data} />
            <Field name="deltaS" label="δs" data={data} />
            <Field name="gRFill" label="γr.fill (pcf)" data={data} />
            <Field name="phiRFill" label="φr.fill (deg)" data={data} />
          </Grid>
        </Card>

        <Card title="Foundation / Bearing">
          <Grid cols={2}>
            <Field name="sigmaBrg" label="σ_brg (ksf)" data={data} />
            <Field name="phiFSoil" label="φF.soil (deg)" data={data} />
          </Grid>
        </Card>

        <Card title="EQ Parameters">
          <Grid cols={3}>
            <Field name="pga" label="PGA" data={data} />
            <Field name="fPgaEq" label="F_PGA.EQ" data={data} />
            <Field name="kV" label="K_V" data={data} />
          </Grid>
        </Card>

        <Card title="Extensible Reinforcement — Geosynthetic Strip">
          <Grid cols={3}>
            <Field name="phiPoGs" label="φ/φo.Gs" data={data} />
            <Field name="alphaGs" label="α.Gs" data={data} />
            <Field name="rcGs" label="Rc.Gs" data={data} />
            <Field name="gStrip" label="G.strip" data={data} />
            <Field name="c" label="c" data={data} />
          </Grid>
        </Card>

        <Card title="Extensible Reinforcement — Geosynthetic Grid">
          <Grid cols={3}>
            <Field name="phiPoGg" label="φ/φo.Gg" data={data} />
            <Field name="phiPoGgEe" label="φ/φo.Gg.EE" data={data} />
            <Field name="alphaGg" label="α.Gg" data={data} />
            <Field name="rcGg" label="Rc.Gg" data={data} />
            <Field name="y" label="y" data={data} />
            <Field name="a" label="a" data={data} />
            <Field name="maxDh" label="Max Dh" data={data} />
          </Grid>
        </Card>

        <Card title="Inextensible Reinforcement — Steel Grid">
          <Grid cols={3}>
            <Field name="tSt" label="t.st" data={data} />
            <Field name="stSg" label="St.Sg" data={data} />
            <Field name="phiPoSg" label="φ/φo.Sg" data={data} />
            <Field name="alphaSg" label="α.Sg" data={data} />
            <Field name="rcSg" label="Rc.Sg" data={data} />
          </Grid>
        </Card>

        <Card title="Inextensible Reinforcement — Steel Strip">
          <Grid cols={3}>
            <Field name="bSs" label="b.Ss" data={data} />
            <Field name="phiPoSs" label="φ/φo.Ss" data={data} />
            <Field name="alphaSs" label="α.Ss" data={data} />
            <Field name="sh" label="Sh" data={data} />
            <Field name="d60" label="D60" data={data} />
            <Field name="d10" label="D10" data={data} />
          </Grid>
        </Card>

        <Card title="Design heights, spacing and reinforcement length">
          <Grid cols={3}>
            <Field name="minDesignHeight" label="Min Height (ft)" data={data} />
            <Field name="maxDesignHeight" label="Max Height (ft)" data={data} />
            <Field name="sV" label="Sv (ft)" data={data} />
            <Field name="minRl" label="Min RL (ft)" data={data} />
          </Grid>
        </Card>

        <div className="flex justify-end gap-3">
          <Button variant="outline" asChild>
            <Link href={cancelHref}>Cancel</Link>
          </Button>
          <Button type="submit" disabled={isPending}>
            {isPending ? 'Saving…' : isEdit ? 'Save changes' : 'Create design'}
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
