import type { PanelFaceDesign } from '@prisma/client';

export default function PanelFaceView({ d }: { d: PanelFaceDesign }) {
  return (
    <div className="space-y-4">
      <Section title="Material Properties">
        <Row label="f'c (ksi)" value={d.fc} />
        <Row label="fy (ksi)" value={d.fy} />
      </Section>

      <Section title="Panel Geometry">
        <Row label="L panel (ft)" value={d.lPanel} />
        <Row label="h panel (ft)" value={d.hPanel} />
        <Row label="t panel (in)" value={d.tPanel} />
        <Row label="S sr (in)" value={d.ssr} />
        <Row label="Cover +ve (in)" value={d.cCoverPos} />
        <Row label="Cover −ve (in)" value={d.cCoverNeg} />
      </Section>

      <Section title="Panel Reinforcement">
        <Row label="Vertical bar #" value={d.barNumVert} />
        <Row label="Vertical spacing (in)" value={d.spacingVert} />
        <Row label="Horizontal bar #" value={d.barNumHor} />
        <Row label="Horizontal spacing (in)" value={d.spacingHor} />
      </Section>

      <Section title="Loads from Internal Stability">
        <Row label="HU Strength I (kip/ft)" value={d.huStr} />
        <Row label="HU Extreme Event I (kip/ft)" value={d.huEe} />
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
