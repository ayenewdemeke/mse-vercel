import type { AbutmentExternalStability, WingExternalStabilityLl, WingExternalStability } from '@prisma/client';

type Props = {
  designType: string;
  abutmentExternal?: AbutmentExternalStability;
  wingExternalLl?: WingExternalStabilityLl;
  wingExternal?: WingExternalStability;
};

export default function ExternalStabilityView({ designType, abutmentExternal, wingExternalLl, wingExternal }: Props) {
  const d = abutmentExternal ?? wingExternalLl ?? wingExternal;
  if (!d) return <div className="text-slate-500 text-sm">No data found.</div>;

  const hasTheta = designType !== 'abutment_external_stability';

  return (
    <div className="space-y-4">
      <Section title="LS Moment Arm">
        <Row label="YEV" value={d.yev} />
        <Row label="YLS.V" value={d.ylsV} />
      </Section>

      <Section title="Material Properties">
        <Row label="βstem-Batter (deg)" value={d.bstemBatter} />
        {hasTheta && 'theta' in d && <Row label="θ (deg)" value={(d as WingExternalStability).theta} />}
        <Row label="β(i) (deg)" value={d.bI} />
        <Row label="σ_brg (ksf)" value={d.sigmaBrg} />
        <Row label="δs" value={d.deltaS} />
        <Row label="γr.fill (pcf)" value={d.gRFill} />
        <Row label="φr.fill (deg)" value={d.phiRFill} />
        <Row label="φF.soil (deg)" value={d.phiFSoil} />
      </Section>

      <Section title="EQ Parameters">
        <Row label="PGA" value={d.pga} />
        <Row label="F_PGA.EQ" value={d.fPgaEq} />
        <Row label="K_V" value={d.kV} />
      </Section>

      <Section title="Design Height and Spacing">
        <Row label="Min Height (ft)" value={d.minDesignHeight} />
        <Row label="Max Height (ft)" value={d.maxDesignHeight} />
        <Row label="Sv (ft)" value={d.sV} />
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border bg-card overflow-hidden">
      <div className="bg-slate-50 border-b px-4 py-2">
        <h2 className="text-sm font-semibold text-slate-600 uppercase tracking-wider">{title}</h2>
      </div>
      <div className="divide-y">{children}</div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between px-4 py-2.5 text-sm">
      <span className="text-slate-500">{label}</span>
      <span className="font-medium text-slate-800">{value}</span>
    </div>
  );
}
