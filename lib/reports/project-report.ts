import {
  AlignmentType,
  BorderStyle,
  Document,
  type FileChild,
  Footer,
  Header,
  HeadingLevel,
  ImageRun,
  PageBreak,
  PageNumber,
  Packer,
  Paragraph,
  ShadingType,
  Table,
  TableCell,
  TableRow,
  TextRun,
  UnderlineType,
  VerticalAlign,
  WidthType,
} from 'docx';
import PDFDocument from 'pdfkit';
import { ChartJSNodeCanvas } from 'chartjs-node-canvas';
import { LinearScale, PointElement, LineElement, Legend, Tooltip } from 'chart.js';
import * as fs from 'fs';
import * as path from 'path';

import type { AnalysisRow } from '@/lib/calculations/external-stability';
import type { InternalStabilityRow } from '@/lib/calculations/internal-stability';
import type { PanelFaceResult } from '@/lib/calculations/panel-face';

// ─── Shared types ─────────────────────────────────────────────────────────────

export type ExternalDesignSection = {
  kind: 'external';
  designId: string;
  designTypeName: string;
  designName: string | null;
  createdBy: string;
  params: Record<string, string>;
  rows: AnalysisRow[];
};

export type InternalDesignSection = {
  kind: 'internal';
  designId: string;
  designTypeName: string;
  designName: string | null;
  createdBy: string;
  params: Record<string, string>;
  rows: InternalStabilityRow[];
};

export type PanelFaceDesignSection = {
  kind: 'panel_face';
  designId: string;
  designTypeName: string;
  designName: string | null;
  createdBy: string;
  params: Record<string, string>;
  result: PanelFaceResult;
  inputs: {
    barNumHor: number; spacingHor: number;
    barNumVert: number; spacingVert: number;
    huStr: number; huEe: number;
  };
};

export type DesignSection = ExternalDesignSection | InternalDesignSection | PanelFaceDesignSection;

export interface ProjectReportData {
  projectName: string;
  projectLocation: string;
  projectDescription: string | null;
  generatedBy: string;
  generatedAt: Date;
  designs: DesignSection[];
}

type DocChild = FileChild;

// ─── Constants ────────────────────────────────────────────────────────────────

const RED = 'C00000';
const RED_HEX = '#C00000';
const TEXT_HEX = '#1A202C';
const MUTED_HEX = '#4A5568';
const OK_BG = 'D1FAE5';
const OK_TEXT = '065F46';
const FAIL_BG = 'FEE2E2';
const FAIL_TEXT = '991B1B';
const LINE = '#9CA3AF';

const ASSETS_DIR = path.join(process.cwd(), 'lib', 'reports', 'assets');
const LOGO_ROCKSOL = path.join(ASSETS_DIR, 'logo-rocksol.jpg');
const LOGO_MULLER = path.join(ASSETS_DIR, 'logo-muller.jpg');
const LOGO_CDOT = path.join(ASSETS_DIR, 'logo-cdot.jpg');

// ─── Formatters ───────────────────────────────────────────────────────────────

const N = (v: number, d = 4) => (isFinite(v) && !isNaN(v) ? v.toFixed(d) : '—');
const fmtDate = (d: Date) =>
  `${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}/${d.getFullYear()}`;

function overallCheck(checks: string[]): string {
  return checks.length === 0 ? '—' : checks.every((c) => c === 'Adequate') ? 'Adequate' : 'Inadequate';
}

function designSubtitle(d: DesignSection): string {
  if (d.kind === 'external') return 'External Stability Design Calculations';
  if (d.kind === 'internal') return 'Internal Stability Design Calculations';
  return 'Precast Panel Face Design Calculations';
}

function designLabel(d: DesignSection): string {
  return d.designName ? `${d.designTypeName} — ${d.designName}` : d.designTypeName;
}

// ─── Summary check rows ───────────────────────────────────────────────────────

function externalSummaryRows(label: string, rows: AnalysisRow[]): string[][] {
  const all = (fn: (r: AnalysisRow) => string) => overallCheck(rows.map(fn));
  return [
    [label, 'External Stability, Bearing', 'Strength I', 'φqn ≥ σu', all((r) => r.checkBrgStrI)],
    ['', '', 'Extreme Event I', 'φqn ≥ σu', all((r) => r.checkBrgEeI)],
    ['', '', 'Service I', 'ABC ≥ σu', all((r) => r.checkBrgSerI)],
    ['', 'External Stability, Eccentricity (Overturning)', 'Strength I', 'eallowable ≥ eactual', all((r) => r.checkOvtStrI)],
    ['', '', 'Extreme Event I', 'eallowable ≥ eactual', all((r) => r.checkOvtEeI)],
    ['', 'External Stability, Sliding', 'Strength I', 'φRn ≥ Hu', all((r) => r.checkSldStrIClass1 === 'Adequate' && r.checkSldStrIFSoil === 'Adequate' ? 'Adequate' : 'Inadequate')],
    ['', '', 'Extreme Event I', 'φRn ≥ Hu', all((r) => r.checkSldEeIClass1 === 'Adequate' && r.checkSldEeIFSoil === 'Adequate' ? 'Adequate' : 'Inadequate')],
  ];
}

function internalSummaryRows(label: string, rows: InternalStabilityRow[]): string[][] {
  const all = (fn: (r: InternalStabilityRow) => string) => overallCheck(rows.map(fn));
  return [
    [label, 'Internal Stability, Geosynthetic Strip', 'Pull-Out', '—', all((r) => r.poGeostripCheck)],
    ['', 'Internal Stability, Geosynthetic Grid', 'Pull-Out', '—', all((r) => r.poGeogridCheck)],
    ['', 'Internal Stability, Metallic Grid', 'Pull-Out', '—', all((r) => r.poSgCheck)],
    ['', 'Internal Stability, Metallic Strip', 'Pull-Out', '—', all((r) => r.poSsCheck)],
  ];
}

function panelSummaryRows(label: string, r: PanelFaceResult): string[][] {
  return [
    [label, 'Positive Flexure, Horizontal', 'Strength I', 'φMn ≥ Mu', r.check_HorPos_flex],
    ['', 'Positive Flexure, Vertical', 'Strength I', 'φMn ≥ Mu', r.check_VertPos_flex],
    ['', 'Negative Flexure, Horizontal', 'Strength I', 'φMn ≥ Mu', r.check_HorNeg_flex],
    ['', 'Negative Flexure, Vertical', 'Strength I', 'φMn ≥ Mu', r.check_VertNeg_flex],
    ['', 'Cracking', 'Service I', 'sactual < smaximum', r.check_crack_Hor === 'Adequate' && r.check_crack_Vert === 'Adequate' ? 'Adequate' : 'Inadequate'],
    ['', 'Shear', 'Strength I', 'φVn ≥ Vu', r.check_shear],
  ];
}

// ─── LTDS chart renderer ──────────────────────────────────────────────────────

async function renderLtdsChartPng(rows: InternalStabilityRow[]): Promise<Buffer> {
  const canvas = new ChartJSNodeCanvas({
    width: 900, height: 600, backgroundColour: 'white',
    chartCallback: (C) => { C.register(LinearScale, PointElement, LineElement, Legend, Tooltip); },
  });
  const zValues = rows.map((r) => r.z);
  const maxZ = Math.max(...zValues);
  const make = (ltds: number[]) => ltds.map((v, i) => ({ x: v / 1000, y: zValues[i] }));
  return canvas.renderToBuffer({
    type: 'scatter',
    data: {
      datasets: [
        { label: 'Geostrip',       data: make(rows.map((r) => r.ltdsGeostrip)), borderColor: 'rgba(75,192,192,1)',  backgroundColor: 'rgba(75,192,192,1)',  borderWidth: 2, pointRadius: 3, showLine: true },
        { label: 'Geogrid',        data: make(rows.map((r) => r.ltdsGeogrid)),  borderColor: 'rgba(255,99,132,1)',  backgroundColor: 'rgba(255,99,132,1)',  borderWidth: 2, pointRadius: 3, showLine: true },
        { label: 'Metallic Grid',  data: make(rows.map((r) => r.ltdsSg)),       borderColor: 'rgba(54,162,235,1)',  backgroundColor: 'rgba(54,162,235,1)',  borderWidth: 2, pointRadius: 3, showLine: true },
        { label: 'Metallic Strip', data: make(rows.map((r) => r.ltdsSs)),       borderColor: 'rgba(153,102,255,1)', backgroundColor: 'rgba(153,102,255,1)', borderWidth: 2, pointRadius: 3, showLine: true },
      ],
    },
    options: {
      responsive: false, parsing: false, animation: false,
      scales: {
        x: { type: 'linear', position: 'bottom', title: { display: true, text: 'Required Factored LTDS (kip/ft)' }, beginAtZero: true },
        y: { type: 'linear', title: { display: true, text: 'Depth below finished grade, z (ft)' }, beginAtZero: true, max: Math.ceil(maxZ + 1), reverse: true },
      },
      plugins: { legend: { position: 'top' } },
    },
  });
}

// ═════════════════════════════════════════════════════════════════════════════
// PDF GENERATION (pdfkit)
// ═════════════════════════════════════════════════════════════════════════════

const PAGE_W = 612;       // 8.5" letter
const PAGE_H = 792;       // 11"
const M_LEFT = 54;        // 0.75"
const M_RIGHT = 54;
const M_TOP = 54;
const M_BOTTOM = 54;
const HEADER_H = 60;
const FOOTER_H = 30;
const CONTENT_TOP = M_TOP + HEADER_H;
const CONTENT_BOTTOM = PAGE_H - M_BOTTOM - FOOTER_H;
const CONTENT_W = PAGE_W - M_LEFT - M_RIGHT;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type PdfDoc = any;

function pdfDrawHeader(
  doc: PdfDoc,
  projectName: string,
  subtitle: string,
  byUser: string,
  date: string,
  showLogo: boolean,
) {
  const top = M_TOP - 6;
  // Logo left
  if (showLogo) {
    try {
      doc.image(LOGO_ROCKSOL, M_LEFT, top, { width: 80 });
    } catch {
      /* ignore */
    }
  }
  // Center title
  doc
    .font('Helvetica-Bold')
    .fontSize(10)
    .fillColor(TEXT_HEX)
    .text(projectName, M_LEFT + 90, top + 4, { width: CONTENT_W - 180, align: 'center', lineBreak: false });
  doc
    .font('Helvetica')
    .fontSize(10)
    .fillColor(TEXT_HEX)
    .text(subtitle, M_LEFT + 90, top + 18, { width: CONTENT_W - 180, align: 'center', lineBreak: false });
  // Right block
  const rx = PAGE_W - M_RIGHT - 110;
  doc
    .font('Helvetica')
    .fontSize(9)
    .fillColor(TEXT_HEX)
    .text('Computation', rx, top, { width: 110, align: 'right', lineBreak: false })
    .text(`By: ${byUser}`, rx, top + 12, { width: 110, align: 'right', lineBreak: false })
    .text(date, rx, top + 24, { width: 110, align: 'right', lineBreak: false });
  // Separator line
  doc
    .save()
    .moveTo(M_LEFT, M_TOP + HEADER_H - 8)
    .lineTo(PAGE_W - M_RIGHT, M_TOP + HEADER_H - 8)
    .lineWidth(0.5)
    .strokeColor(LINE)
    .stroke()
    .restore();
}

function pdfDrawFooter(doc: PdfDoc, pageNum: number) {
  const y = PAGE_H - M_BOTTOM - FOOTER_H + 10;
  doc
    .font('Helvetica')
    .fontSize(9)
    .fillColor(MUTED_HEX)
    .text(String(pageNum), M_LEFT, y, { width: CONTENT_W, align: 'center', lineBreak: false });
}

function pdfNewBodyPage(
  doc: PdfDoc,
  state: { pageNum: number; projectName: string; subtitle: string; byUser: string; date: string },
) {
  doc.addPage();
  state.pageNum++;
  pdfDrawHeader(doc, state.projectName, state.subtitle, state.byUser, state.date, true);
  pdfDrawFooter(doc, state.pageNum);
  doc.x = M_LEFT;
  doc.y = CONTENT_TOP;
}

function pdfSectionTitle(
  doc: PdfDoc,
  text: string,
  state: { pageNum: number; projectName: string; subtitle: string; byUser: string; date: string },
) {
  if (doc.y + 30 > CONTENT_BOTTOM) {
    pdfNewBodyPage(doc, state);
  }
  doc.moveDown(0.6);
  const y = doc.y;
  doc
    .font('Helvetica-Bold')
    .fontSize(13)
    .fillColor(RED_HEX)
    .text(text, M_LEFT, y, { width: CONTENT_W, lineBreak: false });
  // Underline
  const titleW = doc.widthOfString(text);
  doc
    .save()
    .moveTo(M_LEFT, y + 16)
    .lineTo(M_LEFT + titleW, y + 16)
    .lineWidth(1)
    .strokeColor(RED_HEX)
    .stroke()
    .restore();
  doc.x = M_LEFT;
  doc.y = y + 22;
  doc.fillColor(TEXT_HEX);
}

function pdfSubtitle(doc: PdfDoc, text: string) {
  doc.moveDown(0.4);
  doc
    .font('Helvetica-Bold')
    .fontSize(10)
    .fillColor(TEXT_HEX)
    .text(text, M_LEFT, doc.y, { width: CONTENT_W });
  doc.moveDown(0.2);
}

function pdfTable(
  doc: PdfDoc,
  headers: string[],
  rows: string[][],
  state: { pageNum: number; projectName: string; subtitle: string; byUser: string; date: string },
  opts: { colWidths?: number[]; fontSize?: number; rowH?: number; headerH?: number } = {},
) {
  const n = headers.length;
  const colWidths = opts.colWidths ?? Array(n).fill(CONTENT_W / n);
  const rowH = opts.rowH ?? 16;
  const headerH = opts.headerH ?? 20;
  const fontSize = opts.fontSize ?? Math.max(6, Math.min(8.5, 75 / n));

  let y = doc.y;
  if (y + headerH + rowH > CONTENT_BOTTOM) {
    pdfNewBodyPage(doc, state);
    y = doc.y;
  }

  const drawHeader = () => {
    doc.save().rect(M_LEFT, y, CONTENT_W, headerH).fill('#1E3A5F');
    doc.font('Helvetica-Bold').fontSize(fontSize).fillColor('#FFFFFF');
    let cx = M_LEFT;
    for (let i = 0; i < headers.length; i++) {
      doc.text(headers[i], cx + 3, y + headerH / 2 - fontSize / 2, {
        width: colWidths[i] - 6, align: 'center', lineBreak: false,
      });
      cx += colWidths[i];
    }
    doc.restore();
    y += headerH;
  };

  drawHeader();

  doc.font('Helvetica').fontSize(fontSize);
  for (let ri = 0; ri < rows.length; ri++) {
    if (y + rowH > CONTENT_BOTTOM) {
      doc.y = y;
      pdfNewBodyPage(doc, state);
      y = doc.y;
      drawHeader();
      doc.font('Helvetica').fontSize(fontSize);
    }
    const row = rows[ri];
    // Alt row background
    if (ri % 2 === 1) {
      doc.save().rect(M_LEFT, y, CONTENT_W, rowH).fillOpacity(0.04).fill('#000000').fillOpacity(1).restore();
    }
    let cx = M_LEFT;
    for (let ci = 0; ci < row.length; ci++) {
      const val = row[ci] ?? '';
      if (val === 'Adequate') {
        doc.save().rect(cx + 0.5, y + 0.5, colWidths[ci] - 1, rowH - 1).fill('#' + OK_BG).restore();
        doc.fillColor('#' + OK_TEXT);
      } else if (val === 'Inadequate') {
        doc.save().rect(cx + 0.5, y + 0.5, colWidths[ci] - 1, rowH - 1).fill('#' + FAIL_BG).restore();
        doc.fillColor('#' + FAIL_TEXT);
      } else {
        doc.fillColor(TEXT_HEX);
      }
      doc.text(val, cx + 3, y + rowH / 2 - fontSize / 2 + 1, {
        width: colWidths[ci] - 6, align: 'center', lineBreak: false,
      });
      cx += colWidths[ci];
    }
    // Row border
    doc.save().rect(M_LEFT, y, CONTENT_W, rowH).strokeColor('#E2E8F0').lineWidth(0.3).stroke().restore();
    y += rowH;
  }
  // Outer border
  doc.save().rect(M_LEFT, doc.y, CONTENT_W, y - doc.y).strokeColor('#9CA3AF').lineWidth(0.6).stroke().restore();
  doc.y = y + 6;
}

function pdfParamTable(
  doc: PdfDoc,
  params: Record<string, string>,
  state: { pageNum: number; projectName: string; subtitle: string; byUser: string; date: string },
) {
  const col1 = CONTENT_W * 0.45;
  const col2 = CONTENT_W * 0.25;
  const col3 = CONTENT_W * 0.30;
  const rows = Object.entries(params).map(([k, v]) => [k, v, '']);
  pdfTable(doc, ['Parameter', 'Value', 'Notes'], rows, state, { colWidths: [col1, col2, col3] });
}

// ── Cover page ──

function pdfDrawCover(doc: PdfDoc, data: ProjectReportData) {
  doc.addPage();

  // Three logos at the top
  const logoTop = M_TOP;
  const logoH = 35;
  try { doc.image(LOGO_MULLER, M_LEFT, logoTop, { height: logoH }); } catch { /* ignore */ }
  try {
    const cdotW = 130;
    doc.image(LOGO_CDOT, M_LEFT + (CONTENT_W - cdotW) / 2, logoTop, { width: cdotW });
  } catch { /* ignore */ }
  try {
    const rsW = 110;
    doc.image(LOGO_ROCKSOL, PAGE_W - M_RIGHT - rsW, logoTop, { width: rsW });
  } catch { /* ignore */ }

  // Title block
  let y = logoTop + 65;
  doc
    .font('Helvetica-Bold')
    .fontSize(18)
    .fillColor(TEXT_HEX)
    .text(data.projectName, M_LEFT, y, { width: CONTENT_W, align: 'center' });
  y = doc.y + 4;
  doc
    .font('Helvetica')
    .fontSize(12)
    .fillColor(MUTED_HEX)
    .text(data.projectLocation, M_LEFT, y, { width: CONTENT_W, align: 'center' });
  if (data.projectDescription) {
    y = doc.y + 4;
    doc.fontSize(10).text(data.projectDescription, M_LEFT, y, { width: CONTENT_W, align: 'center' });
  }

  // Table of contents
  doc.moveDown(2);
  doc.font('Helvetica-Bold').fontSize(13).fillColor(TEXT_HEX)
    .text('MSE Retaining Walls: Design Calculations', M_LEFT, doc.y, { width: CONTENT_W });
  doc.moveDown(0.4);

  doc.font('Helvetica').fontSize(11).fillColor(TEXT_HEX);
  const tocLineH = 18;
  let tocY = doc.y;
  const tocRight = PAGE_W - M_RIGHT;

  const drawTocLine = (label: string, page: string, bold = false, indent = 0) => {
    doc.font(bold ? 'Helvetica-Bold' : 'Helvetica');
    const labelX = M_LEFT + indent;
    doc.text(label, labelX, tocY, { width: tocRight - labelX - 60, lineBreak: false });
    doc.text(page, tocRight - 50, tocY, { width: 50, align: 'right', lineBreak: false });
    tocY += tocLineH;
  };

  drawTocLine('Summary of Design Checks', '2', true);
  drawTocLine('Designs Overview', '3', true);

  let pageCounter = 4;
  for (const ds of data.designs) {
    drawTocLine(designLabel(ds), String(pageCounter), true);
    pageCounter += estimatePages(ds);
  }

  // Generation info & address footer
  const bottomY = PAGE_H - M_BOTTOM - 100;
  doc.font('Helvetica').fontSize(10).fillColor(MUTED_HEX);
  doc.text(`Generated by: ${data.generatedBy}`, M_LEFT, bottomY, { width: CONTENT_W, align: 'center' });
  doc.text(`Date: ${fmtDate(data.generatedAt)}`, M_LEFT, doc.y, { width: CONTENT_W, align: 'center' });

  // Page 1 has no centered number footer in the reference
  doc
    .font('Helvetica')
    .fontSize(9)
    .fillColor(MUTED_HEX)
    .text('1', M_LEFT, PAGE_H - M_BOTTOM - 12, { width: CONTENT_W, align: 'center', lineBreak: false });
}

function estimatePages(d: DesignSection): number {
  if (d.kind === 'external') return 4;
  if (d.kind === 'internal') return 6;
  return 3;
}

// ── Summary of Design Checks page ──

function pdfDrawSummaryPage(
  doc: PdfDoc,
  data: ProjectReportData,
  state: { pageNum: number; projectName: string; subtitle: string; byUser: string; date: string },
) {
  pdfNewBodyPage(doc, state);
  doc
    .font('Helvetica-Bold')
    .fontSize(14)
    .fillColor(TEXT_HEX)
    .text('Summary of Design Checks', M_LEFT, doc.y, { width: CONTENT_W, align: 'center' });
  doc.moveDown(0.6);

  const allRows: string[][] = [];
  for (const ds of data.designs) {
    const label = designLabel(ds);
    if (ds.kind === 'external') {
      allRows.push(...externalSummaryRows(label, ds.rows));
    } else if (ds.kind === 'internal') {
      allRows.push(...internalSummaryRows(label, ds.rows));
    } else {
      allRows.push(...panelSummaryRows(label, ds.result));
    }
  }

  const w0 = CONTENT_W * 0.20;
  const w1 = CONTENT_W * 0.28;
  const w2 = CONTENT_W * 0.18;
  const w3 = CONTENT_W * 0.20;
  const w4 = CONTENT_W * 0.14;

  pdfTable(
    doc,
    ['Wall Type / Configuration', 'Limit State Checked', 'Load Combination', 'Results are Adequate', 'Result'],
    allRows,
    state,
    { colWidths: [w0, w1, w2, w3, w4], rowH: 18 },
  );
}

// ── Designs Overview page ──

function pdfDrawOverviewPage(
  doc: PdfDoc,
  data: ProjectReportData,
  state: { pageNum: number; projectName: string; subtitle: string; byUser: string; date: string },
) {
  pdfNewBodyPage(doc, state);
  doc
    .font('Helvetica-Bold')
    .fontSize(14)
    .fillColor(TEXT_HEX)
    .text('Designs Overview', M_LEFT, doc.y, { width: CONTENT_W, align: 'center' });
  doc.moveDown(0.6);

  const rows = data.designs.map((ds, i) => [String(i + 1), ds.designTypeName, ds.designName ?? '—', ds.createdBy]);
  pdfTable(
    doc,
    ['#', 'Design Type', 'Name', 'Created By'],
    rows,
    state,
    { colWidths: [CONTENT_W * 0.06, CONTENT_W * 0.34, CONTENT_W * 0.32, CONTENT_W * 0.28], rowH: 20 },
  );
}

// ── External Stability section ──

function pdfDrawExternalSection(
  doc: PdfDoc,
  ds: ExternalDesignSection,
  state: { pageNum: number; projectName: string; subtitle: string; byUser: string; date: string },
) {
  state.subtitle = designSubtitle(ds);
  pdfNewBodyPage(doc, state);
  const { rows } = ds;

  pdfSectionTitle(doc, designLabel(ds), state);
  doc.font('Helvetica').fontSize(9).fillColor(MUTED_HEX)
    .text(`Created by: ${ds.createdBy}`, M_LEFT, doc.y);
  doc.moveDown(0.4);

  pdfSectionTitle(doc, 'Input Parameters', state);
  pdfParamTable(doc, ds.params, state);

  pdfSectionTitle(doc, 'Summary of Loads', state);
  pdfTable(doc,
    ['DH (ft)', 'RL (ft)', 'h_eq', 'P_LS.V', 'P_EV', 'M_LS.V', 'M_EV', 'P_LS.H', 'P_EH', 'P_EQ', 'M_LS.H', 'M_EH', 'M_EQ'],
    rows.map((r) => [N(r.dh, 2), N(r.rl, 2), N(r.hEq, 2), N(r.pLsV), N(r.pEv), N(r.mLsV), N(r.mEv), N(r.pLsH), N(r.pEh), N(r.pEq), N(r.mLsH), N(r.mEh), N(r.mEq)]),
    state,
  );

  pdfSectionTitle(doc, 'Load Combinations', state);
  pdfTable(doc,
    ['DH', 'Pu Ser-I V', 'Mu Ser-I V', 'Pu Str-I V', 'Mu Str-I V', 'Pu EE-I V', 'Mu EE-I V', 'Pu Ser-I L', 'Mu Ser-I L', 'Pu Str-I L', 'Mu Str-I L', 'Pu EE-I L', 'Mu EE-I L'],
    rows.map((r) => [N(r.dh, 2), N(r.puSerIV), N(r.muSerIV), N(r.puStrIV), N(r.muStrIV), N(r.puEeIV), N(r.muEeIV), N(r.puSerILat), N(r.muSerILat), N(r.puStrILat), N(r.muStrILat), N(r.puEeILat), N(r.muEeILat)]),
    state,
  );

  pdfSectionTitle(doc, 'External Stability — Strength I', state);
  pdfTable(doc,
    ['DH', 'ecc Brg', 'Su Brg', 'Brg', 'ecc Ovt', 'Ovt', 'φRr Cl.1', 'φRr F.S', 'Sld Cl.1', 'Sld F.S'],
    rows.map((r) => [N(r.dh, 2), N(r.eccBrgStrI), N(r.suBrgStrI), r.checkBrgStrI, N(r.eccOvtStrI), r.checkOvtStrI, N(r.phiRrStrIClass1), N(r.phiRrStrIFSoil), r.checkSldStrIClass1, r.checkSldStrIFSoil]),
    state,
  );

  pdfSectionTitle(doc, 'External Stability — Extreme Event I', state);
  pdfTable(doc,
    ['DH', 'ecc Brg', 'Su Brg', 'Brg', 'ecc Ovt', 'Ovt', 'φRr Cl.1', 'φRr F.S', 'Sld Cl.1', 'Sld F.S'],
    rows.map((r) => [N(r.dh, 2), N(r.eccBrgEeI), N(r.suBrgEeI), r.checkBrgEeI, N(r.eccOvtEeI), r.checkOvtEeI, N(r.phiRrEeIClass1), N(r.phiRrEeIFSoil), r.checkSldEeIClass1, r.checkSldEeIFSoil]),
    state,
  );

  pdfSectionTitle(doc, 'External Stability — Service I', state);
  pdfTable(doc,
    ['DH (ft)', 'ecc Brg', 'Su Brg', 'Bearing Check'],
    rows.map((r) => [N(r.dh, 2), N(r.eccBrgSerI), N(r.suBrgSerI), r.checkBrgSerI]),
    state,
  );

  pdfSectionTitle(doc, 'Percentage Demand (%)', state);
  pdfTable(doc,
    ['DH', 'Brg Str', 'Brg EE', 'Brg Ser', 'Ovt Str', 'Ovt EE', 'Sld Str', 'Sld EE', 'Ctrl %', 'Controls'],
    rows.map((r) => [N(r.dh, 2), N(r.demBrgStrI, 1), N(r.demBrgEeI, 1), N(r.demBrgSerI, 1), N(r.demOvtStrI, 1), N(r.demOvtEeI, 1), N(r.demSldStrI, 1), N(r.demSldEeI, 1), N(r.demCtrl, 1), r.limitState]),
    state,
  );

  pdfSectionTitle(doc, 'Demand Summary', state);
  pdfTable(doc,
    ['DH (ft)', 'RL (ft)', 'NL', 'Ctrl % Demand', 'Controlling Limit State'],
    rows.map((r) => [N(r.dh, 2), N(r.rl, 2), String(r.nl), N(r.demCtrl, 1), r.limitState]),
    state,
  );
}

// ── Internal Stability section ──

async function pdfDrawInternalSection(
  doc: PdfDoc,
  ds: InternalDesignSection,
  state: { pageNum: number; projectName: string; subtitle: string; byUser: string; date: string },
) {
  state.subtitle = designSubtitle(ds);
  pdfNewBodyPage(doc, state);
  const { rows } = ds;

  pdfSectionTitle(doc, designLabel(ds), state);
  doc.font('Helvetica').fontSize(9).fillColor(MUTED_HEX)
    .text(`Created by: ${ds.createdBy}`, M_LEFT, doc.y);
  doc.moveDown(0.4);

  pdfSectionTitle(doc, 'Input Parameters', state);
  pdfParamTable(doc, ds.params, state);

  pdfSectionTitle(doc, 'Stress / Load Determination at Reinforcement Level', state);
  pdfTable(doc,
    ['DH (ft)', 'RL (ft)', 'z (ft)', 'σEV.Z', 'h_eq', 'σLS.Z', 'ωIR', 'ωAE', 'ωEQ.1', 'ωEQ.2', 'PEQ', 'σEQ'],
    rows.map((r) => [N(r.dh, 2), N(r.rl, 2), N(r.z, 2), N(r.sEvZ), N(r.hEq, 1), N(r.sLsZ), N(r.wIr, 3), N(r.wAe, 3), N(r.wEq1, 3), N(r.wEq2, 3), N(r.pEq, 3), N(r.sEq, 3)]),
    state,
  );

  pdfSectionTitle(doc, 'Geosynthetic Strip', state);
  pdfTable(doc,
    ['z (ft)', 'σV Str-I', 'σH Str-I', 'σV EE-I', 'σH EE-I', 'Tmax Str', 'Tmax EE', 'lE Str', 'lE EE', 'lE', 'lA', 'RL min', 'LTDS', 'PO'],
    rows.map((r) => [N(r.z, 2), N(r.sVStrI), N(r.sHStrI), N(r.sVEeI), N(r.sHEeI), N(r.tMaxStrIGstrip), N(r.tMaxEeIGstrip), N(r.lEStrIGs, 3), N(r.lEEeIGs, 3), N(r.lEGeostrip, 3), N(r.lAGs, 3), N(r.rlMinGeostrip, 3), N(r.ltdsGeostrip, 0), r.poGeostripCheck]),
    state,
  );

  pdfSectionTitle(doc, 'Geosynthetic Grid', state);
  pdfTable(doc,
    ['z (ft)', 'σV Str-I', 'σH Str-I', 'σV EE-I', 'σH EE-I', 'Tmax Str', 'Tmax EE', 'lE Str', 'lE EE', 'lE', 'lA', 'RL min', 'LTDS', 'PO'],
    rows.map((r) => [N(r.z, 2), N(r.sVStrI), N(r.sHStrI), N(r.sVEeI), N(r.sHEeI), N(r.tMaxStrIGgrid), N(r.tMaxEeIGgrid), N(r.lEStrIGg, 3), N(r.lEEeIGg, 3), N(r.lEGeogrid, 3), N(r.lAGg, 3), N(r.rlMinGeogrid, 3), N(r.ltdsGeogrid, 0), r.poGeogridCheck]),
    state,
  );

  pdfSectionTitle(doc, 'Metallic Grid', state);
  pdfTable(doc,
    ['z (ft)', "F'", 'kR.Sg', 'σV Str', 'σH Str', 'σV EE', 'σH EE', 'Tmax Str', 'Tmax EE', 'lE Str', 'lE EE', 'lE', 'lA', 'RL min', 'LTDS', 'PO'],
    rows.map((r) => [N(r.z, 2), N(r.fpMg), N(r.krSg), N(r.sVStrIMg), N(r.sHStrIMg), N(r.sVEeIMg), N(r.sHEeIMg), N(r.tMaxStrISg), N(r.tMaxEeISg), N(r.lEStrIMg, 3), N(r.lEEeIMg, 3), N(r.lESg, 3), N(r.lASg, 2), N(r.rlMinSg, 3), N(r.ltdsSg, 0), r.poSgCheck]),
    state,
  );

  pdfSectionTitle(doc, 'Ribbed Metallic Strip', state);
  pdfTable(doc,
    ['z (ft)', "F'", 'kR.Ss', 'σV Str', 'σH Str', 'σV EE', 'σH EE', 'Tmax Str', 'Tmax EE', 'lE Str', 'lE EE', 'lE', 'lA', 'RL min', 'LTDS', 'PO'],
    rows.map((r) => [N(r.z, 2), N(r.fpSs), N(r.krSs), N(r.sVStrISs), N(r.sHStrISs), N(r.sVEeISs), N(r.sHEeISs), N(r.tMaxStrISs), N(r.tMaxEeISs), N(r.lEStrISs, 3), N(r.lEEeISs, 3), N(r.lESs, 3), N(r.lASs, 2), N(r.rlMinSs, 3), N(r.ltdsSs, 0), r.poSsCheck]),
    state,
  );

  pdfSectionTitle(doc, 'Required Factored Long Term Design Strength, LTDS (lb/ft)', state);
  pdfTable(doc,
    ['z (ft)', 'Geostrip Str-I', 'Geogrid Str-I', 'Met.Grid Str-I', 'Rib.Strip Str-I', 'Geostrip EE-I', 'Geogrid EE-I', 'Met.Grid EE-I', 'Rib.Strip EE-I'],
    rows.map((r) => [N(r.z, 2), N(r.ltdsGeostrip, 0), N(r.ltdsGeogrid, 0), N(r.ltdsSg, 0), N(r.ltdsSs, 0), N(r.ltdsEeIGs, 0), N(r.ltdsEeIGg, 0), N(r.ltdsEeISg, 0), N(r.ltdsEeISs, 0)]),
    state,
  );

  pdfSectionTitle(doc, 'Internal Design Summary — LTDS Chart', state);
  const chartPng = await renderLtdsChartPng(rows);
  const chartW = CONTENT_W;
  const chartH = Math.round(chartW * (600 / 900));
  if (doc.y + chartH > CONTENT_BOTTOM) {
    pdfNewBodyPage(doc, state);
  }
  doc.image(chartPng, M_LEFT, doc.y, { width: chartW, height: chartH });
  doc.y += chartH + 8;
}

// ── Panel Face section ──

function pdfDrawPanelFaceSection(
  doc: PdfDoc,
  ds: PanelFaceDesignSection,
  state: { pageNum: number; projectName: string; subtitle: string; byUser: string; date: string },
) {
  state.subtitle = designSubtitle(ds);
  pdfNewBodyPage(doc, state);
  const r = ds.result;
  const inputs = ds.inputs;
  const MMin_pos_raw = Math.min(1.33 * r.MU_pos, 1.6 * 0.67 * r.Mcr);
  const MMin_neg_raw = Math.min(1.33 * r.MU_neg, 1.6 * 0.67 * r.Mcr);

  pdfSectionTitle(doc, designLabel(ds), state);
  doc.font('Helvetica').fontSize(9).fillColor(MUTED_HEX)
    .text(`Created by: ${ds.createdBy}`, M_LEFT, doc.y);
  doc.moveDown(0.4);

  pdfSectionTitle(doc, 'Input Parameters', state);
  pdfParamTable(doc, ds.params, state);

  pdfSectionTitle(doc, 'Factored Load on Panel', state);
  pdfTable(doc,
    ['HU.Str.Panel (kip/ft)', 'HU.EE.Panel (kip/ft)', 'HU.Panel (kip/ft)', 'MU.Panel.+ve (kip·ft)', 'MU.Panel.-ve (kip·ft)', 'VU.Panel (kip)'],
    [[N(inputs.huStr), N(inputs.huEe), N(r.HU_panel), N(r.MU_pos), N(r.MU_neg), N(r.VU_panel)]],
    state,
  );

  pdfSectionTitle(doc, 'Concrete Cracking Moment', state);
  pdfTable(doc,
    ['fRupture (ksi)', 'SPanel (in³)', 'MCR (kip·ft)'],
    [[N(r.fr), N(r.St, 2), N(r.Mcr)]],
    state,
  );

  pdfSectionTitle(doc, 'Minimum Applied Moment & Factored Ultimate Moment', state);
  pdfTable(doc,
    ['MMin.Pos (kip·ft)', 'MMin.Neg (kip·ft)', 'MU.+ve governing', 'MU.-ve governing', 'VU.Panel (kip)'],
    [[N(MMin_pos_raw), N(MMin_neg_raw), N(r.MMin_pos), N(r.MMin_neg), N(r.VU_panel)]],
    state,
  );

  pdfSectionTitle(doc, 'Flexural Capacity', state);
  pdfTable(doc,
    ['Direction', 'β1', 'α1', 'c (in)', 'a (in)', 'εt', 'φf', 'MN', 'φMN', 'MU', 'φMN/MU', 'Reinf.', 'Check'],
    [
      ['Hor +ve', N(r.beta1), N(r.alpha1), N(r.C_HorPos), N(r.a_HorPos), N(r.et_HorPos, 5), N(r.phi_f_HorPos), N(r.MN_pos_Hor), N(r.phiMN_pos_Hor), N(r.MMin_pos), N(r.phiMN_pos_Hor / r.MMin_pos, 3), `#${inputs.barNumHor}@${inputs.spacingHor}`, r.check_HorPos_flex],
      ['Vert +ve', N(r.beta1), N(r.alpha1), N(r.C_VertPos), N(r.a_VertPos), N(r.et_VertPos, 5), N(r.phi_f_VertPos), N(r.MN_pos_Vert), N(r.phiMN_pos_Vert), N(r.MMin_pos), N(r.phiMN_pos_Vert / r.MMin_pos, 3), `#${inputs.barNumVert}@${inputs.spacingVert}`, r.check_VertPos_flex],
      ['Hor -ve', N(r.beta1), N(r.alpha1), N(r.C_HorNeg), N(r.a_HorNeg), N(r.et_HorNeg, 5), N(r.phi_f_HorNeg), N(r.MN_neg_Hor), N(r.phiMN_neg_Hor), N(r.MMin_neg), N(r.phiMN_neg_Hor / r.MMin_neg, 3), `#${inputs.barNumHor}@${inputs.spacingHor}`, r.check_HorNeg_flex],
      ['Vert -ve', N(r.beta1), N(r.alpha1), N(r.C_VertNeg), N(r.a_VertNeg), N(r.et_VertNeg, 5), N(r.phi_f_VertNeg), N(r.MN_neg_Vert), N(r.phiMN_neg_Vert), N(r.MMin_neg), N(r.phiMN_neg_Vert / r.MMin_neg, 3), `#${inputs.barNumVert}@${inputs.spacingVert}`, r.check_VertNeg_flex],
    ],
    state,
  );

  pdfSectionTitle(doc, 'Service I: Crack Control', state);
  pdfTable(doc,
    ['Direction', 'SB (in)', 'γEV.Str.I', 'a (in)', 'γe', 'fSS (ksi)', 'dC (in)', 'βS', 'sMax.Crack (in)', 'Check'],
    [
      ['Horizontal', N(inputs.spacingHor, 3), '1.35', N(r.a_HorPos), '1.0', N(r.fs_Hor), N(r.dc_Hor), N(r.Vs_Hor), N(r.Smax_Hor), r.check_crack_Hor],
      ['Vertical', N(inputs.spacingVert, 3), '1.35', N(r.a_VertPos), '1.0', N(r.fs_Vert), N(r.dc_Vert), N(r.Vs_Vert), N(r.Smax_Vert), r.check_crack_Vert],
    ],
    state,
  );

  pdfSectionTitle(doc, 'Strength I: Shear Capacity', state);
  pdfTable(doc,
    ['VU.Panel (kip)', 'φV', 'β', 'VN.1 (kip)', 'VN.2 (kip)', 'VN.Panel (kip)', 'φVN.Panel (kip)', 'φVN/VU', 'Check'],
    [[N(r.VU_panel), '0.9', '2', N(r.Vc), N(r.Vc_max), N(Math.min(r.Vc, r.Vc_max)), N(r.phiVc), N(r.phiVc / r.VU_panel), r.check_shear]],
    state,
  );
}

// ── Main PDF generator ──

export async function generateProjectPdf(data: ProjectReportData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    const doc = new PDFDocument({
      size: 'LETTER',
      layout: 'portrait',
      margins: { top: M_TOP, bottom: M_BOTTOM, left: M_LEFT, right: M_RIGHT },
      autoFirstPage: false,
    });

    doc.on('data', (c: Buffer) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const dateStr = fmtDate(data.generatedAt);
    const state = {
      pageNum: 1,
      projectName: data.projectName,
      subtitle: 'MSE Wall Design Calculations',
      byUser: data.generatedBy,
      date: dateStr,
    };

    (async () => {
      try {
        pdfDrawCover(doc, data);

        // Summary of Design Checks (page 2)
        state.subtitle = 'MSE Wall Design Calculations';
        pdfDrawSummaryPage(doc, data, state);

        // Designs overview (page 3)
        pdfDrawOverviewPage(doc, data, state);

        // Per-design sections
        for (const ds of data.designs) {
          if (ds.kind === 'external') {
            pdfDrawExternalSection(doc, ds, state);
          } else if (ds.kind === 'internal') {
            await pdfDrawInternalSection(doc, ds, state);
          } else {
            pdfDrawPanelFaceSection(doc, ds, state);
          }
        }

        doc.end();
      } catch (err) {
        reject(err);
      }
    })();
  });
}

// ═════════════════════════════════════════════════════════════════════════════
// WORD (.docx) GENERATION
// ═════════════════════════════════════════════════════════════════════════════

const tblBorder = {
  top:    { style: BorderStyle.SINGLE, size: 4, color: '9CA3AF' },
  bottom: { style: BorderStyle.SINGLE, size: 4, color: '9CA3AF' },
  left:   { style: BorderStyle.SINGLE, size: 4, color: '9CA3AF' },
  right:  { style: BorderStyle.SINGLE, size: 4, color: '9CA3AF' },
};

const cellBorder = {
  top:    { style: BorderStyle.SINGLE, size: 2, color: 'E5E7EB' },
  bottom: { style: BorderStyle.SINGLE, size: 2, color: 'E5E7EB' },
  left:   { style: BorderStyle.SINGLE, size: 2, color: 'E5E7EB' },
  right:  { style: BorderStyle.SINGLE, size: 2, color: 'E5E7EB' },
};

function docxCell(
  text: string,
  opts: { header?: boolean; ok?: boolean; fail?: boolean; bold?: boolean; align?: typeof AlignmentType[keyof typeof AlignmentType] } = {},
): TableCell {
  const { header, ok, fail, bold, align } = opts;
  const fill = header
    ? { type: ShadingType.SOLID, fill: '1E3A5F', color: '1E3A5F' }
    : ok
    ? { type: ShadingType.SOLID, fill: OK_BG, color: OK_BG }
    : fail
    ? { type: ShadingType.SOLID, fill: FAIL_BG, color: FAIL_BG }
    : undefined;
  return new TableCell({
    borders: cellBorder,
    shading: fill,
    verticalAlign: VerticalAlign.CENTER,
    children: [
      new Paragraph({
        alignment: align ?? AlignmentType.CENTER,
        children: [
          new TextRun({
            text,
            bold: bold || header,
            size: header ? 16 : 16,
            color: header
              ? 'FFFFFF'
              : ok
              ? OK_TEXT
              : fail
              ? FAIL_TEXT
              : '1A202C',
          }),
        ],
      }),
    ],
  });
}

function docxHRow(cols: string[]): TableRow {
  return new TableRow({ children: cols.map((c) => docxCell(c, { header: true })), tableHeader: true });
}

function docxDRow(cols: string[]): TableRow {
  return new TableRow({
    children: cols.map((c) =>
      c === 'Adequate'
        ? docxCell(c, { ok: true })
        : c === 'Inadequate'
        ? docxCell(c, { fail: true })
        : docxCell(c),
    ),
  });
}

function docxTable(headers: string[], rows: string[][]): Table {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: tblBorder,
    rows: [docxHRow(headers), ...rows.map(docxDRow)],
  });
}

function docxSectionTitle(text: string): Paragraph {
  return new Paragraph({
    spacing: { before: 280, after: 100 },
    children: [
      new TextRun({
        text,
        bold: true,
        size: 24,
        color: RED,
        underline: { type: UnderlineType.SINGLE, color: RED },
      }),
    ],
  });
}

function docxSubtitle(text: string): Paragraph {
  return new Paragraph({
    spacing: { before: 160, after: 60 },
    children: [new TextRun({ text, bold: true, size: 20, color: '1A202C' })],
  });
}

function docxPara(text: string, opts: { size?: number; color?: string; bold?: boolean; italic?: boolean; align?: typeof AlignmentType[keyof typeof AlignmentType] } = {}): Paragraph {
  return new Paragraph({
    alignment: opts.align ?? AlignmentType.LEFT,
    spacing: { after: 80 },
    children: [
      new TextRun({
        text,
        bold: opts.bold,
        italics: opts.italic,
        size: opts.size ?? 20,
        color: opts.color ?? '1A202C',
      }),
    ],
  });
}

function pageBreak(): Paragraph {
  return new Paragraph({ children: [new PageBreak()] });
}

// ── docx header (logo left, title center, computation block right) ──

function docxHeader(projectName: string, subtitle: string, byUser: string, date: string): Header {
  let rocksolBuf: Buffer | null = null;
  try { rocksolBuf = fs.readFileSync(LOGO_ROCKSOL); } catch { /* ignore */ }

  const leftCell = new TableCell({
    width: { size: 25, type: WidthType.PERCENTAGE },
    borders: {
      top: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
      bottom: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
      left: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
      right: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
    },
    children: [
      new Paragraph({
        children: rocksolBuf
          ? [new ImageRun({ type: 'jpg', data: rocksolBuf, transformation: { width: 90, height: 27 } })]
          : [new TextRun({ text: '', size: 16 })],
      }),
    ],
  });
  const centerCell = new TableCell({
    width: { size: 50, type: WidthType.PERCENTAGE },
    borders: {
      top: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
      bottom: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
      left: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
      right: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
    },
    children: [
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: projectName, bold: true, size: 20 })],
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: subtitle, size: 20 })],
      }),
    ],
  });
  const rightCell = new TableCell({
    width: { size: 25, type: WidthType.PERCENTAGE },
    borders: {
      top: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
      bottom: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
      left: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
      right: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
    },
    children: [
      new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: 'Computation', size: 18 })] }),
      new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: `By: ${byUser}`, size: 18 })] }),
      new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: date, size: 18 })] }),
    ],
  });
  const table = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
      bottom: { style: BorderStyle.SINGLE, size: 4, color: '9CA3AF' },
      left: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
      right: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
      insideHorizontal: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
      insideVertical: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
    },
    rows: [new TableRow({ children: [leftCell, centerCell, rightCell] })],
  });
  return new Header({ children: [table] });
}

function docxFooter(): Footer {
  return new Footer({
    children: [
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [
          new TextRun({ children: [PageNumber.CURRENT], size: 18, color: '4A5568' }),
        ],
      }),
    ],
  });
}

// ── docx: Cover page children ──

function docxCoverChildren(data: ProjectReportData): DocChild[] {
  let muller: Buffer | null = null;
  let cdot: Buffer | null = null;
  let rocksol: Buffer | null = null;
  try { muller = fs.readFileSync(LOGO_MULLER); } catch { /* ignore */ }
  try { cdot = fs.readFileSync(LOGO_CDOT); } catch { /* ignore */ }
  try { rocksol = fs.readFileSync(LOGO_ROCKSOL); } catch { /* ignore */ }

  const logoCell = (buf: Buffer | null, w: number, h: number, align: typeof AlignmentType[keyof typeof AlignmentType]) =>
    new TableCell({
      borders: {
        top: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
        bottom: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
        left: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
        right: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
      },
      children: [
        new Paragraph({
          alignment: align,
          children: buf
            ? [new ImageRun({ type: 'jpg', data: buf, transformation: { width: w, height: h } })]
            : [new TextRun({ text: '' })],
        }),
      ],
    });

  const logoRow = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
      bottom: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
      left: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
      right: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
      insideHorizontal: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
      insideVertical: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
    },
    rows: [
      new TableRow({
        children: [
          logoCell(muller, 110, 24, AlignmentType.LEFT),
          logoCell(cdot, 140, 32, AlignmentType.CENTER),
          logoCell(rocksol, 110, 27, AlignmentType.RIGHT),
        ],
      }),
    ],
  });

  const children: DocChild[] = [
    logoRow,
    docxPara(data.projectName, { size: 36, bold: true, align: AlignmentType.CENTER }),
    docxPara(data.projectLocation, { size: 24, color: '4A5568', align: AlignmentType.CENTER }),
  ];
  if (data.projectDescription) {
    children.push(docxPara(data.projectDescription, { size: 20, italic: true, align: AlignmentType.CENTER }));
  }
  children.push(new Paragraph({ spacing: { after: 480 } }));

  children.push(new Paragraph({
    spacing: { before: 240, after: 120 },
    children: [new TextRun({ text: 'MSE Retaining Walls: Design Calculations', bold: true, size: 24 })],
  }));

  // TOC
  const tocRows: string[][] = [];
  tocRows.push(['Summary of Design Checks', '2']);
  tocRows.push(['Designs Overview', '3']);
  let p = 4;
  for (const ds of data.designs) {
    tocRows.push([designLabel(ds), String(p)]);
    p += estimatePages(ds);
  }
  children.push(new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: tblBorder,
    rows: [
      docxHRow(['Section', 'Page']),
      ...tocRows.map((r) => docxDRow(r)),
    ],
  }));

  children.push(new Paragraph({ spacing: { before: 720 } }));
  children.push(docxPara(`Generated by: ${data.generatedBy}`, { size: 20, color: '4A5568', align: AlignmentType.CENTER }));
  children.push(docxPara(`Date: ${fmtDate(data.generatedAt)}`, { size: 20, color: '4A5568', align: AlignmentType.CENTER }));
  return children;
}

// ── docx: per-design children ──

function docxExternalChildren(ds: ExternalDesignSection): DocChild[] {
  const { rows, params } = ds;
  return [
    docxSectionTitle(designLabel(ds)),
    docxPara(`Type: ${ds.designTypeName}   |   Created by: ${ds.createdBy}`, { color: '4A5568', size: 18 }),

    docxSubtitle('Input Parameters'),
    docxTable(['Parameter', 'Value'], Object.entries(params)),

    docxSectionTitle('Summary of Loads'),
    docxTable(
      ['DH (ft)', 'RL (ft)', 'h_eq', 'P_LS.V', 'P_EV', 'M_LS.V', 'M_EV', 'P_LS.H', 'P_EH', 'P_EQ', 'M_LS.H', 'M_EH', 'M_EQ'],
      rows.map((r) => [N(r.dh, 2), N(r.rl, 2), N(r.hEq, 2), N(r.pLsV), N(r.pEv), N(r.mLsV), N(r.mEv), N(r.pLsH), N(r.pEh), N(r.pEq), N(r.mLsH), N(r.mEh), N(r.mEq)]),
    ),

    docxSectionTitle('Load Combinations'),
    docxTable(
      ['DH', 'Pu Ser-I V', 'Mu Ser-I V', 'Pu Str-I V', 'Mu Str-I V', 'Pu EE-I V', 'Mu EE-I V', 'Pu Ser-I L', 'Mu Ser-I L', 'Pu Str-I L', 'Mu Str-I L', 'Pu EE-I L', 'Mu EE-I L'],
      rows.map((r) => [N(r.dh, 2), N(r.puSerIV), N(r.muSerIV), N(r.puStrIV), N(r.muStrIV), N(r.puEeIV), N(r.muEeIV), N(r.puSerILat), N(r.muSerILat), N(r.puStrILat), N(r.muStrILat), N(r.puEeILat), N(r.muEeILat)]),
    ),

    docxSectionTitle('External Stability — Strength I'),
    docxTable(
      ['DH', 'ecc Brg', 'Su Brg', 'Brg', 'ecc Ovt', 'Ovt', 'φRr Cl.1', 'φRr F.S', 'Sld Cl.1', 'Sld F.S'],
      rows.map((r) => [N(r.dh, 2), N(r.eccBrgStrI), N(r.suBrgStrI), r.checkBrgStrI, N(r.eccOvtStrI), r.checkOvtStrI, N(r.phiRrStrIClass1), N(r.phiRrStrIFSoil), r.checkSldStrIClass1, r.checkSldStrIFSoil]),
    ),

    docxSectionTitle('External Stability — Extreme Event I'),
    docxTable(
      ['DH', 'ecc Brg', 'Su Brg', 'Brg', 'ecc Ovt', 'Ovt', 'φRr Cl.1', 'φRr F.S', 'Sld Cl.1', 'Sld F.S'],
      rows.map((r) => [N(r.dh, 2), N(r.eccBrgEeI), N(r.suBrgEeI), r.checkBrgEeI, N(r.eccOvtEeI), r.checkOvtEeI, N(r.phiRrEeIClass1), N(r.phiRrEeIFSoil), r.checkSldEeIClass1, r.checkSldEeIFSoil]),
    ),

    docxSectionTitle('External Stability — Service I'),
    docxTable(
      ['DH (ft)', 'ecc Brg', 'Su Brg', 'Bearing Check'],
      rows.map((r) => [N(r.dh, 2), N(r.eccBrgSerI), N(r.suBrgSerI), r.checkBrgSerI]),
    ),

    docxSectionTitle('Percentage Demand (%)'),
    docxTable(
      ['DH', 'Brg Str', 'Brg EE', 'Brg Ser', 'Ovt Str', 'Ovt EE', 'Sld Str', 'Sld EE', 'Ctrl %', 'Controls'],
      rows.map((r) => [N(r.dh, 2), N(r.demBrgStrI, 1), N(r.demBrgEeI, 1), N(r.demBrgSerI, 1), N(r.demOvtStrI, 1), N(r.demOvtEeI, 1), N(r.demSldStrI, 1), N(r.demSldEeI, 1), N(r.demCtrl, 1), r.limitState]),
    ),

    docxSectionTitle('Demand Summary'),
    docxTable(
      ['DH (ft)', 'RL (ft)', 'NL', 'Ctrl % Demand', 'Controlling Limit State'],
      rows.map((r) => [N(r.dh, 2), N(r.rl, 2), String(r.nl), N(r.demCtrl, 1), r.limitState]),
    ),
  ];
}

async function docxInternalChildren(ds: InternalDesignSection): Promise<DocChild[]> {
  const { rows, params } = ds;
  const chartPng = await renderLtdsChartPng(rows);

  return [
    docxSectionTitle(designLabel(ds)),
    docxPara(`Type: ${ds.designTypeName}   |   Created by: ${ds.createdBy}`, { color: '4A5568', size: 18 }),

    docxSubtitle('Input Parameters'),
    docxTable(['Parameter', 'Value'], Object.entries(params)),

    docxSectionTitle('Stress / Load Determination at Reinforcement Level'),
    docxTable(
      ['DH (ft)', 'RL (ft)', 'z (ft)', 'σEV.Z (ksf)', 'h_eq (ft)', 'σLS.Z (ksf)', 'ωIR', 'ωAE', 'ωEQ.1', 'ωEQ.2', 'PEQ', 'σEQ'],
      rows.map((r) => [N(r.dh, 2), N(r.rl, 2), N(r.z, 2), N(r.sEvZ), N(r.hEq, 1), N(r.sLsZ), N(r.wIr, 3), N(r.wAe, 3), N(r.wEq1, 3), N(r.wEq2, 3), N(r.pEq, 3), N(r.sEq, 3)]),
    ),

    docxSectionTitle('Geosynthetic Strip'),
    docxTable(
      ['z (ft)', 'σV Str-I', 'σH Str-I', 'σV EE-I', 'σH EE-I', 'Tmax Str-I', 'Tmax EE-I', 'lE Str-I', 'lE EE-I', 'lE', 'lA', 'RL min', 'LTDS', 'PO'],
      rows.map((r) => [N(r.z, 2), N(r.sVStrI), N(r.sHStrI), N(r.sVEeI), N(r.sHEeI), N(r.tMaxStrIGstrip), N(r.tMaxEeIGstrip), N(r.lEStrIGs, 3), N(r.lEEeIGs, 3), N(r.lEGeostrip, 3), N(r.lAGs, 3), N(r.rlMinGeostrip, 3), N(r.ltdsGeostrip, 0), r.poGeostripCheck]),
    ),

    docxSectionTitle('Geosynthetic Grid'),
    docxTable(
      ['z (ft)', 'σV Str-I', 'σH Str-I', 'σV EE-I', 'σH EE-I', 'Tmax Str-I', 'Tmax EE-I', 'lE Str-I', 'lE EE-I', 'lE', 'lA', 'RL min', 'LTDS', 'PO'],
      rows.map((r) => [N(r.z, 2), N(r.sVStrI), N(r.sHStrI), N(r.sVEeI), N(r.sHEeI), N(r.tMaxStrIGgrid), N(r.tMaxEeIGgrid), N(r.lEStrIGg, 3), N(r.lEEeIGg, 3), N(r.lEGeogrid, 3), N(r.lAGg, 3), N(r.rlMinGeogrid, 3), N(r.ltdsGeogrid, 0), r.poGeogridCheck]),
    ),

    docxSectionTitle('Metallic Grid'),
    docxTable(
      ['z (ft)', "F'", 'kR.Sg', 'σV Str', 'σH Str', 'σV EE', 'σH EE', 'Tmax Str', 'Tmax EE', 'lE Str', 'lE EE', 'lE', 'lA', 'RL min', 'LTDS', 'PO'],
      rows.map((r) => [N(r.z, 2), N(r.fpMg), N(r.krSg), N(r.sVStrIMg), N(r.sHStrIMg), N(r.sVEeIMg), N(r.sHEeIMg), N(r.tMaxStrISg), N(r.tMaxEeISg), N(r.lEStrIMg, 3), N(r.lEEeIMg, 3), N(r.lESg, 3), N(r.lASg, 2), N(r.rlMinSg, 3), N(r.ltdsSg, 0), r.poSgCheck]),
    ),

    docxSectionTitle('Ribbed Metallic Strip'),
    docxTable(
      ['z (ft)', "F'", 'kR.Ss', 'σV Str', 'σH Str', 'σV EE', 'σH EE', 'Tmax Str', 'Tmax EE', 'lE Str', 'lE EE', 'lE', 'lA', 'RL min', 'LTDS', 'PO'],
      rows.map((r) => [N(r.z, 2), N(r.fpSs), N(r.krSs), N(r.sVStrISs), N(r.sHStrISs), N(r.sVEeISs), N(r.sHEeISs), N(r.tMaxStrISs), N(r.tMaxEeISs), N(r.lEStrISs, 3), N(r.lEEeISs, 3), N(r.lESs, 3), N(r.lASs, 2), N(r.rlMinSs, 3), N(r.ltdsSs, 0), r.poSsCheck]),
    ),

    docxSectionTitle('Required Factored Long Term Design Strength, LTDS (lb/ft)'),
    docxTable(
      ['z (ft)', 'Geostrip Str-I', 'Geogrid Str-I', 'Met.Grid Str-I', 'Rib.Strip Str-I', 'Geostrip EE-I', 'Geogrid EE-I', 'Met.Grid EE-I', 'Rib.Strip EE-I'],
      rows.map((r) => [N(r.z, 2), N(r.ltdsGeostrip, 0), N(r.ltdsGeogrid, 0), N(r.ltdsSg, 0), N(r.ltdsSs, 0), N(r.ltdsEeIGs, 0), N(r.ltdsEeIGg, 0), N(r.ltdsEeISg, 0), N(r.ltdsEeISs, 0)]),
    ),

    docxSectionTitle('Internal Design Summary — LTDS Chart'),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 120, after: 120 },
      children: [new ImageRun({ type: 'png', data: chartPng, transformation: { width: 500, height: 333 } })],
    }),
  ];
}

function docxPanelFaceChildren(ds: PanelFaceDesignSection): DocChild[] {
  const r = ds.result;
  const inputs = ds.inputs;
  const MMin_pos_raw = Math.min(1.33 * r.MU_pos, 1.6 * 0.67 * r.Mcr);
  const MMin_neg_raw = Math.min(1.33 * r.MU_neg, 1.6 * 0.67 * r.Mcr);

  return [
    docxSectionTitle(designLabel(ds)),
    docxPara(`Type: ${ds.designTypeName}   |   Created by: ${ds.createdBy}`, { color: '4A5568', size: 18 }),

    docxSubtitle('Input Parameters'),
    docxTable(['Parameter', 'Value'], Object.entries(ds.params)),

    docxSectionTitle('Factored Load on Panel'),
    docxTable(
      ['HU.Str.Panel (kip/ft)', 'HU.EE.Panel (kip/ft)', 'HU.Panel (kip/ft)', 'MU.Panel.+ve (kip·ft)', 'MU.Panel.-ve (kip·ft)', 'VU.Panel (kip)'],
      [[N(inputs.huStr), N(inputs.huEe), N(r.HU_panel), N(r.MU_pos), N(r.MU_neg), N(r.VU_panel)]],
    ),

    docxSectionTitle('Concrete Cracking Moment'),
    docxTable(
      ['fRupture (ksi)', 'SPanel (in³)', 'MCR (kip·ft)'],
      [[N(r.fr), N(r.St, 2), N(r.Mcr)]],
    ),

    docxSectionTitle('Minimum Applied Moment & Factored Ultimate Moment'),
    docxTable(
      ['MMin.Pos (kip·ft)', 'MMin.Neg (kip·ft)', 'MU.+ve governing', 'MU.-ve governing', 'VU.Panel (kip)'],
      [[N(MMin_pos_raw), N(MMin_neg_raw), N(r.MMin_pos), N(r.MMin_neg), N(r.VU_panel)]],
    ),

    docxSectionTitle('Flexural Capacity'),
    docxTable(
      ['Direction', 'β1', 'α1', 'c (in)', 'a (in)', 'εt', 'φf', 'MN', 'φMN', 'MU', 'φMN/MU', 'Reinforcement', 'Check'],
      [
        ['Hor +ve', N(r.beta1), N(r.alpha1), N(r.C_HorPos), N(r.a_HorPos), N(r.et_HorPos, 5), N(r.phi_f_HorPos), N(r.MN_pos_Hor), N(r.phiMN_pos_Hor), N(r.MMin_pos), N(r.phiMN_pos_Hor / r.MMin_pos, 3), `#${inputs.barNumHor}@${inputs.spacingHor}`, r.check_HorPos_flex],
        ['Vert +ve', N(r.beta1), N(r.alpha1), N(r.C_VertPos), N(r.a_VertPos), N(r.et_VertPos, 5), N(r.phi_f_VertPos), N(r.MN_pos_Vert), N(r.phiMN_pos_Vert), N(r.MMin_pos), N(r.phiMN_pos_Vert / r.MMin_pos, 3), `#${inputs.barNumVert}@${inputs.spacingVert}`, r.check_VertPos_flex],
        ['Hor -ve', N(r.beta1), N(r.alpha1), N(r.C_HorNeg), N(r.a_HorNeg), N(r.et_HorNeg, 5), N(r.phi_f_HorNeg), N(r.MN_neg_Hor), N(r.phiMN_neg_Hor), N(r.MMin_neg), N(r.phiMN_neg_Hor / r.MMin_neg, 3), `#${inputs.barNumHor}@${inputs.spacingHor}`, r.check_HorNeg_flex],
        ['Vert -ve', N(r.beta1), N(r.alpha1), N(r.C_VertNeg), N(r.a_VertNeg), N(r.et_VertNeg, 5), N(r.phi_f_VertNeg), N(r.MN_neg_Vert), N(r.phiMN_neg_Vert), N(r.MMin_neg), N(r.phiMN_neg_Vert / r.MMin_neg, 3), `#${inputs.barNumVert}@${inputs.spacingVert}`, r.check_VertNeg_flex],
      ],
    ),

    docxSectionTitle('Service I: Crack Control'),
    docxTable(
      ['Direction', 'SB (in)', 'γEV.Str.I', 'a (in)', 'γe', 'fSS (ksi)', 'dC (in)', 'βS', 'sMax.Crack (in)', 'Check'],
      [
        ['Horizontal', N(inputs.spacingHor, 3), '1.35', N(r.a_HorPos), '1.0', N(r.fs_Hor), N(r.dc_Hor), N(r.Vs_Hor), N(r.Smax_Hor), r.check_crack_Hor],
        ['Vertical', N(inputs.spacingVert, 3), '1.35', N(r.a_VertPos), '1.0', N(r.fs_Vert), N(r.dc_Vert), N(r.Vs_Vert), N(r.Smax_Vert), r.check_crack_Vert],
      ],
    ),

    docxSectionTitle('Strength I: Shear Capacity'),
    docxTable(
      ['VU.Panel (kip)', 'φV', 'β', 'VN.1 (kip)', 'VN.2 (kip)', 'VN.Panel (kip)', 'φVN.Panel (kip)', 'φVN/VU', 'Check'],
      [[N(r.VU_panel), '0.9', '2', N(r.Vc), N(r.Vc_max), N(Math.min(r.Vc, r.Vc_max)), N(r.phiVc), N(r.phiVc / r.VU_panel), r.check_shear]],
    ),
  ];
}

// ── Summary table for docx (page 2) ──

function docxSummaryChildren(data: ProjectReportData): DocChild[] {
  const allRows: string[][] = [];
  for (const ds of data.designs) {
    const label = designLabel(ds);
    if (ds.kind === 'external') allRows.push(...externalSummaryRows(label, ds.rows));
    else if (ds.kind === 'internal') allRows.push(...internalSummaryRows(label, ds.rows));
    else allRows.push(...panelSummaryRows(label, ds.result));
  }
  return [
    docxPara('Summary of Design Checks', { size: 28, bold: true, align: AlignmentType.CENTER }),
    new Paragraph({ spacing: { after: 200 } }),
    docxTable(
      ['Wall Type / Configuration', 'Limit State Checked', 'Load Combination', 'Results are Adequate', 'Result'],
      allRows,
    ),
  ];
}

function docxOverviewChildren(data: ProjectReportData): DocChild[] {
  return [
    docxPara('Designs Overview', { size: 28, bold: true, align: AlignmentType.CENTER }),
    new Paragraph({ spacing: { after: 200 } }),
    docxTable(
      ['#', 'Design Type', 'Name', 'Created By'],
      data.designs.map((ds, i) => [String(i + 1), ds.designTypeName, ds.designName ?? '—', ds.createdBy]),
    ),
  ];
}

// ── Main docx generator ──

export async function generateProjectDocx(data: ProjectReportData): Promise<Buffer> {
  const dateStr = fmtDate(data.generatedAt);

  // Cover section (no header on first page)
  const coverSection = {
    properties: {
      page: {
        margin: { top: 720, right: 720, bottom: 720, left: 720 },
      },
      titlePage: true,
    },
    headers: {
      first: new Header({ children: [new Paragraph({ children: [] })] }),
      default: docxHeader(data.projectName, 'MSE Wall Design Calculations', data.generatedBy, dateStr),
    },
    footers: {
      first: new Footer({ children: [new Paragraph({ children: [] })] }),
      default: docxFooter(),
    },
    children: docxCoverChildren(data),
  };

  // Body section (header + footer)
  const bodyChildren: DocChild[] = [];
  bodyChildren.push(...docxSummaryChildren(data));
  bodyChildren.push(pageBreak());
  bodyChildren.push(...docxOverviewChildren(data));

  for (const ds of data.designs) {
    bodyChildren.push(pageBreak());
    if (ds.kind === 'external') {
      bodyChildren.push(...docxExternalChildren(ds));
    } else if (ds.kind === 'internal') {
      const ch = await docxInternalChildren(ds);
      bodyChildren.push(...ch);
    } else {
      bodyChildren.push(...docxPanelFaceChildren(ds));
    }
  }

  const bodySection = {
    properties: {
      page: {
        margin: { top: 1700, right: 720, bottom: 1100, left: 720 },
      },
    },
    headers: {
      default: docxHeader(data.projectName, 'MSE Wall Design Calculations', data.generatedBy, dateStr),
    },
    footers: {
      default: docxFooter(),
    },
    children: bodyChildren,
  };

  const doc = new Document({
    creator: data.generatedBy,
    sections: [coverSection, bodySection],
  });

  return Packer.toBuffer(doc);
}
