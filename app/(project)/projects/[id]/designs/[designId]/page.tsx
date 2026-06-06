import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { auth } from '@/auth';
import { Button } from '@/components/ui/button';
import { getDesignWithData } from '@/app/actions/design-inputs';
import { getProject } from '@/app/actions/projects';
import { format } from 'date-fns';
import DeleteDesignButton from '../delete-design-button';

export default async function DesignViewPage({
  params,
}: {
  params: Promise<{ id: string; designId: string }>;
}) {
  const { id, designId } = await params;
  const session = await auth();
  if (!session?.user?.id) redirect('/login');

  const [design, project] = await Promise.all([getDesignWithData(designId, id), getProject(id)]);
  if (!design || !project) notFound();

  const currentUserId = session.user.id;
  const isOwner = project.userId === currentUserId;
  const canEdit = isOwner || design.userId === currentUserId;
  const typeKey = design.designType.key;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <Button variant="ghost" size="sm" asChild className="mb-1 -ml-2">
            <Link href={`/projects/${id}/designs`}>← Designs</Link>
          </Button>
          <h1 className="text-2xl font-semibold text-slate-800">{design.designType.name}</h1>
          {design.name && <p className="text-slate-700 text-sm font-medium">{design.name}</p>}
          <p className="text-slate-500 text-sm">
            Created by {design.creator.name} · {format(new Date(design.createdAt), 'MMM d, yyyy')}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button asChild size="sm">
            <Link href={`/projects/${id}/designs/${designId}/analyze`}>Analyze</Link>
          </Button>
          {canEdit && (
            <Button variant="outline" size="sm" asChild>
              <Link href={`/projects/${id}/designs/${designId}/edit`}>Edit</Link>
            </Button>
          )}
          {canEdit && <DeleteDesignButton designId={designId} projectId={id} />}
        </div>
      </div>

      {typeKey === 'abutment' && design.abutmentDesign ? (
        <AbutmentView d={design.abutmentDesign} />
      ) : typeKey === 'wing' && design.wingDesign ? (
        <WingView d={design.wingDesign} />
      ) : typeKey === 'panel_face' && design.panelFaceDesign ? (
        <PanelFaceView d={design.panelFaceDesign} />
      ) : (
        <p className="text-slate-500">No data found.</p>
      )}
    </div>
  );
}

function AbutmentView({ d }: { d: Record<string, unknown> }) {
  return (
    <div className="space-y-4">
      <Section title="LS Moment Arm">
        <Row label="YEV" value={d.yev} />
        <Row label="YLS.V" value={d.ylsV} />
      </Section>
      <Section title="Geometry & Materials">
        <Row label="βstem-Batter (deg)" value={d.bstemBatter} />
        <Row label="β(i) (deg)" value={d.bI} />
        <Row label="δs" value={d.deltaS} />
        <Row label="γr.fill (pcf)" value={d.gRFill} />
        <Row label="φr.fill (deg)" value={d.phiRFill} />
      </Section>
      <Section title="Foundation / Bearing">
        <Row label="σ_brg (ksf)" value={d.sigmaBrg} />
        <Row label="φF.soil (deg)" value={d.phiFSoil} />
      </Section>
      <Section title="EQ Parameters">
        <Row label="PGA" value={d.pga} />
        <Row label="F_PGA.EQ" value={d.fPgaEq} />
        <Row label="K_V" value={d.kV} />
      </Section>
      <Section title="Extensible Reinforcement — Geosynthetic Strip">
        <Row label="φ/φo.Gs" value={d.phiPoGs} />
        <Row label="α.Gs" value={d.alphaGs} />
        <Row label="Rc.Gs" value={d.rcGs} />
        <Row label="c" value={d.c} />
      </Section>
      <Section title="Extensible Reinforcement — Geosynthetic Grid">
        <Row label="φ/φo.Gg" value={d.phiPoGg} />
        <Row label="φ/φo.Gg.EE" value={d.phiPoGgEe} />
        <Row label="α.Gg" value={d.alphaGg} />
        <Row label="Rc.Gg" value={d.rcGg} />
        <Row label="y" value={d.y} />
        <Row label="Max Dh" value={d.maxDh} />
        <Row label="a" value={d.a} />
      </Section>
      <Section title="Inextensible Reinforcement — Steel Grid">
        <Row label="t.st" value={d.tSt} />
        <Row label="St.Sg" value={d.stSg} />
        <Row label="φ/φo.Sg" value={d.phiPoSg} />
        <Row label="α.Sg" value={d.alphaSg} />
        <Row label="Rc.Sg" value={d.rcSg} />
      </Section>
      <Section title="Inextensible Reinforcement — Steel Strip">
        <Row label="b.Ss" value={d.bSs} />
        <Row label="φ/φo.Ss" value={d.phiPoSs} />
        <Row label="f2" value={d.f2} />
        <Row label="α.Ss" value={d.alphaSs} />
        <Row label="Sh" value={d.sh} />
      </Section>
      <Section title="Design heights, spacing and reinforcement length">
        <Row label="Min Height (ft)" value={d.minDesignHeight} />
        <Row label="Max Height (ft)" value={d.maxDesignHeight} />
        <Row label="Sv (ft)" value={d.sV} />
        <Row label="Min RL (ft)" value={d.minRl} />
      </Section>
    </div>
  );
}

function WingView({ d }: { d: Record<string, unknown> }) {
  return (
    <div className="space-y-4">
      <Section title="LS Moment Arm">
        <Row label="YEV" value={d.yev} />
        <Row label="YLS.V" value={d.ylsV} />
      </Section>
      <Section title="Geometry & Materials">
        <Row label="βstem-Batter (deg)" value={d.bstemBatter} />
        <Row label="θ (deg)" value={d.theta} />
        <Row label="β(i) (deg)" value={d.bI} />
        <Row label="δs" value={d.deltaS} />
        <Row label="γr.fill (pcf)" value={d.gRFill} />
        <Row label="φr.fill (deg)" value={d.phiRFill} />
      </Section>
      <Section title="Foundation / Bearing">
        <Row label="σ_brg (ksf)" value={d.sigmaBrg} />
        <Row label="φF.soil (deg)" value={d.phiFSoil} />
      </Section>
      <Section title="EQ Parameters">
        <Row label="PGA" value={d.pga} />
        <Row label="F_PGA.EQ" value={d.fPgaEq} />
        <Row label="K_V" value={d.kV} />
      </Section>
      <Section title="Extensible Reinforcement — Geosynthetic Strip">
        <Row label="φ/φo.Gs" value={d.phiPoGs} />
        <Row label="α.Gs" value={d.alphaGs} />
        <Row label="Rc.Gs" value={d.rcGs} />
        <Row label="G.strip" value={d.gStrip} />
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
      <Section title="Inextensible Reinforcement — Steel Strip">
        <Row label="b.Ss" value={d.bSs} />
        <Row label="φ/φo.Ss" value={d.phiPoSs} />
        <Row label="α.Ss" value={d.alphaSs} />
        <Row label="Sh" value={d.sh} />
        <Row label="D60" value={d.d60} />
        <Row label="D10" value={d.d10} />
      </Section>
      <Section title="Design heights, spacing and reinforcement length">
        <Row label="Min Height (ft)" value={d.minDesignHeight} />
        <Row label="Max Height (ft)" value={d.maxDesignHeight} />
        <Row label="Sv (ft)" value={d.sV} />
        <Row label="Min RL (ft)" value={d.minRl} />
      </Section>
    </div>
  );
}

function PanelFaceView({ d }: { d: Record<string, unknown> }) {
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
    <div className="rounded-xl border bg-card p-5">
      <h2 className="text-base font-semibold text-slate-700 mb-3">{title}</h2>
      <dl className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-2 text-sm">{children}</dl>
    </div>
  );
}

function Row({ label, value }: { label: string; value: unknown }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-slate-100 py-1 last:border-0">
      <dt className="text-slate-500">{label}</dt>
      <dd className="font-medium text-slate-800 tabular-nums">
        {typeof value === 'number' ? value : '—'}
      </dd>
    </div>
  );
}
