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
import { analyzeAbutmentInternal, analyzeWingInternal } from '@/lib/calculations/internal-stability';
import { analyzePanelFace } from '@/lib/calculations/panel-face';
import {
  generateCombinedAbutmentXlsx, generateCombinedAbutmentDocx,
  generateCombinedWingXlsx, generateCombinedWingDocx,
  generatePanelFaceXlsx, generatePanelFaceDocx,
} from '@/lib/reports/design-report-combined';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; designId: string }> },
) {
  const { id, designId } = await params;
  const session = await auth();
  if (!session?.user?.id) return new NextResponse('Unauthorized', { status: 401 });

  const format = req.nextUrl.searchParams.get('format') ?? 'xlsx';

  const [design, project] = await Promise.all([getDesignWithData(designId, id), getProject(id)]);
  if (!design || !project) return new NextResponse('Not found', { status: 404 });

  const typeKey = design.designType.key;
  const safeName = `${project.name.replace(/[^a-z0-9]/gi, '_')}_${typeKey}`;

  const respondXlsx = async (buf: Buffer) =>
    new NextResponse(new Uint8Array(buf), {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${safeName}.xlsx"`,
      },
    });
  const respondDocx = async (buf: Buffer) =>
    new NextResponse(new Uint8Array(buf), {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="${safeName}.docx"`,
      },
    });

  // ─── Abutment ───────────────────────────────────────────────────────────────
  if (typeKey === 'abutment' && design.abutmentDesign) {
    const d = design.abutmentDesign;
    const extParams: ExternalStabilityParams = {
      yev: d.yev, ylsV: d.ylsV, bstemBatter: d.bstemBatter, bI: d.bI,
      sigmaBrg: d.sigmaBrg, deltaS: d.deltaS, gRFill: d.gRFill,
      phiRFill: d.phiRFill, phiFSoil: d.phiFSoil, pga: d.pga,
      fPgaEq: d.fPgaEq, kV: d.kV,
      minDesignHeight: d.minDesignHeight, maxDesignHeight: d.maxDesignHeight,
      sV: d.sV, minRl: d.minRl,
    };
    const extParamsMap: Record<string, string> = {
      'YEV': String(d.yev), 'YLS.V': String(d.ylsV),
      'βstem-Batter (deg)': String(d.bstemBatter), 'β(i) (deg)': String(d.bI),
      'σ_brg (ksf)': String(d.sigmaBrg), 'δs': String(d.deltaS),
      'γr.fill (pcf)': String(d.gRFill), 'φr.fill (deg)': String(d.phiRFill),
      'φF.soil (deg)': String(d.phiFSoil),
      'PGA': String(d.pga), 'F_PGA.EQ': String(d.fPgaEq), 'K_V': String(d.kV),
      'Min Height (ft)': String(d.minDesignHeight), 'Max Height (ft)': String(d.maxDesignHeight),
      'Sv (ft)': String(d.sV), 'Min RL (ft)': String(d.minRl),
    };
    const intParamsMap: Record<string, string> = {
      'βstem-Batter (deg)': String(d.bstemBatter), 'β(i) (deg)': String(d.bI),
      'δs': String(d.deltaS), 'γr.fill (pcf)': String(d.gRFill), 'φr.fill (deg)': String(d.phiRFill),
      'PGA': String(d.pga), 'F_PGA.EQ': String(d.fPgaEq), 'K_V': String(d.kV),
      'φ/φo.Gs': String(d.phiPoGs), 'α.Gs': String(d.alphaGs), 'Rc.Gs': String(d.rcGs), 'c': String(d.c),
      'φ/φo.Gg': String(d.phiPoGg), 'φ/φo.Gg.EE': String(d.phiPoGgEe), 'α.Gg': String(d.alphaGg), 'Rc.Gg': String(d.rcGg),
      'y': String(d.y), 'Max Dh': String(d.maxDh), 'a': String(d.a),
      't.st': String(d.tSt), 'St.Sg': String(d.stSg), 'φ/φo.Sg': String(d.phiPoSg), 'α.Sg': String(d.alphaSg), 'Rc.Sg': String(d.rcSg),
      'b.Ss': String(d.bSs), 'φ/φo.Ss': String(d.phiPoSs), 'f2': String(d.f2), 'α.Ss': String(d.alphaSs), 'Sh': String(d.sh),
      'Min Height (ft)': String(d.minDesignHeight), 'Max Height (ft)': String(d.maxDesignHeight),
      'Sv (ft)': String(d.sV), 'Min RL (ft)': String(d.minRl),
    };
    const data = {
      projectName: project.name, projectLocation: project.location,
      designTypeName: design.designType.name, createdBy: design.creator.name,
      generatedAt: new Date(),
      extParams: extParamsMap, intParams: intParamsMap,
      extRows: analyzeAbutmentExternal(extParams),
      intRows: analyzeAbutmentInternal(d),
    };
    return format === 'docx'
      ? respondDocx(await generateCombinedAbutmentDocx(data))
      : respondXlsx(await generateCombinedAbutmentXlsx(data));
  }

  // ─── Wing ───────────────────────────────────────────────────────────────────
  if (typeKey === 'wing' && design.wingDesign) {
    const d = design.wingDesign;
    const extParams: ExternalStabilityParams = {
      yev: d.yev, ylsV: d.ylsV, bstemBatter: d.bstemBatter, theta: d.theta, bI: d.bI,
      sigmaBrg: d.sigmaBrg, deltaS: d.deltaS, gRFill: d.gRFill,
      phiRFill: d.phiRFill, phiFSoil: d.phiFSoil, pga: d.pga,
      fPgaEq: d.fPgaEq, kV: d.kV,
      minDesignHeight: d.minDesignHeight, maxDesignHeight: d.maxDesignHeight,
      sV: d.sV, minRl: d.minRl,
    };
    const extParamsMap: Record<string, string> = {
      'YEV': String(d.yev), 'YLS.V': String(d.ylsV),
      'βstem-Batter (deg)': String(d.bstemBatter), 'θ (deg)': String(d.theta),
      'β(i) (deg)': String(d.bI), 'σ_brg (ksf)': String(d.sigmaBrg),
      'δs': String(d.deltaS), 'γr.fill (pcf)': String(d.gRFill),
      'φr.fill (deg)': String(d.phiRFill), 'φF.soil (deg)': String(d.phiFSoil),
      'PGA': String(d.pga), 'F_PGA.EQ': String(d.fPgaEq), 'K_V': String(d.kV),
      'Min Height (ft)': String(d.minDesignHeight), 'Max Height (ft)': String(d.maxDesignHeight),
      'Sv (ft)': String(d.sV), 'Min RL (ft)': String(d.minRl),
    };
    const intParamsMap: Record<string, string> = {
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
      'Sv (ft)': String(d.sV), 'Min RL (ft)': String(d.minRl),
    };
    const data = {
      projectName: project.name, projectLocation: project.location,
      designTypeName: design.designType.name, createdBy: design.creator.name,
      generatedAt: new Date(),
      extParams: extParamsMap, intParams: intParamsMap,
      extLlRows: analyzeWingExternalLl(extParams),
      extNoLlRows: analyzeWingExternalNoLl(extParams),
      intRows: analyzeWingInternal(d),
    };
    return format === 'docx'
      ? respondDocx(await generateCombinedWingDocx(data))
      : respondXlsx(await generateCombinedWingXlsx(data));
  }

  // ─── Panel face ──────────────────────────────────────────────────────────────
  if (typeKey === 'panel_face' && design.panelFaceDesign) {
    const d = design.panelFaceDesign;
    const data = {
      projectName: project.name, projectLocation: project.location,
      designTypeName: design.designType.name, createdBy: design.creator.name,
      generatedAt: new Date(),
      params: {
        "f'c (ksi)": String(d.fc), 'fy (ksi)': String(d.fy),
        'L panel (ft)': String(d.lPanel), 'h panel (ft)': String(d.hPanel),
        't panel (in)': String(d.tPanel), 'S sr (in)': String(d.ssr),
        'Cover +ve (in)': String(d.cCoverPos), 'Cover -ve (in)': String(d.cCoverNeg),
        'Vertical bar #': String(d.barNumVert), 'Vertical spacing (in)': String(d.spacingVert),
        'Horizontal bar #': String(d.barNumHor), 'Horizontal spacing (in)': String(d.spacingHor),
        'HU Strength I (kip/ft)': String(d.huStr), 'HU Extreme Event I (kip/ft)': String(d.huEe),
      },
      result: analyzePanelFace(d),
      inputs: {
        barNumHor: d.barNumHor, spacingHor: d.spacingHor,
        barNumVert: d.barNumVert, spacingVert: d.spacingVert,
        huStr: d.huStr, huEe: d.huEe,
      },
    };
    return format === 'docx'
      ? respondDocx(await generatePanelFaceDocx(data))
      : respondXlsx(await generatePanelFaceXlsx(data));
  }

  return new NextResponse('Report not available for this design type', { status: 400 });
}
