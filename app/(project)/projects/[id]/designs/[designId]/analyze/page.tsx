import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { auth } from '@/auth';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FileDown } from 'lucide-react';
import { getDesignWithData } from '@/app/actions/design-inputs';
import {
  analyzeAbutmentExternal,
  analyzeWingExternalLl,
  analyzeWingExternalNoLl,
  type AnalysisRow,
} from '@/lib/calculations/external-stability';
import {
  analyzeAbutmentInternal,
  analyzeWingInternal,
  type InternalStabilityRow,
} from '@/lib/calculations/internal-stability';
import { InternalStabilityChart } from '@/components/charts/internal-stability-chart-client';
import { analyzePanelFace, type PanelFaceResult } from '@/lib/calculations/panel-face';

const N = (v: number, d = 4) => (isFinite(v) ? v.toFixed(d) : '—');

function badgeClass(s: string) {
  return s === 'Adequate'
    ? 'bg-green-100 text-green-700 border border-green-200'
    : 'bg-red-100 text-red-700 border border-red-200';
}

// ─── Page dispatcher ──────────────────────────────────────────────────────────

export default async function AnalyzePage({
  params,
}: {
  params: Promise<{ id: string; designId: string }>;
}) {
  const { id, designId } = await params;

  const session = await auth();
  if (!session?.user?.id) redirect('/login');

  const design = await getDesignWithData(designId, id);
  if (!design) notFound();

  const typeKey = design.designType.key;

  if (typeKey === 'abutment' && design.abutmentDesign) {
    const d = design.abutmentDesign;
    const extRows = analyzeAbutmentExternal(d);
    const intRows = analyzeAbutmentInternal(d);
    return (
      <AnalyzeShell
        id={id}
        designId={designId}
        typeName={design.designType.name}
        designName={design.name}
        showReportLinks
      >
        <Tabs defaultValue="external" className="w-full">
          <TabsList>
            <TabsTrigger value="external">External Stability</TabsTrigger>
            <TabsTrigger value="internal">Internal Stability</TabsTrigger>
          </TabsList>
          <TabsContent value="external">
            <ExternalResults rows={extRows} />
          </TabsContent>
          <TabsContent value="internal">
            <InternalResults rows={intRows} />
          </TabsContent>
        </Tabs>
      </AnalyzeShell>
    );
  }

  if (typeKey === 'wing' && design.wingDesign) {
    const d = design.wingDesign;
    const extLlRows = analyzeWingExternalLl(d);
    const extNoLlRows = analyzeWingExternalNoLl(d);
    const intRows = analyzeWingInternal(d);
    return (
      <AnalyzeShell
        id={id}
        designId={designId}
        typeName={design.designType.name}
        designName={design.name}
        showReportLinks
      >
        <Tabs defaultValue="external-ll" className="w-full">
          <TabsList>
            <TabsTrigger value="external-ll">External (with LL)</TabsTrigger>
            <TabsTrigger value="external-no-ll">External (without LL)</TabsTrigger>
            <TabsTrigger value="internal">Internal Stability</TabsTrigger>
          </TabsList>
          <TabsContent value="external-ll">
            <ExternalResults rows={extLlRows} />
          </TabsContent>
          <TabsContent value="external-no-ll">
            <ExternalResults rows={extNoLlRows} />
          </TabsContent>
          <TabsContent value="internal">
            <InternalResults rows={intRows} />
          </TabsContent>
        </Tabs>
      </AnalyzeShell>
    );
  }

  if (typeKey === 'panel_face' && design.panelFaceDesign) {
    const d = design.panelFaceDesign;
    const r = analyzePanelFace(d);
    return (
      <AnalyzeShell
        id={id}
        designId={designId}
        typeName={design.designType.name}
        designName={design.name}
        showReportLinks
      >
        <PanelFaceResults result={r} inputs={d} />
      </AnalyzeShell>
    );
  }

  notFound();
}

// ─── Shell (header + content slot) ────────────────────────────────────────────

function AnalyzeShell({
  id,
  designId,
  typeName,
  designName,
  showReportLinks,
  children,
}: {
  id: string;
  designId: string;
  typeName: string;
  designName: string | null;
  showReportLinks: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <Button variant="ghost" size="sm" asChild className="mb-1 -ml-2">
            <Link href={`/projects/${id}/designs/${designId}`}>← Back</Link>
          </Button>
          <h1 className="text-2xl font-semibold text-slate-800">Analysis — {typeName}</h1>
          {designName && <p className="text-slate-500 text-sm">{designName}</p>}
        </div>
        {showReportLinks && (
          <div className="flex items-center gap-3">
            <a
              href={`/api/projects/${id}/designs/${designId}/report?format=xlsx`}
              className="inline-flex items-center gap-1.5 rounded-md border border-input bg-background px-3 py-1.5 text-sm font-medium hover:bg-accent hover:text-accent-foreground"
            >
              <FileDown className="h-4 w-4" />
              Excel
            </a>
            <a
              href={`/api/projects/${id}/designs/${designId}/report?format=docx`}
              className="inline-flex items-center gap-1.5 rounded-md border border-input bg-background px-3 py-1.5 text-sm font-medium hover:bg-accent hover:text-accent-foreground"
            >
              <FileDown className="h-4 w-4" />
              Word
            </a>
          </div>
        )}
      </div>
      {children}
    </div>
  );
}

// ─── External Stability Results ───────────────────────────────────────────────

function ExternalResults({ rows }: { rows: AnalysisRow[] }) {
  return (
    <div>
      <SectionTitle>Summary of Loads</SectionTitle>
      <TableWrap>
        <thead className="bg-slate-50 text-xs text-slate-500 uppercase tracking-wider">
          <tr>
            <Th>DH (ft)</Th><Th>RL (ft)</Th><Th>h_eq</Th>
            <Th>P_LS.V</Th><Th>P_EV</Th><Th>M_LS.V</Th><Th>M_EV</Th>
            <Th>P_LS.H</Th><Th>P_EH</Th><Th>P_EQ</Th>
            <Th>M_LS.H</Th><Th>M_EH</Th><Th>M_EQ</Th>
          </tr>
        </thead>
        <tbody className="divide-y text-sm">
          {rows.map((r) => (
            <tr key={r.dh} className="hover:bg-slate-50">
              <Td>{N(r.dh, 2)}</Td><Td>{N(r.rl, 2)}</Td><Td>{N(r.hEq, 2)}</Td>
              <Td>{N(r.pLsV)}</Td><Td>{N(r.pEv)}</Td><Td>{N(r.mLsV)}</Td><Td>{N(r.mEv)}</Td>
              <Td>{N(r.pLsH)}</Td><Td>{N(r.pEh)}</Td><Td>{N(r.pEq)}</Td>
              <Td>{N(r.mLsH)}</Td><Td>{N(r.mEh)}</Td><Td>{N(r.mEq)}</Td>
            </tr>
          ))}
        </tbody>
      </TableWrap>

      <SectionTitle>Load Combinations</SectionTitle>
      <TableWrap>
        <thead className="bg-slate-50 text-xs text-slate-500 uppercase tracking-wider">
          <tr>
            <Th>DH</Th>
            <Th>Pu Ser-I V</Th><Th>Mu Ser-I V</Th>
            <Th>Pu Str-I V</Th><Th>Mu Str-I V</Th>
            <Th>Pu EE-I V</Th><Th>Mu EE-I V</Th>
            <Th>Pu Ser-I Lat</Th><Th>Mu Ser-I Lat</Th>
            <Th>Pu Str-I Lat</Th><Th>Mu Str-I Lat</Th>
            <Th>Pu EE-I Lat</Th><Th>Mu EE-I Lat</Th>
          </tr>
        </thead>
        <tbody className="divide-y text-sm">
          {rows.map((r) => (
            <tr key={r.dh} className="hover:bg-slate-50">
              <Td>{N(r.dh, 2)}</Td>
              <Td>{N(r.puSerIV)}</Td><Td>{N(r.muSerIV)}</Td>
              <Td>{N(r.puStrIV)}</Td><Td>{N(r.muStrIV)}</Td>
              <Td>{N(r.puEeIV)}</Td><Td>{N(r.muEeIV)}</Td>
              <Td>{N(r.puSerILat)}</Td><Td>{N(r.muSerILat)}</Td>
              <Td>{N(r.puStrILat)}</Td><Td>{N(r.muStrILat)}</Td>
              <Td>{N(r.puEeILat)}</Td><Td>{N(r.muEeILat)}</Td>
            </tr>
          ))}
        </tbody>
      </TableWrap>

      <SectionTitle>Design Check — Strength I</SectionTitle>
      <TableWrap>
        <thead className="bg-slate-50 text-xs text-slate-500 uppercase tracking-wider">
          <tr>
            <Th>DH</Th><Th>ecc Brg</Th><Th>Su Brg</Th><Th>Brg</Th>
            <Th>ecc Ovt</Th><Th>Ovt</Th>
            <Th>φRr Class 1</Th><Th>φRr F.Soil</Th>
            <Th>Sld Class 1</Th><Th>Sld F.Soil</Th>
          </tr>
        </thead>
        <tbody className="divide-y text-sm">
          {rows.map((r) => (
            <tr key={r.dh} className="hover:bg-slate-50">
              <Td>{N(r.dh, 2)}</Td>
              <Td>{N(r.eccBrgStrI)}</Td><Td>{N(r.suBrgStrI)}</Td>
              <td className="px-3 py-2"><span className={`px-2 py-0.5 rounded text-xs ${badgeClass(r.checkBrgStrI)}`}>{r.checkBrgStrI}</span></td>
              <Td>{N(r.eccOvtStrI)}</Td>
              <td className="px-3 py-2"><span className={`px-2 py-0.5 rounded text-xs ${badgeClass(r.checkOvtStrI)}`}>{r.checkOvtStrI}</span></td>
              <Td>{N(r.phiRrStrIClass1)}</Td><Td>{N(r.phiRrStrIFSoil)}</Td>
              <td className="px-3 py-2"><span className={`px-2 py-0.5 rounded text-xs ${badgeClass(r.checkSldStrIClass1)}`}>{r.checkSldStrIClass1}</span></td>
              <td className="px-3 py-2"><span className={`px-2 py-0.5 rounded text-xs ${badgeClass(r.checkSldStrIFSoil)}`}>{r.checkSldStrIFSoil}</span></td>
            </tr>
          ))}
        </tbody>
      </TableWrap>

      <SectionTitle>Design Check — Extreme Event I</SectionTitle>
      <TableWrap>
        <thead className="bg-slate-50 text-xs text-slate-500 uppercase tracking-wider">
          <tr>
            <Th>DH</Th><Th>ecc Brg</Th><Th>Su Brg</Th><Th>Brg</Th>
            <Th>ecc Ovt</Th><Th>Ovt</Th>
            <Th>φRr Class 1</Th><Th>φRr F.Soil</Th>
            <Th>Sld Class 1</Th><Th>Sld F.Soil</Th>
          </tr>
        </thead>
        <tbody className="divide-y text-sm">
          {rows.map((r) => (
            <tr key={r.dh} className="hover:bg-slate-50">
              <Td>{N(r.dh, 2)}</Td>
              <Td>{N(r.eccBrgEeI)}</Td><Td>{N(r.suBrgEeI)}</Td>
              <td className="px-3 py-2"><span className={`px-2 py-0.5 rounded text-xs ${badgeClass(r.checkBrgEeI)}`}>{r.checkBrgEeI}</span></td>
              <Td>{N(r.eccOvtEeI)}</Td>
              <td className="px-3 py-2"><span className={`px-2 py-0.5 rounded text-xs ${badgeClass(r.checkOvtEeI)}`}>{r.checkOvtEeI}</span></td>
              <Td>{N(r.phiRrEeIClass1)}</Td><Td>{N(r.phiRrEeIFSoil)}</Td>
              <td className="px-3 py-2"><span className={`px-2 py-0.5 rounded text-xs ${badgeClass(r.checkSldEeIClass1)}`}>{r.checkSldEeIClass1}</span></td>
              <td className="px-3 py-2"><span className={`px-2 py-0.5 rounded text-xs ${badgeClass(r.checkSldEeIFSoil)}`}>{r.checkSldEeIFSoil}</span></td>
            </tr>
          ))}
        </tbody>
      </TableWrap>

      <SectionTitle>Design Check — Service I</SectionTitle>
      <TableWrap>
        <thead className="bg-slate-50 text-xs text-slate-500 uppercase tracking-wider">
          <tr>
            <Th>DH</Th><Th>ecc Brg</Th><Th>Su Brg</Th><Th>Brg</Th>
          </tr>
        </thead>
        <tbody className="divide-y text-sm">
          {rows.map((r) => (
            <tr key={r.dh} className="hover:bg-slate-50">
              <Td>{N(r.dh, 2)}</Td>
              <Td>{N(r.eccBrgSerI)}</Td><Td>{N(r.suBrgSerI)}</Td>
              <td className="px-3 py-2"><span className={`px-2 py-0.5 rounded text-xs ${badgeClass(r.checkBrgSerI)}`}>{r.checkBrgSerI}</span></td>
            </tr>
          ))}
        </tbody>
      </TableWrap>

      <SectionTitle>Percentage Demand (%)</SectionTitle>
      <TableWrap>
        <thead className="bg-slate-50 text-xs text-slate-500 uppercase tracking-wider">
          <tr>
            <Th>DH</Th>
            <Th>Brg Str-I</Th><Th>Brg EE-I</Th><Th>Brg Ser-I</Th>
            <Th>Ovt Str-I</Th><Th>Ovt EE-I</Th>
            <Th>Sld Str-I</Th><Th>Sld EE-I</Th>
            <Th>Ctrl %</Th><Th>Controls</Th>
          </tr>
        </thead>
        <tbody className="divide-y text-sm">
          {rows.map((r) => (
            <tr key={r.dh} className="hover:bg-slate-50">
              <Td>{N(r.dh, 2)}</Td>
              <Td>{N(r.demBrgStrI, 1)}</Td><Td>{N(r.demBrgEeI, 1)}</Td><Td>{N(r.demBrgSerI, 1)}</Td>
              <Td>{N(r.demOvtStrI, 1)}</Td><Td>{N(r.demOvtEeI, 1)}</Td>
              <Td>{N(r.demSldStrI, 1)}</Td><Td>{N(r.demSldEeI, 1)}</Td>
              <Td><span className={r.demCtrl > 100 ? 'text-red-600 font-semibold' : 'text-green-700 font-semibold'}>{N(r.demCtrl, 1)}</span></Td>
              <td className="px-3 py-2 text-xs text-slate-500 max-w-[160px] truncate">{r.limitState}</td>
            </tr>
          ))}
        </tbody>
      </TableWrap>

      <SectionTitle>Demand Summary</SectionTitle>
      <TableWrap>
        <thead className="bg-slate-50 text-xs text-slate-500 uppercase tracking-wider">
          <tr>
            <Th>DH (ft)</Th><Th>RL (ft)</Th><Th>NL</Th>
            <Th>Ctrl % Demand</Th><Th>Controlling Limit State</Th>
          </tr>
        </thead>
        <tbody className="divide-y text-sm">
          {rows.map((r) => (
            <tr key={r.dh} className="hover:bg-slate-50">
              <Td>{N(r.dh, 2)}</Td>
              <Td>{N(r.rl, 2)}</Td>
              <Td>{r.nl}</Td>
              <Td><span className={r.demCtrl > 100 ? 'text-red-600 font-semibold' : 'text-green-700 font-semibold'}>{N(r.demCtrl, 1)}</span></Td>
              <td className="px-3 py-2 text-xs text-slate-600">{r.limitState}</td>
            </tr>
          ))}
        </tbody>
      </TableWrap>
    </div>
  );
}

// ─── Internal Stability Results ───────────────────────────────────────────────

function InternalResults({ rows }: { rows: InternalStabilityRow[] }) {
  return (
    <div>
      <SectionTitle>Stress / Load Determination at Reinforcement Level</SectionTitle>
      <TableWrap>
        <thead className="bg-slate-50 text-xs text-slate-500 uppercase tracking-wider">
          <tr>
            <Th>DH (ft)</Th><Th>RL (ft)</Th><Th>z (ft)</Th>
            <Th>σEV.Z (ksf)</Th><Th>h_eq (ft)</Th><Th>σLS.Z (ksf)</Th>
            <Th>ωIR (kip/ft)</Th><Th>ωAE (kip/ft)</Th><Th>ωEQ.1</Th><Th>ωEQ.2</Th><Th>PEQ</Th><Th>σEQ</Th>
          </tr>
        </thead>
        <tbody className="divide-y text-sm">
          {rows.map((r) => (
            <tr key={r.dh} className="hover:bg-slate-50">
              <Td>{N(r.dh, 2)}</Td><Td>{N(r.rl, 2)}</Td><Td>{N(r.z, 2)}</Td>
              <Td>{N(r.sEvZ)}</Td><Td>{N(r.hEq, 1)}</Td><Td>{N(r.sLsZ)}</Td>
              <Td>{N(r.wIr, 3)}</Td><Td>{N(r.wAe, 3)}</Td><Td>{N(r.wEq1, 3)}</Td><Td>{N(r.wEq2, 3)}</Td><Td>{N(r.pEq, 3)}</Td><Td>{N(r.sEq, 3)}</Td>
            </tr>
          ))}
        </tbody>
      </TableWrap>

      <SectionTitle>Geosynthetic Strip</SectionTitle>
      <TableWrap>
        <thead className="bg-slate-50 text-xs text-slate-500 uppercase tracking-wider">
          <tr>
            <Th>z (ft)</Th>
            <Th>σV Str-I (ksf)</Th><Th>σH Str-I (ksf)</Th><Th>σV EE-I (ksf)</Th><Th>σH EE-I (ksf)</Th>
            <Th>Tmax Str-I (kip/ft)</Th><Th>Tmax EE-I (kip/ft)</Th>
            <Th>lE Str-I (ft)</Th><Th>lE EE-I (ft)</Th><Th>lE (ft)</Th><Th>lA (ft)</Th><Th>RL min (ft)</Th>
            <Th>LTDS (lb/ft)</Th><Th>PO Check</Th>
          </tr>
        </thead>
        <tbody className="divide-y text-sm">
          {rows.map((r) => (
            <tr key={r.dh} className="hover:bg-slate-50">
              <Td>{N(r.z, 2)}</Td>
              <Td>{N(r.sVStrI)}</Td><Td>{N(r.sHStrI)}</Td><Td>{N(r.sVEeI)}</Td><Td>{N(r.sHEeI)}</Td>
              <Td>{N(r.tMaxStrIGstrip)}</Td><Td>{N(r.tMaxEeIGstrip)}</Td>
              <Td>{N(r.lEStrIGs, 3)}</Td><Td>{N(r.lEEeIGs, 3)}</Td><Td>{N(r.lEGeostrip, 3)}</Td><Td>{N(r.lAGs, 3)}</Td><Td>{N(r.rlMinGeostrip, 3)}</Td>
              <Td>{N(r.ltdsGeostrip, 0)}</Td>
              <td className="px-3 py-2"><CheckBadge v={r.poGeostripCheck} /></td>
            </tr>
          ))}
        </tbody>
      </TableWrap>

      <SectionTitle>Geosynthetic Grid</SectionTitle>
      <TableWrap>
        <thead className="bg-slate-50 text-xs text-slate-500 uppercase tracking-wider">
          <tr>
            <Th>z (ft)</Th>
            <Th>σV Str-I (ksf)</Th><Th>σH Str-I (ksf)</Th><Th>σV EE-I (ksf)</Th><Th>σH EE-I (ksf)</Th>
            <Th>Tmax Str-I (kip/ft)</Th><Th>Tmax EE-I (kip/ft)</Th>
            <Th>lE Str-I (ft)</Th><Th>lE EE-I (ft)</Th><Th>lE (ft)</Th><Th>lA (ft)</Th><Th>RL min (ft)</Th>
            <Th>LTDS (lb/ft)</Th><Th>PO Check</Th>
          </tr>
        </thead>
        <tbody className="divide-y text-sm">
          {rows.map((r) => (
            <tr key={r.dh} className="hover:bg-slate-50">
              <Td>{N(r.z, 2)}</Td>
              <Td>{N(r.sVStrI)}</Td><Td>{N(r.sHStrI)}</Td><Td>{N(r.sVEeI)}</Td><Td>{N(r.sHEeI)}</Td>
              <Td>{N(r.tMaxStrIGgrid)}</Td><Td>{N(r.tMaxEeIGgrid)}</Td>
              <Td>{N(r.lEStrIGg, 3)}</Td><Td>{N(r.lEEeIGg, 3)}</Td><Td>{N(r.lEGeogrid, 3)}</Td><Td>{N(r.lAGg, 3)}</Td><Td>{N(r.rlMinGeogrid, 3)}</Td>
              <Td>{N(r.ltdsGeogrid, 0)}</Td>
              <td className="px-3 py-2"><CheckBadge v={r.poGeogridCheck} /></td>
            </tr>
          ))}
        </tbody>
      </TableWrap>

      <SectionTitle>Metal Grid</SectionTitle>
      <TableWrap>
        <thead className="bg-slate-50 text-xs text-slate-500 uppercase tracking-wider">
          <tr>
            <Th>z (ft)</Th><Th>F&apos;</Th><Th>kR.SteelGrid</Th>
            <Th>σV Str-I (ksf)</Th><Th>σH Str-I (ksf)</Th><Th>σV EE-I (ksf)</Th><Th>σH EE-I (ksf)</Th>
            <Th>Tmax Str-I (kip/ft)</Th><Th>Tmax EE-I (kip/ft)</Th>
            <Th>lE Str-I (ft)</Th><Th>lE EE-I (ft)</Th><Th>lE (ft)</Th><Th>lA (ft)</Th><Th>RL min (ft)</Th>
            <Th>LTDS (lb/ft)</Th><Th>PO Check</Th>
          </tr>
        </thead>
        <tbody className="divide-y text-sm">
          {rows.map((r) => (
            <tr key={r.dh} className="hover:bg-slate-50">
              <Td>{N(r.z, 2)}</Td><Td>{N(r.fpMg)}</Td><Td>{N(r.krSg)}</Td>
              <Td>{N(r.sVStrIMg)}</Td><Td>{N(r.sHStrIMg)}</Td><Td>{N(r.sVEeIMg)}</Td><Td>{N(r.sHEeIMg)}</Td>
              <Td>{N(r.tMaxStrISg)}</Td><Td>{N(r.tMaxEeISg)}</Td>
              <Td>{N(r.lEStrIMg, 3)}</Td><Td>{N(r.lEEeIMg, 3)}</Td><Td>{N(r.lESg, 3)}</Td><Td>{N(r.lASg, 2)}</Td><Td>{N(r.rlMinSg, 3)}</Td>
              <Td>{N(r.ltdsSg, 0)}</Td>
              <td className="px-3 py-2"><CheckBadge v={r.poSgCheck} /></td>
            </tr>
          ))}
        </tbody>
      </TableWrap>

      <SectionTitle>Ribbed Metallic Strip</SectionTitle>
      <TableWrap>
        <thead className="bg-slate-50 text-xs text-slate-500 uppercase tracking-wider">
          <tr>
            <Th>z (ft)</Th><Th>F&apos;</Th><Th>kR.SteelStrip</Th>
            <Th>σV Str-I (ksf)</Th><Th>σH Str-I (ksf)</Th><Th>σV EE-I (ksf)</Th><Th>σH EE-I (ksf)</Th>
            <Th>Tmax Str-I (kip/ft)</Th><Th>Tmax EE-I (kip/ft)</Th>
            <Th>lE Str-I (ft)</Th><Th>lE EE-I (ft)</Th><Th>lE (ft)</Th><Th>lA (ft)</Th><Th>RL min (ft)</Th>
            <Th>LTDS (lb/ft)</Th><Th>PO Check</Th>
          </tr>
        </thead>
        <tbody className="divide-y text-sm">
          {rows.map((r) => (
            <tr key={r.dh} className="hover:bg-slate-50">
              <Td>{N(r.z, 2)}</Td><Td>{N(r.fpSs)}</Td><Td>{N(r.krSs)}</Td>
              <Td>{N(r.sVStrISs)}</Td><Td>{N(r.sHStrISs)}</Td><Td>{N(r.sVEeISs)}</Td><Td>{N(r.sHEeISs)}</Td>
              <Td>{N(r.tMaxStrISs)}</Td><Td>{N(r.tMaxEeISs)}</Td>
              <Td>{N(r.lEStrISs, 3)}</Td><Td>{N(r.lEEeISs, 3)}</Td><Td>{N(r.lESs, 3)}</Td><Td>{N(r.lASs, 2)}</Td><Td>{N(r.rlMinSs, 3)}</Td>
              <Td>{N(r.ltdsSs, 0)}</Td>
              <td className="px-3 py-2"><CheckBadge v={r.poSsCheck} /></td>
            </tr>
          ))}
        </tbody>
      </TableWrap>

      <SectionTitle>Required Factored Long Term Design Strength, LTDS (lb/ft)</SectionTitle>
      <TableWrap>
        <thead className="bg-slate-50 text-xs text-slate-500 uppercase tracking-wider">
          <tr>
            <th className="px-3 py-2 text-left font-medium" rowSpan={2}>z (ft)</th>
            <th className="px-3 py-2 text-center font-medium border-l" colSpan={4}>Strength I</th>
            <th className="px-3 py-2 text-center font-medium border-l" colSpan={4}>Extreme Event I</th>
          </tr>
          <tr>
            <Th>Geosynthetic Strip</Th><Th>Geosynthetic Grid</Th><Th>Metallic Grid</Th><Th>Metallic Strip</Th>
            <Th>Geosynthetic Strip</Th><Th>Geosynthetic Grid</Th><Th>Metallic Grid</Th><Th>Metallic Strip</Th>
          </tr>
        </thead>
        <tbody className="divide-y text-sm">
          {rows.map((r) => (
            <tr key={r.dh} className="hover:bg-slate-50">
              <Td>{N(r.z, 2)}</Td>
              <Td>{N(r.ltdsGeostrip, 0)}</Td><Td>{N(r.ltdsGeogrid, 0)}</Td><Td>{N(r.ltdsSg, 0)}</Td><Td>{N(r.ltdsSs, 0)}</Td>
              <Td>{N(r.ltdsEeIGs, 0)}</Td><Td>{N(r.ltdsEeIGg, 0)}</Td><Td>{N(r.ltdsEeISg, 0)}</Td><Td>{N(r.ltdsEeISs, 0)}</Td>
            </tr>
          ))}
        </tbody>
      </TableWrap>

      <SectionTitle>Internal Stability — LTDS Chart</SectionTitle>
      <div className="rounded-xl border bg-card p-4 mb-4">
        <InternalStabilityChart
          zValues={rows.map((r) => r.z)}
          dhValues={rows.map((r) => r.dh)}
          ltdsGeostrip={rows.map((r) => r.ltdsGeostrip)}
          ltdsGeogrid={rows.map((r) => r.ltdsGeogrid)}
          ltdsSg={rows.map((r) => r.ltdsSg)}
          ltdsSs={rows.map((r) => r.ltdsSs)}
        />
      </div>
    </div>
  );
}

// ─── Panel Face Results (unchanged behavior) ──────────────────────────────────

function PanelFaceResults({
  result: r,
  inputs,
}: {
  result: PanelFaceResult;
  inputs: {
    barNumVert: number; spacingVert: number;
    barNumHor: number; spacingHor: number;
    huStr: number; huEe: number;
  };
}) {
  const MMin_pos_raw = Math.min(1.33 * r.MU_pos, 1.6 * 0.67 * r.Mcr);
  const MMin_neg_raw = Math.min(1.33 * r.MU_neg, 1.6 * 0.67 * r.Mcr);

  return (
    <div>
      <SectionTitle>Factored Load on Panel</SectionTitle>
      <TableWrap>
        <thead className="bg-slate-50 text-xs text-slate-500 uppercase tracking-wider">
          <tr>
            <Th>HU.Str.Panel (kip/ft)</Th>
            <Th>HU.EE.Panel (kip/ft)</Th>
            <Th>HU.Panel (kip/ft)</Th>
            <Th>MU.Panel.+ve (kip·ft)</Th>
            <Th>MU.Panel.-ve (kip·ft)</Th>
            <Th>VU.Panel (kip)</Th>
          </tr>
        </thead>
        <tbody className="divide-y text-sm">
          <tr className="hover:bg-slate-50">
            <Td>{N(inputs.huStr)}</Td>
            <Td>{N(inputs.huEe)}</Td>
            <Td>{N(r.HU_panel)}</Td>
            <Td>{N(r.MU_pos)}</Td>
            <Td>{N(r.MU_neg)}</Td>
            <Td>{N(r.VU_panel)}</Td>
          </tr>
        </tbody>
      </TableWrap>

      <SectionTitle>Concrete Cracking Moment</SectionTitle>
      <TableWrap>
        <thead className="bg-slate-50 text-xs text-slate-500 uppercase tracking-wider">
          <tr>
            <Th>fRupture (ksi)</Th>
            <Th>SPanel (in³)</Th>
            <Th>MCR (kip·ft)</Th>
          </tr>
        </thead>
        <tbody className="divide-y text-sm">
          <tr className="hover:bg-slate-50">
            <Td>{N(r.fr)}</Td>
            <Td>{N(r.St, 2)}</Td>
            <Td>{N(r.Mcr)}</Td>
          </tr>
        </tbody>
      </TableWrap>

      <SectionTitle>Minimum Applied Moment &amp; Factored Ultimate Moment</SectionTitle>
      <TableWrap>
        <thead className="bg-slate-50 text-xs text-slate-500 uppercase tracking-wider">
          <tr>
            <Th>MMin.Pos (kip·ft)</Th>
            <Th>MMin.Neg (kip·ft)</Th>
            <Th>MU.Panel.+ve governing (kip·ft)</Th>
            <Th>MU.Panel.-ve governing (kip·ft)</Th>
            <Th>VU.Panel (kip)</Th>
          </tr>
        </thead>
        <tbody className="divide-y text-sm">
          <tr className="hover:bg-slate-50">
            <Td>{N(MMin_pos_raw)}</Td>
            <Td>{N(MMin_neg_raw)}</Td>
            <Td>{N(r.MMin_pos)}</Td>
            <Td>{N(r.MMin_neg)}</Td>
            <Td>{N(r.VU_panel)}</Td>
          </tr>
        </tbody>
      </TableWrap>

      <SectionTitle>Horizontal Positive Flexural Capacity</SectionTitle>
      <FlexureTable
        beta1={r.beta1} alpha1={r.alpha1}
        C={r.C_HorPos} a={r.a_HorPos} et={r.et_HorPos} phi={r.phi_f_HorPos}
        MN={r.MN_pos_Hor} phiMN={r.phiMN_pos_Hor} MU={r.MMin_pos}
        check={r.check_HorPos_flex}
        barNum={inputs.barNumHor} spacing={inputs.spacingHor}
      />

      <SectionTitle>Vertical Positive Flexural Capacity</SectionTitle>
      <FlexureTable
        beta1={r.beta1} alpha1={r.alpha1}
        C={r.C_VertPos} a={r.a_VertPos} et={r.et_VertPos} phi={r.phi_f_VertPos}
        MN={r.MN_pos_Vert} phiMN={r.phiMN_pos_Vert} MU={r.MMin_pos}
        check={r.check_VertPos_flex}
        barNum={inputs.barNumVert} spacing={inputs.spacingVert}
      />

      <SectionTitle>Horizontal Negative Flexural Capacity</SectionTitle>
      <FlexureTable
        beta1={r.beta1} alpha1={r.alpha1}
        C={r.C_HorNeg} a={r.a_HorNeg} et={r.et_HorNeg} phi={r.phi_f_HorNeg}
        MN={r.MN_neg_Hor} phiMN={r.phiMN_neg_Hor} MU={r.MMin_neg}
        check={r.check_HorNeg_flex}
        barNum={inputs.barNumHor} spacing={inputs.spacingHor}
      />

      <SectionTitle>Vertical Negative Flexural Capacity</SectionTitle>
      <FlexureTable
        beta1={r.beta1} alpha1={r.alpha1}
        C={r.C_VertNeg} a={r.a_VertNeg} et={r.et_VertNeg} phi={r.phi_f_VertNeg}
        MN={r.MN_neg_Vert} phiMN={r.phiMN_neg_Vert} MU={r.MMin_neg}
        check={r.check_VertNeg_flex}
        barNum={inputs.barNumVert} spacing={inputs.spacingVert}
      />

      <SectionTitle>Service I: Service Crack Control — Horizontal Reinforcement</SectionTitle>
      <TableWrap>
        <thead className="bg-slate-50 text-xs text-slate-500 uppercase tracking-wider">
          <tr>
            <Th>SB.Hor (in)</Th>
            <Th>γEV.Str.I</Th>
            <Th>a (in)</Th>
            <Th>γe</Th>
            <Th>fSS (ksi)</Th>
            <Th>dC (in)</Th>
            <Th>βS</Th>
            <Th>sMax.Crack (in)</Th>
            <Th>Check</Th>
          </tr>
        </thead>
        <tbody className="divide-y text-sm">
          <tr className="hover:bg-slate-50">
            <Td>{N(inputs.spacingHor, 3)}</Td>
            <Td>1.35</Td>
            <Td>{N(r.a_HorPos)}</Td>
            <Td>1.0</Td>
            <Td>{N(r.fs_Hor)}</Td>
            <Td>{N(r.dc_Hor)}</Td>
            <Td>{N(r.Vs_Hor)}</Td>
            <Td>{N(r.Smax_Hor)}</Td>
            <td className="px-3 py-2"><CheckBadge v={r.check_crack_Hor} /></td>
          </tr>
        </tbody>
      </TableWrap>

      <SectionTitle>Service I: Service Crack Control — Vertical Reinforcement</SectionTitle>
      <TableWrap>
        <thead className="bg-slate-50 text-xs text-slate-500 uppercase tracking-wider">
          <tr>
            <Th>SB.Vert (in)</Th>
            <Th>γEV.Str.I</Th>
            <Th>a (in)</Th>
            <Th>γe</Th>
            <Th>fSS (ksi)</Th>
            <Th>dC (in)</Th>
            <Th>βS</Th>
            <Th>sMax.Crack (in)</Th>
            <Th>Check</Th>
          </tr>
        </thead>
        <tbody className="divide-y text-sm">
          <tr className="hover:bg-slate-50">
            <Td>{N(inputs.spacingVert, 3)}</Td>
            <Td>1.35</Td>
            <Td>{N(r.a_VertPos)}</Td>
            <Td>1.0</Td>
            <Td>{N(r.fs_Vert)}</Td>
            <Td>{N(r.dc_Vert)}</Td>
            <Td>{N(r.Vs_Vert)}</Td>
            <Td>{N(r.Smax_Vert)}</Td>
            <td className="px-3 py-2"><CheckBadge v={r.check_crack_Vert} /></td>
          </tr>
        </tbody>
      </TableWrap>

      <SectionTitle>Strength I: Shear Capacity</SectionTitle>
      <TableWrap>
        <thead className="bg-slate-50 text-xs text-slate-500 uppercase tracking-wider">
          <tr>
            <Th>VU.Panel (kip)</Th>
            <Th>φV</Th>
            <Th>β</Th>
            <Th>VN.1 (kip)</Th>
            <Th>VN.2 (kip)</Th>
            <Th>VN.Panel (kip)</Th>
            <Th>φVN.Panel (kip)</Th>
            <Th>φVN / VU</Th>
            <Th>Check</Th>
          </tr>
        </thead>
        <tbody className="divide-y text-sm">
          <tr className="hover:bg-slate-50">
            <Td>{N(r.VU_panel)}</Td>
            <Td>0.9</Td>
            <Td>2</Td>
            <Td>{N(r.Vc)}</Td>
            <Td>{N(r.Vc_max)}</Td>
            <Td>{N(Math.min(r.Vc, r.Vc_max))}</Td>
            <Td>{N(r.phiVc)}</Td>
            <Td>{N(r.phiVc / r.VU_panel)}</Td>
            <td className="px-3 py-2"><CheckBadge v={r.check_shear} /></td>
          </tr>
        </tbody>
      </TableWrap>
    </div>
  );
}

// ─── Shared helpers ───────────────────────────────────────────────────────────

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="text-base font-semibold text-slate-700 mt-6 mb-2">{children}</h2>;
}

function TableWrap({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-xl border bg-card overflow-x-auto mb-4">
      <table className="w-full text-sm whitespace-nowrap">{children}</table>
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return <th className="px-3 py-2 text-left font-medium">{children}</th>;
}

function Td({ children }: { children: React.ReactNode }) {
  return <td className="px-3 py-2 text-slate-600">{children}</td>;
}

function CheckBadge({ v }: { v: string }) {
  const ok = v === 'Adequate';
  return (
    <span className={`px-2 py-0.5 rounded text-xs ${ok ? 'bg-green-100 text-green-700 border border-green-200' : 'bg-red-100 text-red-700 border border-red-200'}`}>
      {v}
    </span>
  );
}

function FlexureTable({
  beta1, alpha1, C, a, et, phi, MN, phiMN, MU, check, barNum, spacing,
}: {
  beta1: number; alpha1: number;
  C: number; a: number; et: number; phi: number;
  MN: number; phiMN: number; MU: number;
  check: string; barNum: number; spacing: number;
}) {
  return (
    <TableWrap>
      <thead className="bg-slate-50 text-xs text-slate-500 uppercase tracking-wider">
        <tr>
          <Th>β1</Th>
          <Th>α1</Th>
          <Th>c (in)</Th>
          <Th>a (in)</Th>
          <Th>εt</Th>
          <Th>φf</Th>
          <Th>MN (kip·ft)</Th>
          <Th>φMN (kip·ft)</Th>
          <Th>MU.Panel (kip·ft)</Th>
          <Th>φMN / MU</Th>
          <Th>Check</Th>
        </tr>
      </thead>
      <tbody className="divide-y text-sm">
        <tr className="hover:bg-slate-50">
          <Td>{N(beta1)}</Td>
          <Td>{N(alpha1)}</Td>
          <Td>{N(C)}</Td>
          <Td>{N(a)}</Td>
          <Td>{N(et, 5)}</Td>
          <Td>{N(phi)}</Td>
          <Td>{N(MN)}</Td>
          <Td>{N(phiMN)}</Td>
          <Td>{N(MU)}</Td>
          <Td>{N(phiMN / MU, 3)}</Td>
          <td className="px-3 py-2">
            <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs ${check === 'Adequate' ? 'bg-green-100 text-green-700 border border-green-200' : 'bg-red-100 text-red-700 border border-red-200'}`}>
              # {barNum} @ {spacing} in — {check}
            </span>
          </td>
        </tr>
      </tbody>
    </TableWrap>
  );
}
