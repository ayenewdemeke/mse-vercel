import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { getDesignWithData } from '@/app/actions/design-inputs';
import { getProject } from '@/app/actions/projects';
import {
  analyzeAbutmentExternal,
  analyzeWingExternalLl,
  analyzeWingExternalNoLl,
  type ExternalStabilityParams,
} from '@/lib/calculations/external-stability';
import { generateDocx, generateXlsx, type ReportData } from '@/lib/reports/external-stability-report';
import {
  analyzeAbutmentInternal,
  analyzeWingInternal,
} from '@/lib/calculations/internal-stability';
import {
  generateDocx as generateInternalDocx,
  generateXlsx as generateInternalXlsx,
  type InternalReportData,
} from '@/lib/reports/internal-stability-report';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; designId: string }> },
) {
  const { id, designId } = await params;
  const session = await auth();
  if (!session?.user?.id) return new NextResponse('Unauthorized', { status: 401 });

  const format = req.nextUrl.searchParams.get('format') ?? 'xlsx';
  const part = req.nextUrl.searchParams.get('part') ?? '';
  const minRl = parseFloat(req.nextUrl.searchParams.get('minRl') ?? '8');
  const safeMinRl = isNaN(minRl) ? 8 : minRl;

  const [design, project] = await Promise.all([getDesignWithData(designId, id), getProject(id)]);
  if (!design || !project) return new NextResponse('Not found', { status: 404 });

  const typeKey = design.designType.key;
  const safeName = `${project.name.replace(/[^a-z0-9]/gi, '_')}_${typeKey}${part ? '_' + part : ''}`;

  const respondXlsx = async (buf: ArrayBuffer | Buffer) =>
    new NextResponse(new Uint8Array(buf), {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${safeName}.xlsx"`,
      },
    });
  const respondDocx = async (buf: ArrayBuffer | Buffer) =>
    new NextResponse(new Uint8Array(buf), {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="${safeName}.docx"`,
      },
    });

  // ─── Abutment ───────────────────────────────────────────────────────────────
  if (typeKey === 'abutment' && design.abutmentDesign) {
    const d = design.abutmentDesign;
    const partResolved = part || 'external';

    if (partResolved === 'external') {
      const p: ExternalStabilityParams = {
        yev: d.yev, ylsV: d.ylsV, bstemBatter: d.bstemBatter, bI: d.bI,
        sigmaBrg: d.sigmaBrg, deltaS: d.deltaS, gRFill: d.gRFill,
        phiRFill: d.phiRFill, phiFSoil: d.phiFSoil, pga: d.pga,
        fPgaEq: d.fPgaEq, kV: d.kV,
        minDesignHeight: d.minDesignHeight, maxDesignHeight: d.maxDesignHeight,
        sV: d.sV, minRl: safeMinRl,
      };
      const reportData: ReportData = {
        projectName: project.name, projectLocation: project.location,
        designTypeName: `${design.designType.name} — External Stability`,
        createdBy: design.creator.name,
        generatedAt: new Date(), minRl: safeMinRl,
        params: {
          'YEV': String(d.yev), 'YLS.V': String(d.ylsV),
          'βstem-Batter (deg)': String(d.bstemBatter), 'β(i) (deg)': String(d.bI),
          'σ_brg (ksf)': String(d.sigmaBrg), 'δs': String(d.deltaS),
          'γr.fill (pcf)': String(d.gRFill), 'φr.fill (deg)': String(d.phiRFill),
          'φF.soil (deg)': String(d.phiFSoil),
          'PGA': String(d.pga), 'F_PGA.EQ': String(d.fPgaEq), 'K_V': String(d.kV),
          'Min Height (ft)': String(d.minDesignHeight), 'Max Height (ft)': String(d.maxDesignHeight),
          'Sv (ft)': String(d.sV), 'Min RL (ft)': String(safeMinRl),
        },
        rows: analyzeAbutmentExternal(p),
      };
      return format === 'docx'
        ? respondDocx(await generateDocx(reportData))
        : respondXlsx(await generateXlsx(reportData));
    }

    if (partResolved === 'internal') {
      const reportData: InternalReportData = {
        projectName: project.name, projectLocation: project.location,
        designTypeName: `${design.designType.name} — Internal Stability`,
        createdBy: design.creator.name,
        generatedAt: new Date(), minRl: safeMinRl,
        params: {
          'βstem-Batter (deg)': String(d.bstemBatter), 'β(i) (deg)': String(d.bI),
          'δs': String(d.deltaS), 'γr.fill (pcf)': String(d.gRFill), 'φr.fill (deg)': String(d.phiRFill),
          'PGA': String(d.pga), 'F_PGA.EQ': String(d.fPgaEq), 'K_V': String(d.kV),
          'φ/φo.Gs': String(d.phiPoGs), 'α.Gs': String(d.alphaGs), 'Rc.Gs': String(d.rcGs), 'c': String(d.c),
          'φ/φo.Gg': String(d.phiPoGg), 'φ/φo.Gg.EE': String(d.phiPoGgEe), 'α.Gg': String(d.alphaGg), 'Rc.Gg': String(d.rcGg),
          'y': String(d.y), 'Max Dh': String(d.maxDh), 'a': String(d.a),
          't.st': String(d.tSt), 'St.Sg': String(d.stSg), 'φ/φo.Sg': String(d.phiPoSg), 'α.Sg': String(d.alphaSg), 'Rc.Sg': String(d.rcSg),
          'b.Ss': String(d.bSs), 'φ/φo.Ss': String(d.phiPoSs), 'f2': String(d.f2), 'α.Ss': String(d.alphaSs), 'Sh': String(d.sh),
          'Min Height (ft)': String(d.minDesignHeight), 'Max Height (ft)': String(d.maxDesignHeight),
          'Sv (ft)': String(d.sV), 'Min RL (ft)': String(safeMinRl),
        },
        rows: analyzeAbutmentInternal({ ...d, minRl: safeMinRl }),
      };
      return format === 'docx'
        ? respondDocx(await generateInternalDocx(reportData))
        : respondXlsx(await generateInternalXlsx(reportData));
    }

    return new NextResponse(`Unknown part for abutment: ${partResolved}`, { status: 400 });
  }

  // ─── Wing ───────────────────────────────────────────────────────────────────
  if (typeKey === 'wing' && design.wingDesign) {
    const d = design.wingDesign;
    const partResolved = part || 'external-ll';

    if (partResolved === 'external-ll' || partResolved === 'external-no-ll') {
      const p: ExternalStabilityParams = {
        yev: d.yev, ylsV: d.ylsV, bstemBatter: d.bstemBatter, theta: d.theta, bI: d.bI,
        sigmaBrg: d.sigmaBrg, deltaS: d.deltaS, gRFill: d.gRFill,
        phiRFill: d.phiRFill, phiFSoil: d.phiFSoil, pga: d.pga,
        fPgaEq: d.fPgaEq, kV: d.kV,
        minDesignHeight: d.minDesignHeight, maxDesignHeight: d.maxDesignHeight,
        sV: d.sV, minRl: safeMinRl,
      };
      const rows = partResolved === 'external-ll'
        ? analyzeWingExternalLl(p)
        : analyzeWingExternalNoLl(p);
      const reportData: ReportData = {
        projectName: project.name, projectLocation: project.location,
        designTypeName: `${design.designType.name} — External Stability (${partResolved === 'external-ll' ? 'with LL' : 'without LL'})`,
        createdBy: design.creator.name,
        generatedAt: new Date(), minRl: safeMinRl,
        params: {
          'YEV': String(d.yev), 'YLS.V': String(d.ylsV),
          'βstem-Batter (deg)': String(d.bstemBatter), 'θ (deg)': String(d.theta),
          'β(i) (deg)': String(d.bI), 'σ_brg (ksf)': String(d.sigmaBrg),
          'δs': String(d.deltaS), 'γr.fill (pcf)': String(d.gRFill),
          'φr.fill (deg)': String(d.phiRFill), 'φF.soil (deg)': String(d.phiFSoil),
          'PGA': String(d.pga), 'F_PGA.EQ': String(d.fPgaEq), 'K_V': String(d.kV),
          'Min Height (ft)': String(d.minDesignHeight), 'Max Height (ft)': String(d.maxDesignHeight),
          'Sv (ft)': String(d.sV), 'Min RL (ft)': String(safeMinRl),
        },
        rows,
      };
      return format === 'docx'
        ? respondDocx(await generateDocx(reportData))
        : respondXlsx(await generateXlsx(reportData));
    }

    if (partResolved === 'internal') {
      const reportData: InternalReportData = {
        projectName: project.name, projectLocation: project.location,
        designTypeName: `${design.designType.name} — Internal Stability`,
        createdBy: design.creator.name,
        generatedAt: new Date(), minRl: safeMinRl,
        params: {
          'βstem-Batter (deg)': String(d.bstemBatter), 'β(i) (deg)': String(d.bI),
          'δs': String(d.deltaS), 'γr.fill (pcf)': String(d.gRFill), 'φr.fill (deg)': String(d.phiRFill),
          'PGA': String(d.pga), 'F_PGA.EQ': String(d.fPgaEq), 'K_V': String(d.kV),
          'φ/φo.Gs': String(d.phiPoGs), 'α.Gs': String(d.alphaGs), 'Rc.Gs': String(d.rcGs),
          'G.strip': String(d.gStrip), 'c': String(d.c),
          'φ/φo.Gg': String(d.phiPoGg), 'φ/φo.Gg.EE': String(d.phiPoGgEe), 'α.Gg': String(d.alphaGg), 'Rc.Gg': String(d.rcGg),
          'y': String(d.y), 'a': String(d.a), 'Max Dh': String(d.maxDh),
          't.st': String(d.tSt), 'St.Sg': String(d.stSg), 'φ/φo.Sg': String(d.phiPoSg), 'α.Sg': String(d.alphaSg), 'Rc.Sg': String(d.rcSg),
          'b.Ss': String(d.bSs), 'φ/φo.Ss': String(d.phiPoSs), 'α.Ss': String(d.alphaSs), 'Sh': String(d.sh),
          'D60': String(d.d60), 'D10': String(d.d10),
          'Min Height (ft)': String(d.minDesignHeight), 'Max Height (ft)': String(d.maxDesignHeight),
          'Sv (ft)': String(d.sV), 'Min RL (ft)': String(safeMinRl),
        },
        rows: analyzeWingInternal({ ...d, minRl: safeMinRl }),
      };
      return format === 'docx'
        ? respondDocx(await generateInternalDocx(reportData))
        : respondXlsx(await generateInternalXlsx(reportData));
    }

    return new NextResponse(`Unknown part for wing: ${partResolved}`, { status: 400 });
  }

  // ─── Panel face (no dedicated single-design report generator exists yet) ────
  if (typeKey === 'panel_face') {
    return new NextResponse('Single-design report not yet available for panel face. Use the project-level report.', { status: 400 });
  }

  return new NextResponse('Report not available for this design type', { status: 400 });
}
