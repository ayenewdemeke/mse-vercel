import type { AbutmentInternalStability, WingInternalStability } from '@prisma/client';

type Props = {
  designType: string;
  abutmentInternal?: AbutmentInternalStability;
  wingInternal?: WingInternalStability;
};

export default function InternalStabilityView({ designType, abutmentInternal, wingInternal }: Props) {
  const d = abutmentInternal ?? wingInternal;
  if (!d) return <div className="text-slate-500 text-sm">No data found.</div>;
  const isWing = designType === 'wing_internal_stability';

  return (
    <div className="space-y-4">
      <Section title="Material Properties">
        <Row label="βstem-Batter (deg)" value={d.bstemBatter} />
        <Row label="β(i) (deg)" value={d.bI} />
        <Row label="δs" value={d.deltaS} />
        <Row label="γr.fill (pcf)" value={d.gRFill} />
        <Row label="φr.fill (deg)" value={d.phiRFill} />
      </Section>

      <Section title="EQ Parameters">
        <Row label="PGA" value={d.pga} />
        <Row label="F_PGA.EQ" value={d.fPgaEq} />
        <Row label="K_V" value={d.kV} />
      </Section>

      <Section title="Extensible Reinforcement — Geosynthetic Strips">
        <Row label="φ/φo.Gs" value={d.phiPoGs} />
        <Row label="α.Gs" value={d.alphaGs} />
        <Row label="Rc.Gs" value={d.rcGs} />
        {isWing && 'gStrip' in d && <Row label="G.strip" value={(d as WingInternalStability).gStrip} />}
        <Row label="c" value={d.c} />
      </Section>

      <Section title="Extensible Reinforcement — Geosynthetic Grid">
        <Row label="φ/φo.Gg" value={d.phiPoGg} />
        <Row label="φ/φo.Gg.EE" value={d.phiPoGgEe} />
        <Row label="α.Gg" value={d.alphaGg} />
        <Row label="Rc.Gg" value={d.rcGg} />
        <Row label="y" value={d.y} />
        <Row label="a" value={d.a} />
        <Row label="Max Dh" value={d.maxDh} />
      </Section>

      <Section title="Inextensible Reinforcement — Steel Grid">
        <Row label="t.st" value={d.tSt} />
        <Row label="St.Sg" value={d.stSg} />
        <Row label="φ/φo.Sg" value={d.phiPoSg} />
        <Row label="α.Sg" value={d.alphaSg} />
        <Row label="Rc.Sg" value={d.rcSg} />
      </Section>

      <Section title="Inextensible Reinforcement — Steel Strips">
        <Row label="b.Ss" value={d.bSs} />
        <Row label="φ/φo.Ss" value={d.phiPoSs} />
        {!isWing && 'f2' in d && <Row label="f2" value={(d as AbutmentInternalStability).f2} />}
        <Row label="α.Ss" value={d.alphaSs} />
        <Row label="Sh" value={d.sh} />
        {isWing && 'd60' in d && <Row label="D60" value={(d as WingInternalStability).d60} />}
        {isWing && 'd10' in d && <Row label="D10" value={(d as WingInternalStability).d10} />}
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
