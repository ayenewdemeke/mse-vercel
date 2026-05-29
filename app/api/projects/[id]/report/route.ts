import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { db } from '@/lib/db';
import {
  analyzeAbutmentExternal,
  analyzeWingExternalLl,
  analyzeWingExternalNoLl,
  type ExternalStabilityParams,
} from '@/lib/calculations/external-stability';
import {
  analyzeAbutmentInternal,
  analyzeWingInternal,
} from '@/lib/calculations/internal-stability';
import { analyzePanelFace } from '@/lib/calculations/panel-face';
import {
  generateProjectDocx,
  generateProjectPdf,
  type DesignSection,
  type ProjectReportData,
} from '@/lib/reports/project-report';

const DEFAULT_MIN_RL = 8;

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.id) return new NextResponse('Unauthorized', { status: 401 });

  const format = req.nextUrl.searchParams.get('format') ?? 'docx';
  const minRl = parseFloat(req.nextUrl.searchParams.get('minRl') ?? String(DEFAULT_MIN_RL));
  const safeMinRl = isNaN(minRl) ? DEFAULT_MIN_RL : minRl;

  // Auth check — must be project owner or member
  const project = await db.project.findUnique({
    where: { id },
    include: { owner: { select: { id: true, name: true } } },
  });
  if (!project) return new NextResponse('Not found', { status: 404 });

  const userId = session.user.id;
  const isOwner = project.userId === userId;
  if (!isOwner) {
    const member = await db.member.findFirst({ where: { projectId: id, userId } });
    if (!member) return new NextResponse('Forbidden', { status: 403 });
  }

  // Fetch all designs with their associated data
  const designs = await db.design.findMany({
    where: { projectId: id },
    include: {
      creator: { select: { id: true, name: true } },
      designType: true,
      abutmentExternalStability: true,
      wingExternalStabilityLl: true,
      wingExternalStability: true,
      abutmentInternalStability: true,
      wingInternalStability: true,
      panelFaceDesign: true,
    },
    orderBy: { createdAt: 'asc' },
  });

  if (designs.length === 0) {
    return new NextResponse('No designs found for this project', { status: 400 });
  }

  // Build DesignSection array
  const sections: DesignSection[] = [];

  for (const design of designs) {
    const typeKey = design.designType.key;

    if (typeKey === 'abutment_external_stability' && design.abutmentExternalStability) {
      const d = design.abutmentExternalStability;
      const p: ExternalStabilityParams = {
        yev: d.yev, ylsV: d.ylsV, bstemBatter: d.bstemBatter, bI: d.bI,
        sigmaBrg: d.sigmaBrg, deltaS: d.deltaS, gRFill: d.gRFill,
        phiRFill: d.phiRFill, phiFSoil: d.phiFSoil,
        pga: d.pga, fPgaEq: d.fPgaEq, kV: d.kV,
        minDesignHeight: d.minDesignHeight, maxDesignHeight: d.maxDesignHeight,
        sV: d.sV, minRl: safeMinRl,
      };
      sections.push({
        kind: 'external',
        designId: design.id,
        designTypeName: design.designType.name,
        designName: design.name,
        createdBy: design.creator.name,
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
      });
    } else if (typeKey === 'wing_external_stability_ll' && design.wingExternalStabilityLl) {
      const d = design.wingExternalStabilityLl;
      const p: ExternalStabilityParams = {
        yev: d.yev, ylsV: d.ylsV, bstemBatter: d.bstemBatter, theta: d.theta, bI: d.bI,
        sigmaBrg: d.sigmaBrg, deltaS: d.deltaS, gRFill: d.gRFill,
        phiRFill: d.phiRFill, phiFSoil: d.phiFSoil,
        pga: d.pga, fPgaEq: d.fPgaEq, kV: d.kV,
        minDesignHeight: d.minDesignHeight, maxDesignHeight: d.maxDesignHeight,
        sV: d.sV, minRl: safeMinRl,
      };
      sections.push({
        kind: 'external',
        designId: design.id,
        designTypeName: design.designType.name,
        designName: design.name,
        createdBy: design.creator.name,
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
        rows: analyzeWingExternalLl(p),
      });
    } else if (typeKey === 'wing_external_stability' && design.wingExternalStability) {
      const d = design.wingExternalStability;
      const p: ExternalStabilityParams = {
        yev: d.yev, ylsV: d.ylsV, bstemBatter: d.bstemBatter, theta: d.theta, bI: d.bI,
        sigmaBrg: d.sigmaBrg, deltaS: d.deltaS, gRFill: d.gRFill,
        phiRFill: d.phiRFill, phiFSoil: d.phiFSoil,
        pga: d.pga, fPgaEq: d.fPgaEq, kV: d.kV,
        minDesignHeight: d.minDesignHeight, maxDesignHeight: d.maxDesignHeight,
        sV: d.sV, minRl: safeMinRl,
      };
      sections.push({
        kind: 'external',
        designId: design.id,
        designTypeName: design.designType.name,
        designName: design.name,
        createdBy: design.creator.name,
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
        rows: analyzeWingExternalNoLl(p),
      });
    } else if (typeKey === 'abutment_internal_stability' && design.abutmentInternalStability) {
      const d = design.abutmentInternalStability;
      sections.push({
        kind: 'internal',
        designId: design.id,
        designTypeName: design.designType.name,
        designName: design.name,
        createdBy: design.creator.name,
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
      });
    } else if (typeKey === 'wing_internal_stability' && design.wingInternalStability) {
      const d = design.wingInternalStability;
      sections.push({
        kind: 'internal',
        designId: design.id,
        designTypeName: design.designType.name,
        designName: design.name,
        createdBy: design.creator.name,
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
      });
    } else if (typeKey === 'panel_face_design' && design.panelFaceDesign) {
      const d = design.panelFaceDesign;
      sections.push({
        kind: 'panel_face',
        designId: design.id,
        designTypeName: design.designType.name,
        designName: design.name,
        createdBy: design.creator.name,
        params: {
          "f'c (ksi)": String(d.fc), 'fy (ksi)': String(d.fy),
          'L panel (ft)': String(d.lPanel), 'h panel (ft)': String(d.hPanel),
          't panel (in)': String(d.tPanel), 'S sr (in)': String(d.ssr),
          'Cover +ve (in)': String(d.cCoverPos), 'Cover -ve (in)': String(d.cCoverNeg),
          'Vertical bar #': String(d.barNumVert), 'Vertical spacing (in)': String(d.spacingVert),
          'Horizontal bar #': String(d.barNumHor), 'Horizontal spacing (in)': String(d.spacingHor),
          'HU Strength I (kip/ft)': String(d.huStr), 'HU Extreme Event I (kip/ft)': String(d.huEe),
        },
        result: analyzePanelFace({
          fc: d.fc, fy: d.fy, tPanel: d.tPanel, ssr: d.ssr,
          cCoverPos: d.cCoverPos, cCoverNeg: d.cCoverNeg,
          barNumVert: d.barNumVert, spacingVert: d.spacingVert,
          barNumHor: d.barNumHor, spacingHor: d.spacingHor,
          huStr: d.huStr, huEe: d.huEe,
        }),
        inputs: {
          barNumHor: d.barNumHor, spacingHor: d.spacingHor,
          barNumVert: d.barNumVert, spacingVert: d.spacingVert,
          huStr: d.huStr, huEe: d.huEe,
        },
      });
    }
    // Designs with no recognized type or missing data are skipped
  }

  if (sections.length === 0) {
    return new NextResponse('No analysable designs found', { status: 400 });
  }

  const reportData: ProjectReportData = {
    projectName: project.name,
    projectLocation: project.location,
    projectDescription: project.description,
    generatedBy: session.user.name ?? session.user.email ?? 'Unknown',
    generatedAt: new Date(),
    designs: sections,
  };

  const safeName = project.name.replace(/[^a-z0-9]/gi, '_');

  try {
    if (format === 'pdf') {
      const buf = await generateProjectPdf(reportData);
      return new NextResponse(new Uint8Array(buf), {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="${safeName}_report.pdf"`,
        },
      });
    }

    const buf = await generateProjectDocx(reportData);
    return new NextResponse(new Uint8Array(buf), {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="${safeName}_report.docx"`,
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[project-report]', msg, err);
    return new NextResponse(`Report generation failed: ${msg}`, { status: 500 });
  }
}
