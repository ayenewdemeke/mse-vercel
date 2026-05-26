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
  const minRl = parseFloat(req.nextUrl.searchParams.get('minRl') ?? '8');

  const [design, project] = await Promise.all([getDesignWithData(designId, id), getProject(id)]);
  if (!design || !project) return new NextResponse('Not found', { status: 404 });

  const typeKey = design.designType.key;
  let rows;
  let params_: Record<string, string> = {};

  if (typeKey === 'abutment_external_stability' && design.abutmentExternalStability) {
    const d = design.abutmentExternalStability;
    const p: ExternalStabilityParams = {
      yev: d.yev, ylsV: d.ylsV, bstemBatter: d.bstemBatter, bI: d.bI,
      sigmaBrg: d.sigmaBrg, deltaS: d.deltaS, gRFill: d.gRFill,
      phiRFill: d.phiRFill, phiFSoil: d.phiFSoil, pga: d.pga,
      fPgaEq: d.fPgaEq, kV: d.kV,
      minDesignHeight: d.minDesignHeight, maxDesignHeight: d.maxDesignHeight, sV: d.sV, minRl,
    };
    rows = analyzeAbutmentExternal(p);
    params_ = {
      'YEV': String(d.yev), 'YLS.V': String(d.ylsV),
      'βstem-Batter (deg)': String(d.bstemBatter), 'β(i) (deg)': String(d.bI),
      'σ_brg (ksf)': String(d.sigmaBrg), 'δs': String(d.deltaS),
      'γr.fill (pcf)': String(d.gRFill), 'φr.fill (deg)': String(d.phiRFill),
      'φF.soil (deg)': String(d.phiFSoil),
      'PGA': String(d.pga), 'F_PGA.EQ': String(d.fPgaEq), 'K_V': String(d.kV),
      'Min Height (ft)': String(d.minDesignHeight), 'Max Height (ft)': String(d.maxDesignHeight),
      'Sv (ft)': String(d.sV), 'Min RL (ft)': String(minRl),
    };
  } else if (typeKey === 'wing_external_stability_ll' && design.wingExternalStabilityLl) {
    const d = design.wingExternalStabilityLl;
    const p: ExternalStabilityParams = {
      yev: d.yev, ylsV: d.ylsV, bstemBatter: d.bstemBatter, theta: d.theta, bI: d.bI,
      sigmaBrg: d.sigmaBrg, deltaS: d.deltaS, gRFill: d.gRFill,
      phiRFill: d.phiRFill, phiFSoil: d.phiFSoil, pga: d.pga,
      fPgaEq: d.fPgaEq, kV: d.kV,
      minDesignHeight: d.minDesignHeight, maxDesignHeight: d.maxDesignHeight, sV: d.sV, minRl,
    };
    rows = analyzeWingExternalLl(p);
    params_ = {
      'YEV': String(d.yev), 'YLS.V': String(d.ylsV),
      'βstem-Batter (deg)': String(d.bstemBatter), 'θ (deg)': String(d.theta),
      'β(i) (deg)': String(d.bI), 'σ_brg (ksf)': String(d.sigmaBrg),
      'δs': String(d.deltaS), 'γr.fill (pcf)': String(d.gRFill),
      'φr.fill (deg)': String(d.phiRFill), 'φF.soil (deg)': String(d.phiFSoil),
      'PGA': String(d.pga), 'F_PGA.EQ': String(d.fPgaEq), 'K_V': String(d.kV),
      'Min Height (ft)': String(d.minDesignHeight), 'Max Height (ft)': String(d.maxDesignHeight),
      'Sv (ft)': String(d.sV), 'Min RL (ft)': String(minRl),
    };
  } else if (typeKey === 'wing_external_stability' && design.wingExternalStability) {
    const d = design.wingExternalStability;
    const p: ExternalStabilityParams = {
      yev: d.yev, ylsV: d.ylsV, bstemBatter: d.bstemBatter, theta: d.theta, bI: d.bI,
      sigmaBrg: d.sigmaBrg, deltaS: d.deltaS, gRFill: d.gRFill,
      phiRFill: d.phiRFill, phiFSoil: d.phiFSoil, pga: d.pga,
      fPgaEq: d.fPgaEq, kV: d.kV,
      minDesignHeight: d.minDesignHeight, maxDesignHeight: d.maxDesignHeight, sV: d.sV, minRl,
    };
    rows = analyzeWingExternalNoLl(p);
    params_ = {
      'YEV': String(d.yev), 'YLS.V': String(d.ylsV),
      'βstem-Batter (deg)': String(d.bstemBatter), 'θ (deg)': String(d.theta),
      'β(i) (deg)': String(d.bI), 'σ_brg (ksf)': String(d.sigmaBrg),
      'δs': String(d.deltaS), 'γr.fill (pcf)': String(d.gRFill),
      'φr.fill (deg)': String(d.phiRFill), 'φF.soil (deg)': String(d.phiFSoil),
      'PGA': String(d.pga), 'F_PGA.EQ': String(d.fPgaEq), 'K_V': String(d.kV),
      'Min Height (ft)': String(d.minDesignHeight), 'Max Height (ft)': String(d.maxDesignHeight),
      'Sv (ft)': String(d.sV), 'Min RL (ft)': String(minRl),
    };
  } else if (typeKey === 'abutment_internal_stability' && design.abutmentInternalStability) {
    const d = design.abutmentInternalStability;
    const iRows = analyzeAbutmentInternal({ ...d, minRl });
    const iParams: Record<string, string> = {
      'βstem-Batter (deg)': String(d.bstemBatter), 'β(i) (deg)': String(d.bI),
      'δs': String(d.deltaS), 'γr.fill (pcf)': String(d.gRFill), 'φr.fill (deg)': String(d.phiRFill),
      'PGA': String(d.pga), 'F_PGA.EQ': String(d.fPgaEq), 'K_V': String(d.kV),
      'φ/φo.Gs': String(d.phiPoGs), 'α.Gs': String(d.alphaGs), 'Rc.Gs': String(d.rcGs), 'c': String(d.c),
      'φ/φo.Gg': String(d.phiPoGg), 'φ/φo.Gg.EE': String(d.phiPoGgEe), 'α.Gg': String(d.alphaGg), 'Rc.Gg': String(d.rcGg),
      'y': String(d.y), 'Max Dh': String(d.maxDh), 'a': String(d.a),
      't.st': String(d.tSt), 'St.Sg': String(d.stSg), 'φ/φo.Sg': String(d.phiPoSg), 'α.Sg': String(d.alphaSg), 'Rc.Sg': String(d.rcSg),
      'b.Ss': String(d.bSs), 'φ/φo.Ss': String(d.phiPoSs), 'f2': String(d.f2), 'α.Ss': String(d.alphaSs), 'Sh': String(d.sh),
      'Min Height (ft)': String(d.minDesignHeight), 'Max Height (ft)': String(d.maxDesignHeight),
      'Sv (ft)': String(d.sV), 'Min RL (ft)': String(minRl),
    };
    const iReportData: InternalReportData = {
      projectName: project.name, projectLocation: project.location,
      designTypeName: design.designType.name, createdBy: design.creator.name,
      generatedAt: new Date(), minRl, params: iParams, rows: iRows,
    };
    const safeName = `${project.name.replace(/[^a-z0-9]/gi, '_')}_${design.designType.key}`;
    if (format === 'docx') {
      const buf = await generateInternalDocx(iReportData);
      return new NextResponse(new Uint8Array(buf), { headers: { 'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'Content-Disposition': `attachment; filename="${safeName}.docx"` } });
    }
    const buf = await generateInternalXlsx(iReportData);
    return new NextResponse(new Uint8Array(buf), { headers: { 'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'Content-Disposition': `attachment; filename="${safeName}.xlsx"` } });
  } else if (typeKey === 'wing_internal_stability' && design.wingInternalStability) {
    const d = design.wingInternalStability;
    const iRows = analyzeWingInternal({ ...d, minRl });
    const iParams: Record<string, string> = {
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
      'Sv (ft)': String(d.sV), 'Min RL (ft)': String(minRl),
    };
    const iReportData: InternalReportData = {
      projectName: project.name, projectLocation: project.location,
      designTypeName: design.designType.name, createdBy: design.creator.name,
      generatedAt: new Date(), minRl, params: iParams, rows: iRows,
    };
    const safeName = `${project.name.replace(/[^a-z0-9]/gi, '_')}_${design.designType.key}`;
    if (format === 'docx') {
      const buf = await generateInternalDocx(iReportData);
      return new NextResponse(new Uint8Array(buf), { headers: { 'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'Content-Disposition': `attachment; filename="${safeName}.docx"` } });
    }
    const buf = await generateInternalXlsx(iReportData);
    return new NextResponse(new Uint8Array(buf), { headers: { 'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'Content-Disposition': `attachment; filename="${safeName}.xlsx"` } });
  } else {
    return new NextResponse('Report not available for this design type', { status: 400 });
  }

  const reportData: ReportData = {
    projectName: project.name,
    projectLocation: project.location,
    designTypeName: design.designType.name,
    createdBy: design.creator.name,
    generatedAt: new Date(),
    minRl,
    params: params_,
    rows,
  };

  const safeName = `${project.name.replace(/[^a-z0-9]/gi, '_')}_${design.designType.key}`;

  if (format === 'docx') {
    const buffer = await generateDocx(reportData);
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="${safeName}.docx"`,
      },
    });
  }

  const buffer = await generateXlsx(reportData);
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${safeName}.xlsx"`,
    },
  });
}
