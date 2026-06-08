import {
  AlignmentType,
  BorderStyle,
  Document,
  type FileChild,
  Footer,
  Header,
  HeadingLevel,
  HeightRule,
  type ISectionOptions,
  ImageRun,
  Math as OfficeMath,
  type MathComponent,
  MathFraction,
  MathRoundBrackets,
  MathRun,
  MathSubScript,
  MathSuperScript,
  SectionType,
  PageBreak,
  PageNumber,
  Packer,
  Paragraph,
  ShadingType,
  Table,
  TableCell,
  TableLayoutType,
  TableRow,
  TextRun,
  UnderlineType,
  VerticalAlign,
  VerticalAlignTable,
  WidthType,
  XmlComponent,
} from 'docx';
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

class OMathElement extends XmlComponent {
  constructor(rootKey: string, attrs?: Record<string, string>, children: (XmlComponent | string)[] = []) {
    super(rootKey);
    if (attrs) this.addChildElement({ _attr: attrs } as unknown as XmlComponent);
    for (const child of children) this.addChildElement(child);
  }
}

// ─── Constants ────────────────────────────────────────────────────────────────

const RED = 'C00000';
const OK_BG = 'D1FAE5';
const OK_TEXT = '065F46';
const FAIL_BG = 'FEE2E2';
const FAIL_TEXT = '991B1B';

const ASSETS_DIR = path.join(process.cwd(), 'lib', 'reports', 'assets');
const LOGO_ROCKSOL = path.join(ASSETS_DIR, 'logo-rocksol.jpg');
const LOGO_MULLER = path.join(ASSETS_DIR, 'logo-muller.jpg');
const LOGO_CDOT = path.join(ASSETS_DIR, 'logo-cdot.jpg');
const CDOT_LOGO_PNG = path.join(process.cwd(), 'cdot-logo.png');

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

function estimatePages(d: DesignSection): number {
  if (d.kind === 'external') return 4;
  if (d.kind === 'internal') return 6;
  return 3;
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

async function renderLtdsChartPng(rows: InternalStabilityRow[]): Promise<Buffer | null> {
  try {
    const zValues = rows.map((r) => r.z);
    const maxZ = Math.max(...zValues);
    const make = (ltds: number[]) => ltds.map((v, i) => ({ x: v / 1000, y: zValues[i] }));
    const chartConfig = {
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
    };
    const res = await fetch('https://quickchart.io/chart', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chart: chartConfig, width: 900, height: 600, backgroundColor: 'white' }),
    });
    if (!res.ok) return null;
    return Buffer.from(await res.arrayBuffer());
  } catch {
    return null;
  }
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
    ...(chartPng
      ? [new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 120, after: 120 },
          children: [new ImageRun({ type: 'png', data: chartPng, transformation: { width: 500, height: 333 } })],
        })]
      : []),
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
  const noBorder = {
    top: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
    bottom: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
    left: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
    right: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
    insideHorizontal: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
    insideVertical: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
  };

  const p = (
    text = '',
    opts: {
      size?: number;
      bold?: boolean;
      align?: typeof AlignmentType[keyof typeof AlignmentType];
      before?: number;
      after?: number;
      indent?: number;
      color?: string;
      line?: number;
      heading?: typeof HeadingLevel[keyof typeof HeadingLevel];
    } = {},
  ) =>
    new Paragraph({
      heading: opts.heading,
      alignment: opts.align ?? AlignmentType.LEFT,
      indent: opts.indent ? { left: opts.indent } : undefined,
      spacing: { before: opts.before ?? 0, after: opts.after ?? 0, line: opts.line ?? 235 },
      children: [new TextRun({ text, size: opts.size ?? 22, bold: opts.bold, color: opts.color ?? '000000' })],
    });

  const blank = (after: number) => new Paragraph({ spacing: { before: 0, after }, children: [] });
  const tocRow = (left: string, right: string, opts: { bold?: boolean; indent?: number; after?: number } = {}) =>
    new TableRow({
      children: [
        new TableCell({
          width: { size: 7600, type: WidthType.DXA },
          borders: noBorder,
          children: [p(left, { size: 22, bold: opts.bold, indent: opts.indent, after: opts.after ?? 0 })],
        }),
        new TableCell({
          width: { size: 1300, type: WidthType.DXA },
          borders: noBorder,
          children: [p(right, { size: 22, bold: opts.bold, align: AlignmentType.LEFT, after: opts.after ?? 0 })],
        }),
      ],
    });

  const designTypeText = (design: DesignSection) => design.designTypeName.toLowerCase();
  const isAbutmentSection = (design: DesignSection) => designTypeText(design).includes('abutment');
  const isWingSection = (design: DesignSection) => designTypeText(design).includes('wing');
  const hasAbutment = data.designs.some(isAbutmentSection);
  const hasWing = data.designs.some(isWingSection);
  const hasObstruction = data.designs.some((design) => designTypeText(design).includes('obstruction'));
  const hasPanelFace = data.designs.some((design) => design.kind === 'panel_face');
  const wallTitle =
    hasAbutment && hasWing
      ? 'MSE Retaining Walls: Abutment and Wing Walls'
      : hasWing
      ? 'MSE Retaining Walls: Wing Walls'
      : 'MSE Retaining Walls: Abutment Walls';

  const wallRows: TableRow[] = [];
  const addWallRows = (title: string, after = 0) => {
    wallRows.push(tocRow(title, '4-51'));
    wallRows.push(tocRow('Geometry', '4-6', { indent: 500 }));
    wallRows.push(tocRow('Loads', '7-13', { indent: 500 }));
    wallRows.push(tocRow('External Stability', '14-19', { indent: 500 }));
    wallRows.push(tocRow('Internal Stability', '20-33', { indent: 500, after }));
  };

  if (hasAbutment) addWallRows('Abutment MSE Walls', hasWing || hasObstruction || hasPanelFace ? 230 : 0);
  if (hasWing) addWallRows('Wing MSE Walls', hasObstruction || hasPanelFace ? 230 : 0);
  if (!hasAbutment && !hasWing) addWallRows('Abutment MSE Walls', hasObstruction || hasPanelFace ? 230 : 0);
  if (hasObstruction) wallRows.push(tocRow('Soil Reinforcement Connection around Obstruction', '34-41'));
  if (hasPanelFace) wallRows.push(tocRow('Precast Panel Facing', '42-51'));

  const summaryBorder = {
    top: { style: BorderStyle.SINGLE, size: 6, color: '000000' },
    bottom: { style: BorderStyle.SINGLE, size: 6, color: '000000' },
    left: { style: BorderStyle.SINGLE, size: 6, color: '000000' },
    right: { style: BorderStyle.SINGLE, size: 6, color: '000000' },
  };
  const summaryColumnWidths = [1960, 2120, 2640, 2640];
  const summaryP = (
    children: string | TextRun[],
    opts: { bold?: boolean; align?: typeof AlignmentType[keyof typeof AlignmentType]; size?: number } = {},
  ) =>
    new Paragraph({
      alignment: opts.align ?? AlignmentType.LEFT,
      spacing: { before: 0, after: 0, line: 230 },
      children:
        typeof children === 'string'
          ? [new TextRun({ text: children, size: opts.size ?? 20, bold: opts.bold })]
          : children,
    });
  const equation = (...runs: TextRun[]) => summaryP(runs, { size: 18 });
  const eqText = (text: string, subScript = false) => new TextRun({ text, size: 18, subScript });
  const summaryCell = (
    children: string | Paragraph | Paragraph[],
    opts: {
      columnSpan?: number;
      rowSpan?: number;
      width?: number;
      bold?: boolean;
      align?: typeof AlignmentType[keyof typeof AlignmentType];
      verticalAlign?: typeof VerticalAlignTable[keyof typeof VerticalAlignTable];
      size?: number;
      margins?: { top?: number; bottom?: number; left?: number; right?: number };
    } = {},
  ) =>
    new TableCell({
      width: opts.width ? { size: opts.width, type: WidthType.DXA } : undefined,
      columnSpan: opts.columnSpan,
      rowSpan: opts.rowSpan,
      verticalAlign: opts.verticalAlign ?? VerticalAlignTable.CENTER,
      borders: summaryBorder,
      margins: opts.margins ?? { top: 60, bottom: 60, left: 50, right: 50 },
      children: typeof children === 'string' ? [summaryP(children, opts)] : Array.isArray(children) ? children : [children],
    });
  const summaryRow = (cells: TableCell[], height = 360) =>
    new TableRow({
      height: { value: height, rule: HeightRule.ATLEAST },
      children: cells,
    });
  const summaryCheckRows = (wallLabel: string): TableRow[] => [
    summaryRow([
      summaryCell(wallLabel, { rowSpan: 10, width: summaryColumnWidths[0], align: AlignmentType.CENTER }),
      summaryCell('External Stability, Bearing', { rowSpan: 4, width: summaryColumnWidths[1], align: AlignmentType.CENTER }),
      summaryCell('Strength I', { width: summaryColumnWidths[2] }),
      summaryCell(equation(eqText('φq'), eqText('n', true), eqText(' ≥ σ'), eqText('u', true)), { width: summaryColumnWidths[3] }),
    ]),
    summaryRow([
      summaryCell('Extreme Event I'),
      summaryCell(equation(eqText('φq'), eqText('n', true), eqText(' ≥ σ'), eqText('u', true))),
    ]),
    summaryRow([
      summaryCell('Extreme Event II'),
      summaryCell(equation(eqText('φq'), eqText('n', true), eqText(' ≥ σ'), eqText('u', true))),
    ]),
    summaryRow([
      summaryCell('Service I'),
      summaryCell(equation(eqText('ABC ≥ σ'), eqText('u', true))),
    ]),
    summaryRow([
      summaryCell([summaryP('External Stability,'), summaryP('Eccentricity as an'), summaryP('Indication of Overturning')], {
        rowSpan: 3,
        align: AlignmentType.CENTER,
      }),
      summaryCell('Strength I'),
      summaryCell(equation(eqText('e'), eqText('allowable', true), eqText(' ≥ e'), eqText('actual', true))),
    ]),
    summaryRow([
      summaryCell('Extreme Event I'),
      summaryCell(equation(eqText('e'), eqText('allowable', true), eqText(' ≥ e'), eqText('actual', true))),
    ]),
    summaryRow([
      summaryCell('Extreme Event II'),
      summaryCell(equation(eqText('e'), eqText('allowable', true), eqText(' ≥ e'), eqText('actual', true))),
    ]),
    summaryRow([
      summaryCell('External Stability, Sliding', { rowSpan: 3, align: AlignmentType.CENTER }),
      summaryCell('Strength I'),
      summaryCell(equation(eqText('φR'), eqText('n', true), eqText(' ≥ H'), eqText('u', true))),
    ]),
    summaryRow([
      summaryCell('Extreme Event I'),
      summaryCell(equation(eqText('φR'), eqText('n', true), eqText(' ≥ H'), eqText('u', true))),
    ]),
    summaryRow([
      summaryCell('Extreme Event II'),
      summaryCell(equation(eqText('φR'), eqText('n', true), eqText(' ≥ H'), eqText('u', true))),
    ]),
  ];
  const panelSummaryRows: TableRow[] = [
    summaryRow([
      summaryCell('Precast Panel Facing', { rowSpan: 10, width: summaryColumnWidths[0], align: AlignmentType.CENTER }),
      summaryCell([summaryP('Positive Flexure, horizontal', { align: AlignmentType.CENTER }), summaryP('and vertical', { align: AlignmentType.CENTER })], {
        rowSpan: 3,
        width: summaryColumnWidths[1],
        align: AlignmentType.CENTER,
      }),
      summaryCell('Strength I', { width: summaryColumnWidths[2] }),
      summaryCell(equation(eqText('φM'), eqText('n', true), eqText(' ≥ M'), eqText('u', true)), { width: summaryColumnWidths[3] }),
    ]),
    summaryRow([
      summaryCell('Extreme Event I'),
      summaryCell(equation(eqText('φM'), eqText('n', true), eqText(' ≥ M'), eqText('u', true))),
    ]),
    summaryRow([
      summaryCell('Extreme Event II'),
      summaryCell(equation(eqText('φM'), eqText('n', true), eqText(' ≥ M'), eqText('u', true))),
    ]),
    summaryRow([
      summaryCell([summaryP('Negative Flexure,', { align: AlignmentType.CENTER }), summaryP('horizontal and negative', { align: AlignmentType.CENTER })], {
        rowSpan: 3,
        align: AlignmentType.CENTER,
      }),
      summaryCell('Strength I'),
      summaryCell(equation(eqText('φM'), eqText('n', true), eqText(' ≥ M'), eqText('u', true))),
    ]),
    summaryRow([
      summaryCell('Extreme Event I'),
      summaryCell(equation(eqText('φM'), eqText('n', true), eqText(' ≥ M'), eqText('u', true))),
    ]),
    summaryRow([
      summaryCell('Extreme Event II'),
      summaryCell(equation(eqText('φM'), eqText('n', true), eqText(' ≥ M'), eqText('u', true))),
    ]),
    summaryRow([
      summaryCell('Cracking', { align: AlignmentType.CENTER }),
      summaryCell('Service I'),
      summaryCell(equation(eqText('s'), eqText('actual', true), eqText(' < s'), eqText('maximum', true))),
    ]),
    summaryRow([
      summaryCell('Shear', { rowSpan: 3, align: AlignmentType.CENTER }),
      summaryCell('Strength I'),
      summaryCell(equation(eqText('φV'), eqText('n', true), eqText(' ≥ V'), eqText('u', true))),
    ]),
    summaryRow([
      summaryCell('Extreme Event I'),
      summaryCell(equation(eqText('φV'), eqText('n', true), eqText(' ≥ V'), eqText('u', true))),
    ]),
    summaryRow([
      summaryCell('Extreme Event II'),
      summaryCell(equation(eqText('φV'), eqText('n', true), eqText(' ≥ V'), eqText('u', true))),
    ]),
  ];
  const summaryRows: TableRow[] = [];
  if (hasAbutment) summaryRows.push(...summaryCheckRows('Abutment MSE Walls'));
  if (hasWing) summaryRows.push(...summaryCheckRows('Wing MSE Walls'));
  if (!hasAbutment && !hasWing) summaryRows.push(...summaryCheckRows('Abutment MSE Walls'));
  if (hasPanelFace) summaryRows.push(...panelSummaryRows);
  const summaryDesignChecksTable = new Table({
    width: { size: 9360, type: WidthType.DXA },
    layout: TableLayoutType.FIXED,
    columnWidths: summaryColumnWidths,
    rows: [
      summaryRow([summaryCell('Summary of Design Checks', { columnSpan: 4, bold: true, align: AlignmentType.CENTER, size: 22 })], 420),
      summaryRow(
        [
          summaryCell([summaryP('Wall Type and', { bold: true, align: AlignmentType.CENTER }), summaryP('Configuration', { bold: true, align: AlignmentType.CENTER })], {
            width: summaryColumnWidths[0],
          }),
          summaryCell('Limit State Checked', { width: summaryColumnWidths[1], bold: true, align: AlignmentType.CENTER }),
          summaryCell('Load Combination', { width: summaryColumnWidths[2], bold: true, align: AlignmentType.CENTER }),
          summaryCell('Results are Adequate', { width: summaryColumnWidths[3], bold: true, align: AlignmentType.CENTER }),
        ],
        430,
      ),
      ...summaryRows,
    ],
  });
  const wallKindLabel =
    hasAbutment && hasWing ? 'Abutment and Wing Walls' : hasWing ? 'Wing Walls' : 'Abutment Walls';
  const projectInfoTitle = `${data.projectLocation}: ${wallKindLabel}`;
  const applicableWallRows: string[] = [];
  if (hasAbutment) {
    applicableWallRows.push('West Abutment MSE Wall', 'East Abutment MSE Wall');
  }
  if (hasWing) {
    applicableWallRows.push('West Wing MSE Wall', 'East Wing MSE Wall');
  }
  if (!hasAbutment && !hasWing) {
    applicableWallRows.push('West Abutment MSE Wall', 'East Abutment MSE Wall');
  }
  const page3Cell = (
    text: string,
    opts: { bold?: boolean; width?: number; align?: typeof AlignmentType[keyof typeof AlignmentType] } = {},
  ) =>
    new TableCell({
      width: opts.width ? { size: opts.width, type: WidthType.DXA } : undefined,
      borders: {
        top: { style: BorderStyle.SINGLE, size: 8, color: '000000' },
        bottom: { style: BorderStyle.SINGLE, size: 8, color: '000000' },
        left: { style: BorderStyle.SINGLE, size: 8, color: '000000' },
        right: { style: BorderStyle.SINGLE, size: 8, color: '000000' },
      },
      margins: { top: 35, bottom: 35, left: 50, right: 50 },
      verticalAlign: VerticalAlignTable.CENTER,
      children: [
        new Paragraph({
          alignment: opts.align ?? AlignmentType.CENTER,
          spacing: { before: 0, after: 0, line: 230 },
          children: [new TextRun({ text, bold: opts.bold, size: 22 })],
        }),
      ],
    });
  const applicableWallsTable = new Table({
    width: { size: 5900, type: WidthType.DXA },
    layout: TableLayoutType.FIXED,
    columnWidths: [3180, 2720],
    rows: [
      new TableRow({
        height: { value: 300, rule: HeightRule.ATLEAST },
        children: [
          page3Cell('Wall Location', { bold: true, width: 3180 }),
          page3Cell('Structure Number', { bold: true, width: 2720 }),
        ],
      }),
      ...applicableWallRows.map(
        (wall) =>
          new TableRow({
            height: { value: 280, rule: HeightRule.ATLEAST },
            children: [page3Cell(wall, { width: 3180 }), page3Cell('', { width: 2720 })],
          }),
      ),
    ],
  });

  const cdotLogo = fs.readFileSync(CDOT_LOGO_PNG);

  // Cover-page logos (soft-fail if assets missing)
  let coverMuller: Buffer | null = null;
  let coverCdot: Buffer | null = null;
  let coverRocksol: Buffer | null = null;
  try { coverMuller = fs.readFileSync(LOGO_MULLER); } catch { /* ignore */ }
  try { coverCdot  = fs.readFileSync(LOGO_CDOT);   } catch { /* ignore */ }
  try { coverRocksol = fs.readFileSync(LOGO_ROCKSOL); } catch { /* ignore */ }

  const simpleHeader = new Header({
    children: [
      new Paragraph({
        alignment: AlignmentType.LEFT,
        spacing: { before: 0, after: 40 },
        children: [
          new ImageRun({
            type: 'png',
            data: cdotLogo,
            transformation: { width: 220, height: 50 },
          }),
        ],
      }),
      new Paragraph({
        border: { bottom: { color: '000000', space: 1, style: BorderStyle.SINGLE, size: 6 } },
        spacing: { after: 0 },
        children: [new TextRun({ text: '', size: 2 })],
      }),
    ],
  });

  const calculationHeader = (sectionTitle: string) =>
    new Header({
      children: [
        new Table({
          width: { size: 9360, type: WidthType.DXA },
          borders: noBorder,
          rows: [
            new TableRow({
              children: [
                new TableCell({
                  width: { size: 2600, type: WidthType.DXA },
                  borders: noBorder,
                  children: [
                    new Paragraph({
                      alignment: AlignmentType.LEFT,
                      spacing: { before: 0, after: 0 },
                      children: [
                        new ImageRun({
                          type: 'png',
                          data: cdotLogo,
                          transformation: { width: 178, height: 40 },
                        }),
                      ],
                    }),
                  ],
                }),
                new TableCell({
                  width: { size: 4160, type: WidthType.DXA },
                  borders: noBorder,
                  children: [
                    p(data.projectLocation, { size: 20, align: AlignmentType.CENTER }),
                    p(sectionTitle, {
                      size: 22,
                      align: AlignmentType.CENTER,
                    }),
                  ],
                }),
                new TableCell({
                  width: { size: 2600, type: WidthType.DXA },
                  borders: noBorder,
                  children: [
                    p('Computation', { size: 22 }),
                    p(`By: ${data.generatedBy}`, { size: 22 }),
                    p(fmtDate(data.generatedAt), { size: 22 }),
                  ],
                }),
              ],
            }),
          ],
        }),
      ],
    });

  const pageFooter = new Footer({
    children: [
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [new TextRun({ children: [PageNumber.CURRENT], size: 16, color: '000000' })],
      }),
    ],
  });

  const page = {
    size: { width: 12240, height: 15840 },
    margin: { top: 1440, right: 1440, bottom: 1440, left: 1440, header: 720, footer: 720 },
  };
  // ── Cover-page logo row ───────────────────────────────────────────────────
  const coverLogoCell = (
    buf: Buffer | null,
    type: 'jpg' | 'png',
    w: number,
    h: number,
    align: typeof AlignmentType[keyof typeof AlignmentType],
  ) =>
    new TableCell({
      borders: noBorder,
      verticalAlign: VerticalAlign.CENTER,
      children: [
        new Paragraph({
          alignment: align,
          spacing: { before: 0, after: 0 },
          children: buf ? [new ImageRun({ type, data: buf, transformation: { width: w, height: h } })] : [],
        }),
      ],
    });

  const coverLogoRow = new Table({
    width: { size: 9360, type: WidthType.DXA },
    layout: TableLayoutType.FIXED,
    columnWidths: [3120, 3120, 3120],
    borders: noBorder,
    rows: [
      new TableRow({
        children: [
          coverLogoCell(null,          'png',   0,  0, AlignmentType.LEFT),
          coverLogoCell(cdotLogo,     'png', 160, 36, AlignmentType.CENTER),
          coverLogoCell(coverRocksol, 'jpg', 120, 29, AlignmentType.RIGHT),
        ],
      }),
    ],
  });

  // ── TOC rows (built dynamically from active sections) ─────────────────────
  const tocSubRow = (label: string) =>
    tocRow(label, '', { indent: 600 });

  const wallTocSubRows = (L: string) => [
    `${L}.1 Sequence of Calculations`,
    `${L}.2 Proposed MSE Wall Geometry`,
    `${L}.3 Soil Properties: Retained Fill`,
    `${L}.4 Soil Properties: Foundation Soil`,
    `${L}.5 Material Properties`,
    `${L}.6 Seismic Properties`,
    `${L}.7 Applied Loads`,
    `${L}.8 Load Factors and Combinations`,
    `${L}.9 External Stability`,
    `${L}.10 Internal Stability`,
  ].map(tocSubRow);

  const panelTocSubRows = (L: string) => [
    `${L}.1 Panel Geometry and Reinforcement`,
    `${L}.2 Factored Load on Panel`,
    `${L}.3 Concrete Cracking Moment`,
    `${L}.4 Governing Moment Demands`,
    `${L}.5 Flexural Capacity`,
    `${L}.6 Crack Control`,
    `${L}.7 Shear Capacity`,
  ].map(tocSubRow);

  const tocBodyRows: TableRow[] = [];
  tocBodyRows.push(tocRow('Summary of Design Checks', '3', { bold: true }));
  tocBodyRows.push(tocRow('Design Basis', '4', { bold: true, after: 300 }));

  let tocSecNum = 0;
  if (hasAbutment || (!hasAbutment && !hasWing)) {
    const n = String(++tocSecNum);
    tocBodyRows.push(tocRow(`${n}.   MSE Abutment Wall Design Calculations`, '5', { bold: true }));
    tocBodyRows.push(...wallTocSubRows(n));
    tocBodyRows.push(tocRow('', '', { after: 260 }));
  }
  if (hasWing) {
    const n = String(++tocSecNum);
    tocBodyRows.push(tocRow(`${n}.   MSE Wing Wall Design Calculations`, '—', { bold: true }));
    tocBodyRows.push(...wallTocSubRows(n));
    tocBodyRows.push(tocRow('', '', { after: 260 }));
  }
  if (hasPanelFace) {
    const n = String(++tocSecNum);
    tocBodyRows.push(tocRow(`${n}.   Precast Panel Facing Design`, '—', { bold: true }));
    tocBodyRows.push(...panelTocSubRows(n));
  }

  const tocTable = new Table({
    width: { size: 9360, type: WidthType.DXA },
    layout: TableLayoutType.FIXED,
    columnWidths: [8060, 1300],
    borders: noBorder,
    rows: tocBodyRows,
  });

  // ── Report section: cover (p.1) + TOC (p.2) + Summary (p.3) ─────────────
  const blankFirstPageHeader = new Header({ children: [new Paragraph({ children: [] })] });

  const reportSection = {
    properties: {
      page,
      titlePage: true,
    },
    headers: {
      default: simpleHeader,
      first: blankFirstPageHeader,
    },
    footers: {
      default: pageFooter,
    },
    children: [
      // ── Page 1: Cover ──
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 0, after: 0 },
        children: [new ImageRun({ type: 'png', data: cdotLogo, transformation: { width: 320, height: 72 } })],
      }),
      blank(1200),
      p('MSE Retaining Walls: Design Calculations', {
        size: 28, bold: true, align: AlignmentType.CENTER, after: 240,
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 0, after: 0 },
        border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: '000000', space: 1 } },
        children: [],
      }),
      blank(240),
      p(data.projectLocation, { size: 24, bold: true, align: AlignmentType.CENTER, after: 80 }),
      p(data.projectName,     { size: 22, align: AlignmentType.CENTER, after: 80 }),
      ...(data.projectDescription
        ? [p(data.projectDescription, { size: 22, align: AlignmentType.CENTER })]
        : []),
      blank(1400),
      p(`Generated by:  ${data.generatedBy}`, { size: 22, color: '4A5568', align: AlignmentType.CENTER }),
      p(`Date:  ${fmtDate(data.generatedAt)}`,  { size: 22, color: '4A5568', align: AlignmentType.CENTER }),

      // ── Page 2: Table of Contents ──
      pageBreak(),
      blank(300),
      p('Table of Contents', { size: 24, bold: true, align: AlignmentType.CENTER, after: 300 }),
      tocTable,

      // ── Page 3: Summary of Design Checks ──
      pageBreak(),
      blank(600),
      summaryDesignChecksTable,
    ],
  };

  const lineSpacing = 276; // 1.15 line spacing in Word twips.
  const underlined = (
    text: string,
    opts: {
      bold?: boolean;
      italic?: boolean;
      size?: number;
      after?: number;
      align?: typeof AlignmentType[keyof typeof AlignmentType];
    } = {},
  ) =>
    new Paragraph({
      alignment: opts.align ?? AlignmentType.LEFT,
      spacing: { before: 0, after: opts.after ?? 120, line: lineSpacing },
      children: [
        new TextRun({
          text,
          bold: opts.bold,
          italics: opts.italic,
          underline: { type: UnderlineType.SINGLE, color: '000000' },
          size: opts.size ?? 22,
        }),
      ],
    });
  const page4Para = (runs: TextRun[], opts: { indent?: number; after?: number; align?: typeof AlignmentType[keyof typeof AlignmentType] } = {}) =>
    new Paragraph({
      alignment: opts.align ?? AlignmentType.LEFT,
      indent: opts.indent ? { left: opts.indent } : undefined,
      spacing: { before: 0, after: opts.after ?? 40, line: lineSpacing },
      children: runs,
    });
  const run = (text: string, opts: { bold?: boolean; italic?: boolean; underline?: boolean; color?: string; highlight?: string; size?: number } = {}) =>
    new TextRun({
      text,
      bold: opts.bold,
      italics: opts.italic,
      underline: opts.underline ? { type: UnderlineType.SINGLE, color: '000000' } : undefined,
      color: opts.color,
      size: opts.size ?? 22,
      shading: opts.highlight ? { type: ShadingType.SOLID, fill: opts.highlight, color: opts.highlight } : undefined,
    });
  const etaRun = (symbol: string, subscript: string) => [
    run(symbol, { size: 22 }),
    new TextRun({ text: subscript, subScript: true, size: 22 }),
  ];
  const sub = (text: string) => new TextRun({ text, subScript: true, size: 22 });
  const blue = (text: string, opts: { italic?: boolean } = {}) => run(text, { italic: opts.italic });
  const calcLine = (runs: TextRun[], opts: { after?: number } = {}) => page4Para(runs, { after: opts.after ?? 90 });
  const calcP = (text: string, opts: { indent?: number; after?: number } = {}) =>
    p(text, { size: 22, indent: opts.indent, after: opts.after, line: lineSpacing });
  const noteP = (text: string, opts: { after?: number } = {}) =>
    new Paragraph({
      spacing: { before: 0, after: opts.after ?? 80, line: lineSpacing },
      children: [new TextRun({ text, size: 22 })],
    });
  const calcTwoColumn = (left: (Paragraph | Table)[], right: Paragraph[], after = 120) =>
    new Table({
      width: { size: 9360, type: WidthType.DXA },
      layout: TableLayoutType.FIXED,
      columnWidths: [4920, 4440],
      borders: noBorder,
      rows: [
        new TableRow({
          children: [
            new TableCell({
              width: { size: 4920, type: WidthType.DXA },
              borders: noBorder,
              margins: { top: 0, bottom: after, left: 0, right: 120 },
              children: left,
            }),
            new TableCell({
              width: { size: 4440, type: WidthType.DXA },
              borders: noBorder,
              margins: { top: 0, bottom: after, left: 120, right: 0 },
              children: right,
            }),
          ],
        }),
      ],
    });
  const mathMatrix = (values: string[], unit: string) =>
    new OfficeMath({
      children: [
        new OMathElement('m:d', undefined, [
          new OMathElement('m:dPr', undefined, [
            new OMathElement('m:begChr', { 'm:val': '[' }),
            new OMathElement('m:endChr', { 'm:val': ']' }),
            new OMathElement('m:grow', { 'm:val': '1' }),
          ]),
          new OMathElement('m:e', undefined, [
            new OMathElement('m:m', undefined, [
              new OMathElement('m:mPr', undefined, [
                new OMathElement('m:baseJc', { 'm:val': 'center' }),
                new OMathElement('m:mcs', undefined, [
                  new OMathElement('m:mc', undefined, [
                    new OMathElement('m:mcPr', undefined, [
                      new OMathElement('m:count', { 'm:val': '1' }),
                      new OMathElement('m:mcJc', { 'm:val': 'center' }),
                    ]),
                  ]),
                ]),
              ]),
              ...values.map((value) => new OMathElement('m:mr', undefined, [new OMathElement('m:e', undefined, [new MathRun(value)])])),
            ]),
          ]),
        ]) as unknown as MathComponent,
      ],
    });
  const activePressureEquation = (kaValue: number) =>
    new Paragraph({
      alignment: AlignmentType.LEFT,
      spacing: { before: 0, after: 90, line: lineSpacing },
      children: [
        new TextRun({ text: ' ', size: 1 }),
        new OfficeMath({
          children: [
            new MathSubScript({ children: [new MathRun('k')], subScript: [new MathRun('A.S')] }),
            new MathRun(' := tan'),
            new MathSuperScript({
              children: [
                new MathRoundBrackets({
                  children: [
                    new MathRun('45 deg - '),
                    new MathFraction({
                      numerator: [new MathSubScript({ children: [new MathRun('φ')], subScript: [new MathRun('s')] })],
                      denominator: [new MathRun('2')],
                    }),
                  ],
                }),
              ],
              superScript: [new MathRun('2')],
            }),
            new MathRun(` = ${kaValue.toFixed(3)}`),
          ],
        }),
      ],
    });
  const matrixLine = (prefix: TextRun[], values: string[], unit: string, opts: { after?: number } = {}) =>
    new Paragraph({
      spacing: { before: 0, after: opts.after ?? 0, line: lineSpacing },
      children: [...prefix, mathMatrix(values, unit), run(` ${unit}`, { italic: true })],
    });

  // Fraction-formula matrix line: LHS runs + fraction + " = " all in OfficeMath, then matrix+unit
  const ms = (t: string, s: string): MathComponent =>
    new MathSubScript({ children: [new MathRun(t)], subScript: [new MathRun(s)] });
  const mFracLine = (
    lhs: MathComponent[], num: MathComponent[], den: MathComponent[],
    values: string[], unit: string, after = 0,
  ) =>
    new Paragraph({
      spacing: { before: 0, after, line: lineSpacing },
      children: [
        new OfficeMath({ children: [...lhs, new MathFraction({ numerator: num, denominator: den }), new MathRun(' = ')] }),
        mathMatrix(values, unit),
        run(` ${unit}`, { italic: true }),
      ],
    });
  // ── Additional rendering helpers for the hand-calculation sections ─────────

  // Underlined section heading with a right-aligned AASHTO / FHWA reference,
  // matching the reference report's "Title …………… AASHTO X.Y" layout.
  const headingRef = (title: string, ref = '', before = 360, level?: typeof HeadingLevel[keyof typeof HeadingLevel]) =>
    new Paragraph({
      heading: level,
      spacing: { before, after: 80, line: lineSpacing },
      children: [
        new TextRun({ text: title, bold: true, size: 22, color: '000000' }),
        ...(ref ? [new TextRun({ text: `   ${ref}`, size: 20, color: '4A5568' })] : []),
      ],
    });

  // A red, italic run for a variable that the reference shows but the project
  // does not provide a value for (per spec: show it anyway, flagged in red).
  const redRun = (text: string) => run(text, { color: RED, italic: true });

  // Shaded check-result box: green if every result is Adequate, red otherwise.
  const checkBox = (prefix: TextRun[], checks: string[]) => {
    const ok = checks.length > 0 && checks.every((c) => c === 'Adequate');
    const fill = ok ? 'C6D9A4' : 'E6A0A0';
    return new Table({
      width: { size: 9360, type: WidthType.DXA },
      borders: noBorder,
      rows: [
        new TableRow({
          children: [
            new TableCell({
              shading: { type: ShadingType.SOLID, fill, color: fill },
              borders: noBorder,
              margins: { top: 60, bottom: 60, left: 120, right: 120 },
              children: [
                new Paragraph({
                  spacing: { before: 0, after: 0, line: lineSpacing },
                  children:
                    checks.length === 1
                      ? [...prefix, run(`"${checks[0]}"`)]
                      : [...prefix, mathMatrix(checks.map((c) => `"${c}"`), '')],
                }),
              ],
            }),
          ],
        }),
      ],
    });
  };

  // ── Per-wall calculation context (works for abutment and wing alike) ───────
  type WallCtx = {
    params: Record<string, string>;
    numP: (key: string, fb: number) => number;
    extRows: AnalysisRow[];
    intRows: InternalStabilityRow[];
    extSample: AnalysisRow[];
    intSample: InternalStabilityRow[];
    extVals: (fn: (r: AnalysisRow) => number, d?: number) => string[];
    intVals: (fn: (r: InternalStabilityRow) => number, d?: number) => string[];
    extChecks: (fn: (r: AnalysisRow) => string) => string[];
    intChecks: (fn: (r: InternalStabilityRow) => string) => string[];
    dhStr: string[]; hStr: string[]; rlStr: string[];
    sVval: number; gammaSVal: number; phiSdeg: number; deltaSval: number; kaSval: number;
    sigmaBrgVal: number; phiFSoilVal: number;
    bIVal: number; thetaVal: number; bstemVal: number;
    pgaVal: number; fPgaEqVal: number; kVVal: number; kHVal: number; phiMoVal: number;
  };
  const makeWallCtx = (
    ext: ExternalDesignSection | undefined,
    int: InternalDesignSection | undefined,
  ): WallCtx => {
    const params: Record<string, string> = ext?.params ?? int?.params ?? {};
    const numP = (key: string, fb: number) => {
      const v = parseFloat(params[key] ?? '');
      return isFinite(v) ? v : fb;
    };
    const extRows = ext?.rows ?? [];
    const intRows = int?.rows ?? [];
    const sample = <T,>(rows: T[]) =>
      rows.length >= 3 ? [rows[0], rows[Math.floor(rows.length / 2)], rows[rows.length - 1]] : rows;
    const extSample = sample(extRows);
    const intSample = sample(intRows);
    let dhA: number[];
    if (extRows.length >= 3) dhA = [extRows[0].dh, extRows[Math.floor(extRows.length / 2)].dh, extRows[extRows.length - 1].dh];
    else if (intRows.length >= 3) dhA = [intRows[0].dh, intRows[Math.floor(intRows.length / 2)].dh, intRows[intRows.length - 1].dh];
    else {
      const mn = numP('Min Height (ft)', 24.75); const mx = numP('Max Height (ft)', 29.75);
      dhA = [mn, (mn + mx) / 2, mx];
    }
    const phiSdeg = numP('φr.fill (deg)', 34);
    const pgaVal = numP('PGA', 0);
    const fPgaEqVal = numP('F_PGA.EQ', 0);
    const kVVal = numP('K_V', 0);
    const kHVal = pgaVal * fPgaEqVal;
    return {
      params, numP, extRows, intRows, extSample, intSample,
      extVals: (fn, d = 3) => extSample.map((r) => N(fn(r), d)),
      intVals: (fn, d = 3) => intSample.map((r) => N(fn(r), d)),
      extChecks: (fn) => extSample.map(fn),
      intChecks: (fn) => intSample.map(fn),
      dhStr: dhA.map((v) => v.toFixed(2)),
      hStr: dhA.map((v) => (v - 5 - 2.25 / 12).toFixed(3)),
      rlStr: dhA.map((v) => (v < 9 ? '9.000' : v < 40 ? (1.05 * v).toFixed(3) : '40.000')),
      sVval: numP('Sv (ft)', 2.5),
      gammaSVal: numP('γr.fill (pcf)', 125),
      phiSdeg,
      deltaSval: numP('δs', 0.675),
      kaSval: Math.pow(Math.tan(((45 - phiSdeg / 2) * Math.PI) / 180), 2),
      sigmaBrgVal: numP('σ_brg (ksf)', 4.5),
      phiFSoilVal: numP('φF.soil (deg)', 34),
      bIVal: numP('β(i) (deg)', 0),
      thetaVal: numP('θ (deg)', 90),
      bstemVal: numP('βstem-Batter (deg)', 0),
      pgaVal, fPgaEqVal, kVVal, kHVal,
      phiMoVal: (Math.atan(kHVal / (1 - kVVal)) * 180) / Math.PI,
    };
  };

  const abutmentExternal = data.designs.find(
    (d): d is ExternalDesignSection => d.kind === 'external' && isAbutmentSection(d),
  );
  const abutmentInternal = data.designs.find(
    (d): d is InternalDesignSection => d.kind === 'internal' && isAbutmentSection(d),
  );
  const wingExternalLl = data.designs.find(
    (d): d is ExternalDesignSection =>
      d.kind === 'external' && isWingSection(d) && d.designTypeName.toLowerCase().includes('with ll'),
  );
  const wingExternalAny = data.designs.find(
    (d): d is ExternalDesignSection => d.kind === 'external' && isWingSection(d),
  );
  const wingInternal = data.designs.find(
    (d): d is InternalDesignSection => d.kind === 'internal' && isWingSection(d),
  );
  const panelDesign = data.designs.find(
    (d): d is PanelFaceDesignSection => d.kind === 'panel_face',
  );
  const abutmentCtx = makeWallCtx(abutmentExternal, abutmentInternal);
  const wingCtx = makeWallCtx(wingExternalLl ?? wingExternalAny, wingInternal);

  const abutmentTitle = 'MSE Abutment Wall Design Calculations';

  const designBasisSection: ISectionOptions = {
    properties: { page },
    headers: { default: calculationHeader('Design Basis') },
    footers: { default: pageFooter },
    children: [
      blank(200),
      // ── Page title ──
      p('Design Basis', { size: 24, bold: true, align: AlignmentType.CENTER, after: 360 }),

      // ── Design Codes and References ──
      page4Para([run('Design Codes and References', { bold: true })], { after: 160 }),
      page4Para([
        run('AASHTO LRFD Bridge Design Specification', { italic: true, underline: true }),
        run(', 9th Edition, hereafter referred to as '),
        run('AASHTO', { bold: true }),
        run('.'),
      ], { indent: 400 }),
      page4Para([
        run('DRAFT Geotechnical Investigation Report', { italic: true, underline: true }),
        run(', June, 2021, hereafter referred to as '),
        run('Geotech Report', { bold: true }),
        run('.'),
      ], { indent: 400 }),
      page4Para([
        run('FHWA-NHI-10-024 MSE Walls and Reinforced Soil Slopes Design and Construction Guidelines', { underline: true }),
        run(', Volume I and II, hereafter referred to as '),
        run('FHWA', { bold: true }),
        run('.'),
      ], { indent: 400 }),
      page4Para([
        run('AISC Steel Construction Manual', { underline: true }),
        run(', 14th Edition, hereafter referred to as '),
        run('AISC', { bold: true }),
        run('.'),
      ], { indent: 400, after: 300 }),

      // ── Approach ──
      page4Para([run('Approach', { bold: true })], { after: 160 }),
      page4Para([run('Complete hand calculations for three Design Height (DH) cases for generic MSE walls.')], { indent: 400 }),
      page4Para([run('Complete analysis for the full DH range using Excel spreadsheets. Includes External Stability, Internal Stability, and Facing Design. Accounts for CDOT Structure Backfill Class 1, with live load surcharge.')], { indent: 400 }),
      page4Para([run('Global Stability checked by CDOT Geotechnical Engineers. Found adequate for the DH–RL relationship used.')], { indent: 400, after: 120 }),
      page4Para([run(`Calculations completed by:  ${data.generatedBy}`)], { indent: 400, after: 300 }),

      // ── Units ──
      page4Para([run('Units', { bold: true })], { after: 160 }),
      page4Para([
        run('ksi := 1000 ', { italic: true }),  run('lbf/in²', { italic: true }),
        run('        kip := 1000 ', { italic: true }), run('lbf', { italic: true }),
        run('        deg := π/180        lin_ft := 1 ', { italic: true }),
        run('ft', { italic: true }),
        run('        kcf := 1000 ', { italic: true }), run('lbf/ft³', { italic: true }),
      ], { indent: 400, after: 160 }),
      page4Para([...etaRun('η', 'D'), run(' := 1.00                                      AASHTO 1.3.3')], { indent: 400 }),
      page4Para([...etaRun('η', 'R'), run(' := 1.00                                      AASHTO 1.3.4')], { indent: 400 }),
      page4Para([...etaRun('η', 'I'), run(' := 1.00                                      AASHTO 1.3.5')], { indent: 400 }),
      page4Para([
        ...etaRun('η', 'i'), run(' := '),
        ...etaRun('η', 'D'), run(' · '),
        ...etaRun('η', 'R'), run(' · '),
        ...etaRun('η', 'I'), run(' = 1                         AASHTO 1.3.2.1'),
      ], { indent: 400, after: 300 }),

      // ── Legend ──
      page4Para([run('Legend', { bold: true })], { after: 160 }),
      page4Para([run('Blue regions correspond to design variables and/or design input variables', { highlight: '80DDE6' })], { indent: 400 }),
      page4Para([run('Green regions correspond to adequate design checks performed', { highlight: 'C6D9A4' })], { indent: 400 }),
      page4Para([run('Red regions correspond to inadequate design check performed', { highlight: 'E6A0A0' })], { indent: 400 }),
    ],
  };

  // ════════════════════════════════════════════════════════════════════════
  // Faithful page-by-page hand-calculation builder (mirrors design-ref-pages).
  // Works for both Abutment and Wing walls (wing has no reference of its own,
  // so it mirrors the abutment structure with wing-specific data/geometry).
  // ════════════════════════════════════════════════════════════════════════
  const redVec = (prefix: TextRun[]) =>
    calcLine([...prefix, redRun(' := —   (value not provided by project)')]);

  const wallCalcChildren = (
    ctx: WallCtx,
    opts: { title: string; isWing: boolean; chart: Buffer | null; sectionNum: number },
  ): DocChild[] => {
    const {
      numP, extVals, intVals, extChecks, intChecks, dhStr, hStr, rlStr,
      sVval, gammaSVal, phiSdeg, deltaSval, kaSval, sigmaBrgVal, phiFSoilVal,
      bIVal, thetaVal, pgaVal, fPgaEqVal, kVVal, kHVal, phiMoVal, extRows, intRows, intSample,
    } = ctx;
    const { title, isWing, chart, sectionNum } = opts;
    const wallWord = isWing ? 'wing' : 'abutment';
    let _sub = 0;
    const secHead = (t: string, ref = '') => headingRef(`${sectionNum}.${++_sub} ${t}`, ref, 360, HeadingLevel.HEADING_2);

    // ── kAE / seismic intermediates computed from context params ─────────────
    const toRad = (d: number) => d * Math.PI / 180;
    const bstemV = ctx.bstemVal;
    const kAeNumer = Math.pow(Math.cos(toRad(phiSdeg - phiMoVal - bstemV)), 2);
    const kAeDenomBase = Math.cos(toRad(phiMoVal)) * Math.pow(Math.cos(toRad(bstemV)), 2) *
                         Math.cos(toRad(deltaSval + bstemV + phiMoVal));
    const kAeSqrtArg = Math.max(0,
      (Math.sin(toRad(phiSdeg + deltaSval)) * Math.sin(toRad(phiSdeg - phiMoVal - bIVal))) /
      (Math.cos(toRad(deltaSval + bstemV + phiMoVal)) * Math.cos(toRad(bIVal - bstemV))),
    );
    const kAeVal = (kAeNumer / kAeDenomBase) * Math.pow(1 + Math.sqrt(kAeSqrtArg), -2);

    // Wing uses Coulomb kA (analyzeWingInternal hardcodes theta=90)
    const wingKaSqrtArg = Math.max(0,
      (Math.sin(toRad(phiSdeg + deltaSval)) * Math.sin(toRad(phiSdeg - bIVal))) /
      (Math.cos(toRad(deltaSval)) * Math.cos(toRad(bIVal))),
    );
    const wingGammaKa = Math.pow(1 + Math.sqrt(wingKaSqrtArg), 2);
    const kaWingVal = Math.pow(Math.cos(toRad(phiSdeg)), 2) / (wingGammaKa * Math.cos(toRad(deltaSval)));
    const kaVal = isWing ? kaWingVal : kaSval;

    const omIRn = dhStr.map((v) => kHVal * 0.5 * (gammaSVal / 1000) * Math.pow(parseFloat(v), 2));
    const omAEn = dhStr.map((v) => 0.5 * (gammaSVal / 1000) * Math.pow(parseFloat(v), 2) * kAeVal);
    const wEQ1n = omIRn.map((ir, i) => omAEn[i] + 0.5 * ir);
    const wEQ2n = omIRn.map((ir, i) => ir + 0.5 * omAEn[i]);

    const sup = (text: string) => new TextRun({ text, superScript: true, size: 22 });

    // ── Per-variable row table helpers ──────────────────────────────────────
    const vr = (left: (Paragraph | Table)[], note: string) =>
      new TableRow({
        children: [
          new TableCell({
            width: { size: 5400, type: WidthType.DXA },
            borders: noBorder,
            margins: { top: 0, bottom: 60, left: 0, right: 160 },
            children: left,
          }),
          new TableCell({
            width: { size: 3960, type: WidthType.DXA },
            borders: noBorder,
            margins: { top: 0, bottom: 60, left: 160, right: 0 },
            children: note ? [noteP(note)] : [new Paragraph({ spacing: { before: 0, after: 0 }, children: [] })],
          }),
        ],
      });
    const vt = (rows: TableRow[]) =>
      new Table({
        width: { size: 9360, type: WidthType.DXA },
        layout: TableLayoutType.FIXED,
        columnWidths: [5400, 3960],
        borders: noBorder,
        rows,
      });

    const out: DocChild[] = [
      blank(220),
      p(title, { size: 24, bold: true, align: AlignmentType.CENTER, after: 260, heading: HeadingLevel.HEADING_1 }),

      // ── A.1  Sequence of Calculations (ref page 4) ───────────────────────
      secHead('Sequence of Calculations'),
      page4Para([run('–  Geometry, Material Properties and Loads', { bold: true }), run(' Strength I, Service I, Extreme Event I')], { indent: 400 }),
      page4Para([run('–  External Stability: Bearing, Overturning, Sliding', { bold: true }), run(' Strength I, Extreme Event I')], { indent: 400 }),
      page4Para([run('–  Internal Stability: Steel Reinforcement: Tensile and Pullout', { bold: true }), run(' Strength I, Extreme Event I')], { indent: 400 }),
      page4Para([run('–  Internal Stability: Geo Grid: Tensile and Pullout', { bold: true }), run(' Strength I, Extreme Event I')], { indent: 400 }),
      page4Para([run('–  Internal Stability: Geosynthetic: Tensile and Pullout', { bold: true }), run(' Strength I, Extreme Event I')], { indent: 400 }),
      page4Para([run('–  Facing: Flexure, Shear, Crack Control', { bold: true }), run(' Service I, Strength I')], { indent: 400 }),
      page4Para([run('–  Design Summary', { bold: true })], { indent: 400, after: 220 }),

      // ── A.2  Proposed MSE Wall Geometry (ref page 5) ─────────────────────
      secHead('Proposed MSE Wall Geometry'),
      vt([
        vr([matrixLine([run('DH := ', { italic: true })], dhStr, 'ft')],
          `Design for three Design Height cases. Min. and max. ${wallWord} wall DH from project geometry.`),
        vr([matrixLine([run('H := DH − 5 ', { italic: true }), blue('ft', { italic: true }), run(' − 2.25 ', { italic: true }), blue('in', { italic: true }), run(' = ', { italic: true })], hStr, 'ft')],
          'Actual height of walls, subtracting superstructure depth height and vertical offset'),
        vr([calcLine([run('s'), sub('H'), run(' := 2.5 ', { italic: true }), blue('ft', { italic: true }), run('          s'), sub('V'), run(` := ${sVval.toFixed(1)} `, { italic: true }), blue('ft', { italic: true })])],
          'Typical horizontal and vertical spacing of reinforcements'),
        vr([
          calcLine([run('RL := for i ∈ 0..2', { italic: true })]),
          calcLine([run('         if DH'), sub('i'), run(' < 9 ', { italic: true }), blue('ft', { italic: true })]),
          calcLine([run('            RL'), sub('i'), run(' ← 9 ', { italic: true }), blue('ft', { italic: true })]),
          calcLine([run('         else if DH'), sub('i'), run(' < 40 ', { italic: true }), blue('ft', { italic: true })]),
          calcLine([run('            RL'), sub('i'), run(' ← 0.7 · DH'), sub('i')]),
          calcLine([run('         else')]),
          calcLine([run('            RL'), sub('i'), run(' ← 40 ', { italic: true }), blue('ft', { italic: true })], { after: 80 }),
          matrixLine([run('         = ', { italic: true })],
            extRows.length > 0
              ? [N(extRows[0].rl, 3), N(extRows[Math.floor(extRows.length / 2)].rl, 3), N(extRows[extRows.length - 1].rl, 3)]
              : rlStr,
            'ft'),
        ], 'Minimum Reinforcement Length. AASHTO 11.10.2.1'),
      ]),
      blank(160),

      // ── A.3  Soil Properties: Retained Fill (ref page 5) ─────────────────
      secHead('Soil Properties: Retained Fill', ''),
      calcP('CDOT Structural Backfill Class 1 typical for all MSE Walls', { after: 100 }),
      vt([
        vr([calcLine([run('γ'), sub('s'), run(` := ${gammaSVal.toFixed(0)} `, { italic: true }), blue('pcf', { italic: true })])],
          'Unit weight of backfill. Geotech Report Table 4'),
        vr([calcLine([run('φ'), sub('s'), run(` := ${phiSdeg.toFixed(0)} `, { italic: true }), blue('deg', { italic: true })])],
          'Effective Friction Angle. Geotech Report Table 4'),
        vr([calcLine([run('δ'), sub('s'), run(' := tan(φ'), sub('s'), run(`) = ${Math.tan(toRad(phiSdeg)).toFixed(3)}`)])],
          'Coefficient of Friction for concrete wall'),
        vr([calcLine([run('c'), sub('s'), run(' := 0 ', { italic: true }), blue('psf', { italic: true })])],
          'Cohesion. Geotech Report Table 4'),
        vr([calcLine([run(`θ := ${thetaVal.toFixed(0)} `, { italic: true }), blue('deg', { italic: true }), run(`          β := ${bIVal.toFixed(0)} `, { italic: true }), blue('deg', { italic: true })])], ''),
        vr([activePressureEquation(kaVal)], 'Active Lateral Earth Pressure. FHWA 4-1'),
      ]),

      // ── A.4  Soil Properties: Foundation Soil (ref page 6) ───────────────
      secHead('Soil Properties: Foundation Soil', ''),
      vt([
        vr([calcLine([run('γ'), sub('F'), run(` := ${gammaSVal.toFixed(0)} `, { italic: true }), blue('pcf', { italic: true })])], ''),
        vr([calcLine([run('φ'), sub('F'), run(` := ${phiFSoilVal.toFixed(0)} `, { italic: true }), blue('deg', { italic: true })])],
          'Controlling internal angle. AASHTO 11.10.5.3'),
        vr([calcLine([run('δ'), sub('F'), run(' := tan(φ'), sub('F'), run(`) = ${Math.tan(toRad(phiFSoilVal)).toFixed(3)}`)])], ''),
        vr([calcLine([run('c'), sub('F'), run(' := 0 ', { italic: true }), blue('psf', { italic: true })])], ''),
        vr([matrixLine([run('σ'), sub('F.Bear.Ser'), run(' := ')], [sigmaBrgVal.toFixed(2), sigmaBrgVal.toFixed(2), sigmaBrgVal.toFixed(2)], 'ksf')],
          'Service and Factored bearing pressures of foundation soil. Pressure due to service settlement concerns. Geotech Report Table 12.1'),
        vr([calcLine([run('φ'), sub('b.Str'), run(' := 0.65'), run('          φ'), sub('b.EE'), run(' := 0.90')])],
          'AASHTO Table 11.5.7-1'),
      ]),
      blank(160),

      // ── A.5  Material Properties (ref page 6) ────────────────────────────
      secHead('Material Properties', ''),
      vt([
        vr([calcLine([run("f'"), sub('C.Con'), run(' := 4.5 ', { italic: true }), blue('ksi', { italic: true })])],
          'Concrete Compressive Strength'),
        vr([calcLine([run('f'), sub('Y.Steel'), run(' := 60 ', { italic: true }), blue('ksi', { italic: true })])],
          'Steel Yield Strength'),
        vr([calcLine([run('γ'), sub('Concrete'), run(' := 0.150 ', { italic: true }), blue('kcf', { italic: true })])],
          'Concrete Unit Weight. AASHTO Table 3.5.1-1'),
        vr([calcLine([run('E'), sub('Steel'), run(' := 29000 ', { italic: true }), blue('ksi', { italic: true })])],
          'AASHTO C5.4.2.4-1'),
        vr([
          new Paragraph({
            spacing: { before: 0, after: 90, line: lineSpacing },
            children: [
              new TextRun({ text: ' ', size: 1 }),
              new OfficeMath({
                children: [
                  new MathSubScript({ children: [new MathRun('E')], subScript: [new MathRun('Con')] }),
                  new MathRun(' := 2500 ksi · '),
                  new MathSuperScript({
                    children: [
                      new MathRoundBrackets({
                        children: [
                          new MathFraction({
                            numerator: [new MathSubScript({ children: [new MathRun('f')], subScript: [new MathRun('C.Con')] })],
                            denominator: [new MathRun('ksi')],
                          }),
                        ],
                      }),
                    ],
                    superScript: [new MathRun('0.33')],
                  }),
                  new MathRun(` = (${(2500 * Math.pow(4.5, 0.33) / 1000).toFixed(3)} · `),
                  new MathSuperScript({ children: [new MathRun('10')], superScript: [new MathRun('3')] }),
                  new MathRun(') ksi'),
                ],
              }),
            ],
          }),
        ], ''),
      ]),

      // ── A.6  Seismic Properties (ref page 7) ─────────────────────────────
      secHead('Seismic Properties', ''),
      calcP('Seismic Zone 1, Site Class D. All values from Geotechnical Report.', { after: 120 }),
      vt([
        // PGA and FA.EQ paired on same line
        vr([calcLine([
          run('PGA := '), blue(pgaVal.toFixed(3)),
          run('          '),
          run('F'), sub('A.EQ'), run(' := '), blue(fPgaEqVal.toFixed(3)),
        ])], ''),
        // kV
        vr([calcLine([run('k'), sub('V'), run(' := '), blue(kVVal.toFixed(3))])], ''),
        // kH formula
        vr([calcLine([
          run('k'), sub('H'), run(' := F'), sub('A.EQ'), run(' · PGA = '),
          blue(kHVal.toFixed(4)),
        ])], 'AASHTO 11.6.5.3,  AASHTO 11.6.5.2.1'),
        // θMO with OfficeMath fraction
        vr([
          new Paragraph({
            spacing: { before: 0, after: 90, line: lineSpacing },
            children: [
              new TextRun({ text: ' ', size: 1 }),
              new OfficeMath({
                children: [
                  new MathSubScript({ children: [new MathRun('θ')], subScript: [new MathRun('MO')] }),
                  new MathRun(' := atan'),
                  new MathRoundBrackets({
                    children: [
                      new MathFraction({
                        numerator: [new MathSubScript({ children: [new MathRun('k')], subScript: [new MathRun('H')] })],
                        denominator: [
                          new MathRun('1 − '),
                          new MathSubScript({ children: [new MathRun('k')], subScript: [new MathRun('V')] }),
                        ],
                      }),
                    ],
                  }),
                  new MathRun(` = ${phiMoVal.toFixed(3)} deg`),
                ],
              }),
            ],
          }),
        ], 'Dynamic Earth'),
        // βStem
        vr([calcLine([
          run('β'), sub('Stem'), run(` := ${bstemV.toFixed(0)} `), blue('deg', { italic: true }),
        ])], 'Vertical back stem face'),
        // i := β
        vr([calcLine([
          run('i := β = '), blue(`${bIVal.toFixed(0)} `), blue('deg', { italic: true }),
        ])], 'Backfill slope. Dynamic Active Earth Coefficient. AASHTO Figure A11.3.1-1.\nCheck if PGA and backslope angle do not exceed soil friction angle. AASHTO 11.6.5.3-1'),
      ]),
      blank(120),
      // Check_AE.MO — own full-width row
      calcLine([
        run('Check'), sub('AE.MO'), run(' := if( φ'), sub('S'),
        run(' ≥ i + θ'), sub('MO'),
        run(', "Applicable", "NOT Applicable") = '),
        run(phiSdeg >= bIVal + phiMoVal ? '"Applicable"' : '"NOT Applicable"',
          { color: phiSdeg >= bIVal + phiMoVal ? '065F46' : '991B1B' }),
      ]),
      blank(60),
      // Mononobe-Okabe note — own row
      noteP('Mononobe-Okabe Method for dynamic earth pressure. AASHTO A11.3.1-1'),
      blank(60),
      // kAE full Mononobe-Okabe formula — own full-width row using equation editor
          new Paragraph({
            spacing: { before: 0, after: 140, line: lineSpacing },
            children: [
              new TextRun({ text: ' ', size: 1 }),
              new OfficeMath({
                children: [
                  new MathSubScript({ children: [new MathRun('k')], subScript: [new MathRun('AE')] }),
                  new MathRun(' := '),
                  new MathFraction({
                    numerator: [
                      new MathSuperScript({
                        children: [new MathRun('cos')],
                        superScript: [new MathRun('2')],
                      }),
                      new MathRoundBrackets({
                        children: [
                          new MathSubScript({ children: [new MathRun('φ')], subScript: [new MathRun('S')] }),
                          new MathRun(' − '),
                          new MathSubScript({ children: [new MathRun('θ')], subScript: [new MathRun('MO')] }),
                          new MathRun(' − '),
                          new MathSubScript({ children: [new MathRun('β')], subScript: [new MathRun('Stem')] }),
                        ],
                      }),
                    ],
                    denominator: [
                      new MathRun('cos'),
                      new MathRoundBrackets({ children: [new MathSubScript({ children: [new MathRun('θ')], subScript: [new MathRun('MO')] })] }),
                      new MathRun(' · '),
                      new MathSuperScript({ children: [new MathRun('cos')], superScript: [new MathRun('2')] }),
                      new MathRoundBrackets({ children: [new MathSubScript({ children: [new MathRun('β')], subScript: [new MathRun('Stem')] })] }),
                      new MathRun(' · cos'),
                      new MathRoundBrackets({
                        children: [
                          new MathSubScript({ children: [new MathRun('δ')], subScript: [new MathRun('S')] }),
                          new MathRun(' + '),
                          new MathSubScript({ children: [new MathRun('β')], subScript: [new MathRun('Stem')] }),
                          new MathRun(' + '),
                          new MathSubScript({ children: [new MathRun('θ')], subScript: [new MathRun('MO')] }),
                        ],
                      }),
                    ],
                  }),
                  new MathRun('  ·  '),
                  new MathSuperScript({
                    children: [
                      new MathRoundBrackets({
                        children: [
                          new MathRun('1 + '),
                          // √ via raw OOXML m:rad (MathSqrt not exported by docx v9)
                          new OMathElement('m:rad', undefined, [
                            new OMathElement('m:radPr', undefined, [
                              new OMathElement('m:degHide', { 'm:val': '1' }),
                            ]),
                            new OMathElement('m:deg'),
                            new OMathElement('m:e', undefined, [
                              new MathFraction({
                                numerator: [
                                  new MathRun('sin'),
                                  new MathRoundBrackets({
                                    children: [
                                      new MathSubScript({ children: [new MathRun('φ')], subScript: [new MathRun('S')] }),
                                      new MathRun(' + '),
                                      new MathSubScript({ children: [new MathRun('δ')], subScript: [new MathRun('S')] }),
                                    ],
                                  }),
                                  new MathRun(' · sin'),
                                  new MathRoundBrackets({
                                    children: [
                                      new MathSubScript({ children: [new MathRun('φ')], subScript: [new MathRun('S')] }),
                                      new MathRun(' − '),
                                      new MathSubScript({ children: [new MathRun('θ')], subScript: [new MathRun('MO')] }),
                                      new MathRun(' − i'),
                                    ],
                                  }),
                                ],
                                denominator: [
                                  new MathRun('cos'),
                                  new MathRoundBrackets({
                                    children: [
                                      new MathSubScript({ children: [new MathRun('δ')], subScript: [new MathRun('S')] }),
                                      new MathRun(' + '),
                                      new MathSubScript({ children: [new MathRun('β')], subScript: [new MathRun('Stem')] }),
                                      new MathRun(' + '),
                                      new MathSubScript({ children: [new MathRun('θ')], subScript: [new MathRun('MO')] }),
                                    ],
                                  }),
                                  new MathRun(' · cos'),
                                  new MathRoundBrackets({
                                    children: [
                                      new MathRun('i − '),
                                      new MathSubScript({ children: [new MathRun('β')], subScript: [new MathRun('Stem')] }),
                                    ],
                                  }),
                                ],
                              }) as unknown as XmlComponent,
                            ]),
                          ]) as unknown as MathComponent,
                        ],
                      }),
                    ],
                    superScript: [new MathRun('−2')],
                  }),
                  new MathRun(`  =  ${N(kAeVal, 3)}`),
                ],
              }),
            ],
          }),

      // ── A.7  Applied Loads ────────────────────────────────────────────────
      secHead('Applied Loads', ''),

      // 7.1 Vertical Pressure from Retained Fill
      page4Para([run('Vertical Pressure from Retained Fill', { bold: true })], { after: 80 }),
      vt([
        vr([matrixLine([run('σ'), sub('EV'), run(' := γ'), sub('S'), run(' · DH = ')],
          dhStr.map((v) => N((gammaSVal / 1000) * parseFloat(v), 3)), 'ksf')],
          'Vertical earth pressure and resultant load per linear foot along wall. AASHTO Figure 11.10.6.2.1-2'),
        vr([matrixLine([run('P'), sub('EV'), run(' := σ'), sub('EV'), run(' · RL = ')],
          extVals((r) => r.pEv, 3), 'kip/ft')], ''),
        vr([calcLine([run('Y'), sub('EV'), run(' := 0 '), blue('ft', { italic: true })])],
          'No footing to act on, no moment arm'),
        vr([matrixLine([run('M'), sub('EV'), run(' := Y'), sub('EV'), run(' · P'), sub('EV'), run(' = ')],
          extVals((r) => r.mEv, 3), 'kip·ft/ft')],
          'Resulting moment per lin foot'),
      ]),
      blank(140),

      // 7.2 Horizontal Pressure from Retained Fill
      page4Para([run('Horizontal Pressure from Retained Fill', { bold: true })], { after: 80 }),
      vt([
        vr([matrixLine([run('σ'), sub('EH'), run(' := σ'), sub('EV'), run(' · k'), sub('A.S'), run(' = ')],
          dhStr.map((v) => N((gammaSVal / 1000) * parseFloat(v) * kaVal, 3)), 'ksf')],
          'Horizontal Earth Pressure. AASHTO 11.10.5.2-1'),
        vr([matrixLine([run('P'), sub('EH'), run(' := 0.5 · γ'), sub('S'), run(' · k'), sub('A.S'), run(' · DH² = ')],
          extVals((r) => r.pEh, 3), 'kip/ft')], ''),
        vr([matrixLine([run('Y'), sub('EH'), run(' := (1/3) · DH = ')],
          dhStr.map((v) => N(parseFloat(v) / 3, 3)), 'ft')], ''),
        vr([matrixLine([run('M'), sub('EH'), run(' := P'), sub('EH'), run(' · Y'), sub('EH'), run(' = ')],
          extVals((r) => r.mEh, 3), 'kip·ft/ft')], ''),
      ]),

      // 7.3 Horizontal Live Load Surcharge [LS]: h_eq piecewise
      headingRef('Horizontal Live Load Surcharge [LS]', 'AASHTO 3.11.6.4'),
      vt([
        vr([
          calcLine([run('h'), sub('eq'), run(' := for i ∈ 0..2', { italic: true })]),
          calcLine([run('      if DH'), sub('i'), run(' > 20 '), blue('ft', { italic: true })]),
          calcLine([run('         h'), sub('i'), run(' ← 2 '), blue('ft', { italic: true })]),
          calcLine([run('      else if DH'), sub('i'), run(' > 10 '), blue('ft', { italic: true })]),
          calcLine([run('         h'), sub('i'), run(' ← 2 '), blue('ft', { italic: true }), run(' −  (20 '), blue('ft', { italic: true }), run(' − DH'), sub('i'), run(') / 10 '), blue('ft', { italic: true }), run(' · (2 '), blue('ft', { italic: true }), run(' − 3 '), blue('ft', { italic: true }), run(')')]),
          calcLine([run('      else if DH'), sub('i'), run(' > 5 '), blue('ft', { italic: true })]),
          calcLine([run('         h'), sub('i'), run(' ← 3 '), blue('ft', { italic: true }), run(' −  (10 '), blue('ft', { italic: true }), run(' − DH'), sub('i'), run(') / 5 '), blue('ft', { italic: true }), run(' · (3 '), blue('ft', { italic: true }), run(' − 4 '), blue('ft', { italic: true }), run(')')]),
          calcLine([run('      else')]),
          calcLine([run('         h'), sub('i'), run(' ← 4 '), blue('ft', { italic: true })], { after: 80 }),
          matrixLine([run('      h'), sub('eq'), run(' = ')], extVals((r) => r.hEq, 2), 'ft'),
        ], 'Equivalent soil depth, abutment perpendicular to traffic. Interpolate for each DH. AASHTO Table 3.11.6.4-1'),
      ]),
      blank(140),

      // 7.4 Vertical Pressure from LS
      page4Para([run('Vertical Pressure from LS', { bold: true })], { after: 80 }),
      vt([
        vr([matrixLine([run('σ'), sub('LS.V'), run(' := γ'), sub('S'), run(' · h'), sub('eq'), run(' = ')],
          extVals((r) => (gammaSVal / 1000) * r.hEq, 3), 'ksf')],
          'Vertical LS pressure and resultant load per linear foot along wall. AASHTO Figure 11.10.6.2.1-2'),
        vr([matrixLine([run('P'), sub('LS.V'), run(' := σ'), sub('LS.V'), run(' · RL = ')],
          extVals((r) => r.pLsV, 3), 'kip/ft')], ''),
        vr([calcLine([run('Y'), sub('LS.V'), run(' := 0 '), blue('ft', { italic: true })])],
          'No footing to act on, no moment arm'),
        vr([matrixLine([run('M'), sub('LS.V'), run(' := Y'), sub('LS.V'), run(' · P'), sub('LS.V'), run(' = ')],
          extVals((r) => r.mLsV, 3), 'kip·ft/ft')],
          'Resulting moment per lin foot'),
      ]),

      // 7.5 Horizontal Pressure from LS
      page4Para([run('Horizontal Pressure from LS', { bold: true })], { after: 80 }),
      vt([
        vr([matrixLine([run('σ'), sub('LS.H'), run(' := γ'), sub('S'), run(' · h'), sub('eq'), run(' · k'), sub('A.S'), run(' = ')],
          extVals((r) => (gammaSVal / 1000) * r.hEq * kaVal, 3), 'ksf')],
          'Horizontal LS pressure and resultant load per linear foot along wall. AASHTO Figure 11.10.6.2.1-2'),
        vr([matrixLine([run('P'), sub('LS.H'), run(' := σ'), sub('LS.H'), run(' · DH = ')],
          extVals((r) => r.pLsH, 3), 'kip/ft')], ''),
        vr([calcLine([run('Y'), sub('LS.H'), run(' := 0.5 · DH')])],
          'Uniform pressure with depth, resultant acts at 0.5·DH'),
        vr([matrixLine([run('M'), sub('LS.H'), run(' := P'), sub('LS.H'), run(' · Y'), sub('LS.H'), run(' = ')],
          extVals((r) => r.mLsH, 3), 'kip·ft/ft')],
          'Resulting moment per lin foot'),
      ]),
      blank(140),

      // 7.6 Hydrostatic Water Pressure [WA]
      headingRef('Hydrostatic Water Pressure [WA]', 'AASHTO 3.7.1'),
      calcP('Underdrain proposed behind MSE wall. Assume no hydrostatic pressure.', { after: 120 }),

      // 7.7 Horizontal Seismic Load [EQ]
      headingRef('Horizontal Seismic Load [EQ]', 'AASHTO 11.10.7.1'),
      vt([
        vr([calcLine([run('k'), sub('H'), run(' := F'), sub('PGA.EQ'), run(' · PGA = '), blue(kHVal.toFixed(4))])],
          'Horizontal Acceleration Coefficient. AASHTO 11.6.5.2.1'),
        vr([matrixLine([run('w'), sub('IR'), run(' := k'), sub('H'), run(' · (0.5 · γ'), sub('S'), run(' · DH²) = ')],
          omIRn.map((v) => N(v, 3)), 'kip/ft')],
          'Inertia Force during seismic loading. Use 0.5·DH as effective width. AASHTO 11.10.7.1, AASHTO 11.6.5.1'),
        vr([matrixLine([run('w'), sub('AE'), run(' := 0.5 · γ'), sub('S'), run(' · DH² · k'), sub('AE'), run(' = ')],
          omAEn.map((v) => N(v, 3)), 'kip/ft')],
          'Dynamic Loaded Earth Pressure. AASHTO 11.6.5.3-1'),
        vr([matrixLine([run('w'), sub('EQ.1'), run(' := 1 · w'), sub('AE'), run(' + 0.5 · w'), sub('IR'), run(' = ')],
          wEQ1n.map((v) => N(v, 3)), 'kip/ft')], ''),
        vr([matrixLine([run('w'), sub('EQ.2'), run(' := 0.5 · w'), sub('AE'), run(' + w'), sub('IR'), run(' = ')],
          wEQ2n.map((v) => N(v, 3)), 'kip/ft')], ''),
        vr([matrixLine([run('P'), sub('EQ'), run(' := max( w'), sub('EQ.1'), run(' , w'), sub('EQ.2'), run(' ) = ')],
          extVals((r) => r.pEq, 3), 'kip/ft')],
          'Lateral pressure for seismic load and associated moment arm. AASHTO Figure 11.6.5.1-1'),
        vr([matrixLine([run('σ'), sub('EQ'), run(' := P'), sub('EQ'), run(' / DH = ')],
          extVals((r) => r.pEq / r.dh, 3), 'ksf')],
          'Lateral pressure on panel facing'),
        vr([calcLine([
          run('Y'), sub('EQ.IR'), run(' := 0.5 · DH'),
          run('          '),
          run('Y'), sub('EQ.AE'), run(' := (1/3) · DH'),
        ])], 'AASHTO Figure 11.10.7.1-1'),
        vr([matrixLine(
          [run('M'), sub('EQ'), run(' := max( w'), sub('AE'), run('·Y'), sub('EQ.AE'), run(' + 0.5·w'), sub('IR'), run('·Y'), sub('EQ.IR'), run(' , 0.5·w'), sub('AE'), run('·Y'), sub('EQ.AE'), run(' + w'), sub('IR'), run('·Y'), sub('EQ.IR'), run(' ) = ')],
          extVals((r) => r.mEq, 3), 'kip·ft/ft')],
          'Resulting seismic moment per lin foot'),
      ]),

      // ── Load Factors and Combinations: Vertical Loads ──
      secHead('Load Factors and Combinations: Vertical Loads', 'AASHTO Table 3.4.1-1/2'),
      (() => {
        const sp = { before: 0, after: 60, line: lineSpacing } as const;
        const fCell = (runs: TextRun[], w: number) => new TableCell({
          width: { size: w, type: WidthType.DXA }, borders: noBorder,
          margins: { top: 0, bottom: 0, left: 0, right: 80 },
          children: [new Paragraph({ spacing: sp, children: runs })],
        });
        const fRow = (a: TextRun[], b: TextRun[], c: TextRun[]) =>
          new TableRow({ children: [fCell(a, 3040), fCell(b, 3160), fCell(c, 3160)] });
        const hdr = (t: string) => [new TextRun({ text: t, bold: true, underline: {}, size: 22 })];
        const g   = (s: string, v: string) => [run('γ', { italic: true }), new TextRun({ text: s, subScript: true, size: 22 }), run(` := ${v}`)];
        return new Table({
          width: { size: 9360, type: WidthType.DXA }, layout: TableLayoutType.FIXED,
          columnWidths: [3040, 3160, 3160], borders: noBorder,
          rows: [
            fRow(hdr('Service I'),       hdr('Strength I'),       hdr('Extreme Event I')),
            fRow(g('LS.Ser.I', '1'),     g('LS.Str.I', '1.75'),   g('LS.EE.I', '0.50')),
            fRow(g('EH.Ser.I', '1'),     g('EH.Str.I', '1.50'),   g('EH.EE.I', '0')),
            fRow(g('EV.Ser.I', '1'),     g('EV.Str.I', '1.35'),   g('EV.EE.I', '1')),
            fRow(g('EQ.Ser.I', '0'),     g('EQ.Str.I', '0'),      g('EQ.EE.I', '1')),
            fRow([],                      g('EV.Str.I.Min', '1'),  []),
          ],
        });
      })(),
      blank(120),
      page4Para([run('Vertical Factored Load Combinations', { bold: true })], { after: 100 }),
      matrixLine([run('P'), sub('U.Ser.I.Vert'), run(' := γ'), sub('LS.Ser.I'), run(' · P'), sub('LS.V'), run(' + γ'), sub('EV.Ser.I'), run(' · P'), sub('EV'), run(' = ')], extVals((r) => r.puSerIV, 3), 'kip/ft'),
      matrixLine([run('M'), sub('U.Ser.I.Vert'), run(' := γ'), sub('LS.Ser.I'), run(' · M'), sub('LS.V'), run(' + γ'), sub('EV.Ser.I'), run(' · M'), sub('EV'), run(' = ')], extVals((r) => r.muSerIV, 3), 'kip·ft/ft', { after: 100 }),
      matrixLine([run('P'), sub('U.Str.I.Vert'), run(' := γ'), sub('LS.Str.I'), run(' · P'), sub('LS.V'), run(' + γ'), sub('EV.Str.I'), run(' · P'), sub('EV'), run(' = ')], extVals((r) => r.puStrIV, 3), 'kip/ft'),
      matrixLine([run('M'), sub('U.Str.I.Vert'), run(' := γ'), sub('LS.Str.I'), run(' · M'), sub('LS.V'), run(' + γ'), sub('EV.Str.I'), run(' · M'), sub('EV'), run(' = ')], extVals((r) => r.muStrIV, 3), 'kip·ft/ft', { after: 100 }),
      matrixLine([run('P'), sub('U.EE.I.Vert'), run(' := γ'), sub('LS.EE.I'), run(' · P'), sub('LS.V'), run(' + γ'), sub('EV.EE.I'), run(' · P'), sub('EV'), run(' = ')], extVals((r) => r.puEeIV, 3), 'kip/ft'),
      matrixLine([run('M'), sub('U.EE.I.Vert'), run(' := γ'), sub('LS.EE.I'), run(' · M'), sub('LS.V'), run(' + γ'), sub('EV.EE.I'), run(' · M'), sub('EV'), run(' = ')], extVals((r) => r.muEeIV, 3), 'kip·ft/ft', { after: 140 }),

      // ── Load Factors and Combinations: Lateral Loads ──
      headingRef('Load Factors and Combinations: Lateral Loads', 'AASHTO Table 3.4.1-1/2'),
      (() => {
        const sp = { before: 0, after: 60, line: lineSpacing } as const;
        const fCell = (runs: TextRun[], w: number) => new TableCell({
          width: { size: w, type: WidthType.DXA }, borders: noBorder,
          margins: { top: 0, bottom: 0, left: 0, right: 80 },
          children: [new Paragraph({ spacing: sp, children: runs })],
        });
        const fRow = (a: TextRun[], b: TextRun[], c: TextRun[]) =>
          new TableRow({ children: [fCell(a, 3040), fCell(b, 3160), fCell(c, 3160)] });
        const hdr = (t: string) => [new TextRun({ text: t, bold: true, underline: {}, size: 22 })];
        const g   = (s: string, v: string) => [run('γ', { italic: true }), new TextRun({ text: s, subScript: true, size: 22 }), run(` := ${v}`)];
        return new Table({
          width: { size: 9360, type: WidthType.DXA }, layout: TableLayoutType.FIXED,
          columnWidths: [3040, 3160, 3160], borders: noBorder,
          rows: [
            fRow(hdr('Service I'),       hdr('Strength I'),       hdr('Extreme Event I')),
            fRow(g('LS.Ser.I', '1'),     g('LS.Str.I', '1.75'),   g('LS.EE.I', '0.50')),
            fRow(g('EH.Ser.I', '1'),     g('EH.Str.I', '1.50'),   g('EH.EE.I', '0')),
            fRow(g('EV.Ser.I', '1'),     g('EV.Str.I', '1.35'),   g('EV.EE.I', '1')),
            fRow(g('EQ.Ser.I', '0'),     g('EQ.Str.I', '0'),      g('EQ.EE.I', '1')),
            fRow([],                      g('EV.Str.I.Min', '1'),  []),
          ],
        });
      })(),
      blank(120),
      page4Para([run('Lateral Factored Load Combinations', { bold: true })], { after: 100 }),
      matrixLine([run('P'), sub('U.Ser.I.Lat'), run(' := γ'), sub('LS.Ser.I'), run(' · P'), sub('LS.H'), run(' + γ'), sub('EH.Ser.I'), run(' · P'), sub('EH'), run(' + γ'), sub('EQ.Ser.I'), run(' · P'), sub('EQ'), run(' = ')], extVals((r) => r.puSerILat, 3), 'kip/ft'),
      matrixLine([run('M'), sub('U.Ser.I.Lat'), run(' := γ'), sub('LS.Ser.I'), run(' · M'), sub('LS.H'), run(' + γ'), sub('EH.Ser.I'), run(' · M'), sub('EH'), run(' + γ'), sub('EQ.Ser.I'), run(' · M'), sub('EQ'), run(' = ')], extVals((r) => r.muSerILat, 3), 'kip·ft/ft', { after: 100 }),
      matrixLine([run('P'), sub('U.Str.I.Lat'), run(' := γ'), sub('LS.Str.I'), run(' · P'), sub('LS.H'), run(' + γ'), sub('EH.Str.I'), run(' · P'), sub('EH'), run(' + γ'), sub('EQ.Str.I'), run(' · P'), sub('EQ'), run(' = ')], extVals((r) => r.puStrILat, 3), 'kip/ft'),
      matrixLine([run('M'), sub('U.Str.I.Lat'), run(' := γ'), sub('LS.Str.I'), run(' · M'), sub('LS.H'), run(' + γ'), sub('EH.Str.I'), run(' · M'), sub('EH'), run(' + γ'), sub('EQ.Str.I'), run(' · M'), sub('EQ'), run(' = ')], extVals((r) => r.muStrILat, 3), 'kip·ft/ft', { after: 100 }),
      matrixLine([run('P'), sub('U.EE.I.Lat'), run(' := γ'), sub('LS.EE.I'), run(' · P'), sub('LS.H'), run(' + γ'), sub('EH.EE.I'), run(' · P'), sub('EH'), run(' + γ'), sub('EQ.EE.I'), run(' · P'), sub('EQ'), run(' = ')], extVals((r) => r.puEeILat, 3), 'kip/ft'),
      matrixLine([run('M'), sub('U.EE.I.Lat'), run(' := γ'), sub('LS.EE.I'), run(' · M'), sub('LS.H'), run(' + γ'), sub('EH.EE.I'), run(' · M'), sub('EH'), run(' + γ'), sub('EQ.EE.I'), run(' · M'), sub('EQ'), run(' = ')], extVals((r) => r.muEeILat, 3), 'kip·ft/ft', { after: 140 }),

      // ════════ EXTERNAL STABILITY ════════
      secHead('External Stability', ''),

      // ── Bearing Resistance: Service I ──
      headingRef('Bearing Resistance: Service I', 'FHWA 4.4.6c'),
      vt([
        vr([mFracLine([ms('e','B.Ser'), new MathRun(' := ')], [ms('M','U.Ser.I.Lat')], [ms('P','U.Ser.I.Vert')], extVals((r) => r.eccBrgSerI, 3), 'ft')],
          'Eccentricity of resulting force. FHWA 4-19'),
        vr([matrixLine([run("B'"), sub('Ser'), run(' := RL − 2 · e'), sub('B.Ser'), run(' = ')], extVals((r) => r.rl - 2 * r.eccBrgSerI, 3), 'ft')],
          'Effective Width of reinforced soil zone. Neglect facing width / weight'),
      ]),
      calcTwoColumn(
        [mFracLine([ms('σ','Ser.Bear'), new MathRun(' := ')], [ms('P','U.Ser.I.Vert')], [new MathRun("B'"), ms('','Ser')], extVals((r) => r.suBrgSerI, 3), 'ksf')],
        [matrixLine([run('σ'), sub('F.Bear.Ser'), run(' = ')], extVals(() => sigmaBrgVal, 3), 'ksf'),
         noteP('Uniform Bearing Pressure. FHWA 4-18')],
        120,
      ),
      blank(80),
      checkBox([run('Check'), sub('Ser.Bearing'), run(' := if(σ'), sub('Ser.Bear'), run(' < σ'), sub('F.Bear.Ser'), run(', "Adequate", "INADEQUATE") = ')], extChecks((r) => r.checkBrgSerI)),
      blank(140),

      // ── Bearing Resistance: Strength I ──
      headingRef('Bearing Resistance: Strength I', 'FHWA 4.4.6c'),
      vt([
        vr([mFracLine([ms('e','B.Str'), new MathRun(' := ')], [ms('M','U.Str.I.Lat')], [ms('P','U.Str.I.Vert')], extVals((r) => r.eccBrgStrI, 3), 'ft')],
          'Eccentricity of resulting force. FHWA 4-19'),
        vr([matrixLine([run("B'"), sub('Str'), run(' := RL − 2 · e'), sub('B.Str'), run(' = ')], extVals((r) => r.rl - 2 * r.eccBrgStrI, 3), 'ft')],
          'Effective Width of reinforced soil zone. Neglect facing width / weight'),
        vr([mFracLine([ms('σ','Str.Bear'), new MathRun(' := ')], [ms('P','U.Str.I.Vert')], [new MathRun("B'"), ms('','Str')], extVals((r) => r.suBrgStrI, 3), 'ksf')],
          'Uniform Bearing Pressure. FHWA 4-18'),
      ]),
      matrixLine([run('σ'), sub('F.Bear.Fact'), run(' := φ'), sub('b.Str'), run(' · σ'), sub('F.Bear.Nom'), run(' = ')], extVals(() => 0.65 * sigmaBrgVal, 3), 'ksf'),
      blank(80),
      checkBox([run('Check'), sub('Str.Bearing'), run(' := if(σ'), sub('Str.Bear'), run(' < σ'), sub('F.Bear.Fact'), run(', "Adequate", "INADEQUATE") = ')], extChecks((r) => r.checkBrgStrI)),
      blank(140),

      // ── Bearing Resistance: Extreme Event I ──
      headingRef('Bearing Resistance: Extreme Event I', 'FHWA 4.4.6c'),
      vt([
        vr([mFracLine([ms('e','B.EE'), new MathRun(' := ')], [ms('M','U.EE.I.Lat')], [ms('P','U.EE.I.Vert')], extVals((r) => r.eccBrgEeI, 3), 'ft')],
          'Eccentricity of resulting force. FHWA 4-19'),
        vr([matrixLine([run("B'"), sub('EE'), run(' := RL − 2 · e'), sub('B.EE'), run(' = ')], extVals((r) => r.rl - 2 * r.eccBrgEeI, 3), 'ft')],
          'Effective Width of reinforced soil zone. Neglect facing width / weight'),
        vr([mFracLine([ms('σ','EE.Bear'), new MathRun(' := ')], [ms('P','U.EE.I.Vert')], [new MathRun("B'"), ms('','EE')], extVals((r) => r.suBrgEeI, 3), 'ksf')],
          'Uniform Bearing Pressure. FHWA 4-18'),
      ]),
      matrixLine([run('σ'), sub('F.Bear.Fact.EE'), run(' := φ'), sub('b.EE'), run(' · σ'), sub('F.Bear.Nom'), run(' = ')], extVals(() => 0.9 * sigmaBrgVal, 3), 'ksf'),
      blank(80),
      checkBox([run('Check'), sub('EE.Bearing'), run(' := if(σ'), sub('EE.Bear'), run(' < σ'), sub('F.Bear.Fact.EE'), run(', "Adequate", "INADEQUATE") = ')], extChecks((r) => r.checkBrgEeI)),
      blank(140),

      // ── Overturning (Eccentricity of Resultant) ──
      headingRef('Overturning (Eccentricity of Resultant)', 'AASHTO 11.10.5.5'),
      vt([
        vr([matrixLine([run('e'), sub('Max.Soil'), run(' := RL · 0.25 = ')], rlStr.map((v) => N(parseFloat(v) * 0.25, 3)), 'ft')],
          'Eccentricity Limit for Soil is within middle one-half of base width. FHWA 4.4.6.b. AASHTO limit is 2/3s of base, use stricter requirement'),
      ]),
      calcLine([run('Neglect vertical Live Load Surcharge benefit in eccentricity calculations. Use min load factor for EV.')], { after: 120 }),

      page4Para([run('Strength I Check', { bold: true })], { after: 80 }),
      vt([
        vr([mFracLine([ms('e','O.Str'), new MathRun(' := ')], [ms('M','U.Str.I.Lat')], [ms('γ','EV.Str.I.Min'), new MathRun(' · '), ms('P','EV')], extVals((r) => r.eccOvtStrI, 3), 'ft')],
          'Eccentricity of resulting force. FHWA 4-19'),
      ]),
      checkBox([run('Check'), sub('Str.Overturning'), run(' := if(e'), sub('O.Str'), run(' < e'), sub('Max.Soil'), run(', "Adequate", "INADEQUATE") = ')], extChecks((r) => r.checkOvtStrI)),
      blank(120),

      page4Para([run('Extreme Event I Check', { bold: true })], { after: 80 }),
      vt([
        vr([mFracLine([ms('e','O.EE'), new MathRun(' := ')], [ms('M','U.EE.I.Lat')], [ms('γ','EV.EE.I'), new MathRun(' · '), ms('P','EV')], extVals((r) => r.eccOvtEeI, 3), 'ft')],
          'Eccentricity of resulting force. FHWA 4-19'),
      ]),
      checkBox([run('Check'), sub('EE.Overturning'), run(' := if(e'), sub('O.EE'), run(' < e'), sub('Max.Soil'), run(', "Adequate", "INADEQUATE") = ')], extChecks((r) => r.checkOvtEeI)),
      blank(140),

      // ── Sliding Resistance ──
      headingRef('Sliding Resistance', 'AASHTO 11.10.5.3'),
      calcTwoColumn(
        [calcLine([run('φ'), sub('Sliding'), run(' := 1.0')])],
        [noteP('AASHTO Table 11.5.7-1')],
        140,
      ),

      page4Para([run('Strength I Capacity', { bold: true })], { after: 80 }),
      vt([
        vr([matrixLine([run('P'), sub('U.Str.I.Lat'), run(' = ')], extVals((r) => r.puStrILat, 3), 'kip/ft')],
          'Sliding Capacity FHWA 4-12. Neglect vertical LS load'),
      ]),
      matrixLine([run('φR'), sub('Str.Slide'), run(' := φ'), sub('Sliding'), run(' · γ'), sub('EV.Str.I.Min'), run(' · P'), sub('EV'), run(' · min(tan(φ'), sub('F'), run('), tan(φ'), sub('S'), run(')) = ')], extVals((r) => r.phiRrStrIFSoil, 3), 'kip/ft', { after: 80 }),
      checkBox([run('Check'), sub('Str.Sliding'), run(' := if(φR'), sub('Str.Slide'), run(' > P'), sub('U.Str.I.Lat'), run(', "Adequate", "INADEQUATE") = ')], extChecks((r) => r.checkSldStrIFSoil)),
      blank(120),

      page4Para([run('Extreme Event I Capacity', { bold: true })], { after: 80 }),
      vt([
        vr([matrixLine([run('P'), sub('U.EE.I.Lat'), run(' = ')], extVals((r) => r.puEeILat, 3), 'kip/ft')],
          'Sliding Capacity FHWA 4-12. Neglect vertical LS load'),
      ]),
      matrixLine([run('φR'), sub('EE.Slide'), run(' := φ'), sub('Sliding'), run(' · γ'), sub('EV.EE.I'), run(' · P'), sub('EV'), run(' · min(tan(φ'), sub('F'), run('), tan(φ'), sub('S'), run(')) = ')], extVals((r) => r.phiRrEeIFSoil, 3), 'kip/ft', { after: 80 }),
      checkBox([run('Check'), sub('EE.Sliding'), run(' := if(φR'), sub('EE.Slide'), run(' > P'), sub('U.EE.I.Lat'), run(', "Adequate", "INADEQUATE") = ')], extChecks((r) => r.checkSldEeIFSoil)),
      blank(140),

      // ── Summary Tables for External Stability ──
      headingRef('Summary Tables for Excel Spreadsheets', `DH = ${dhStr[0]} ft - ${dhStr[dhStr.length - 1]} ft`),
      ...(() => {
        // Helper to format limit state text
        const fmtLS = (ls: string) => {
          const s = ls.toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
          return s.replace('Strength I', '- Strength I').replace('Extreme Event I', '- Extreme Event I').replace('Service I', '- Service I');
        };
        const HFILL = '1E3A5F';  // dark blue header
        const HFILL2 = '2B5EA7'; // medium blue sub-header
        const sz = 14; // 7pt
        const hCell = (text: string, span = 1, fill = HFILL) => new TableCell({
          columnSpan: span, borders: cellBorder,
          shading: { type: ShadingType.SOLID, fill, color: fill },
          margins: { top: 40, bottom: 40, left: 80, right: 80 },
          children: [new Paragraph({ spacing: { before: 0, after: 0 }, alignment: AlignmentType.CENTER,
            children: [new TextRun({ text, bold: true, size: sz, color: 'FFFFFF' })] })],
        });
        const dCell = (text: string, ok?: boolean) => new TableCell({
          borders: cellBorder,
          shading: ok === true ? { type: ShadingType.SOLID, fill: OK_BG, color: OK_BG }
                : ok === false ? { type: ShadingType.SOLID, fill: FAIL_BG, color: FAIL_BG }
                : undefined,
          margins: { top: 30, bottom: 30, left: 80, right: 80 },
          children: [new Paragraph({ spacing: { before: 0, after: 0 }, alignment: AlignmentType.CENTER,
            children: [new TextRun({ text, size: sz })] })],
        });
        const isOk = (c: string) => c.toLowerCase() === 'adequate';
        const chkCell = (c: string) => dCell(c, isOk(c));

        // Strength I table (16 cols)
        const strIColWidths = [520,520,560,600,490,560,640,520,600,490,620,540,560,560,640,536];
        const strITable = new Table({
          width: { size: 9360, type: WidthType.DXA }, alignment: AlignmentType.CENTER, borders: tblBorder,
          columnWidths: strIColWidths,
          rows: [
            new TableRow({ children: [
              hCell('', 2), hCell('Bearing Pressure Calculations', 5), hCell('Overturning / Sliding Calculations', 9),
            ]}),
            new TableRow({ children: [
              hCell('DH\n(ft)',1,HFILL2), hCell('RL\n(ft)',1,HFILL2),
              hCell('Pu_brg\n(kip/ft)',1,HFILL2), hCell('Mu_brg\n(kip-ft/ft)',1,HFILL2), hCell('eccen.\n(ft)',1,HFILL2),
              hCell('σu_bearing\n(ksf)',1,HFILL2), hCell('Bearing\nCheck',1,HFILL2),
              hCell('Pu_xd\n(kip/ft)',1,HFILL2), hCell('Mu_xd\n(kip-ft/ft)',1,HFILL2), hCell('eccen.\n(ft)',1,HFILL2),
              hCell('Eccen.\nCheck',1,HFILL2), hCell('Hu_xd\n(kip/ft)',1,HFILL2),
              hCell('φR_sand\n(kip/ft)',1,HFILL2), hCell('φR_clay\n(kip/ft)',1,HFILL2),
              hCell('Sliding\nCheck Sand',1,HFILL2), hCell('Sliding\nCheck Clay',1,HFILL2),
            ]}),
            ...extRows.map((r) => new TableRow({ children: [
              dCell(N(r.dh,2)), dCell(N(r.rl,2)),
              dCell(N(r.puStrIV,2)), dCell(N(r.muStrILat,2)), dCell(N(r.eccBrgStrI,2)),
              dCell(N(r.suBrgStrI,2)), chkCell(r.checkBrgStrI),
              dCell(N(r.pEv,2)), dCell(N(r.muStrILat,2)), dCell(N(r.eccOvtStrI,2)),
              chkCell(r.checkOvtStrI), dCell(N(r.puStrILat,2)),
              dCell(N(r.phiRrStrIClass1,2)), dCell(N(r.phiRrStrIFSoil,2)),
              chkCell(r.checkSldStrIClass1), chkCell(r.checkSldStrIFSoil),
            ]})),
          ],
        });

        // Extreme Event I table (same 16-col structure)
        const eeITable = new Table({
          width: { size: 9360, type: WidthType.DXA }, alignment: AlignmentType.CENTER, borders: tblBorder,
          columnWidths: strIColWidths,
          rows: [
            new TableRow({ children: [
              hCell('', 2), hCell('Bearing Pressure Calculations', 5), hCell('Overturning / Sliding Calculations', 9),
            ]}),
            new TableRow({ children: [
              hCell('DH\n(ft)',1,HFILL2), hCell('RL\n(ft)',1,HFILL2),
              hCell('Pu_brg\n(kip/ft)',1,HFILL2), hCell('Mu_brg\n(kip-ft/ft)',1,HFILL2), hCell('eccen.\n(ft)',1,HFILL2),
              hCell('σu_bearing\n(ksf)',1,HFILL2), hCell('Bearing\nCheck',1,HFILL2),
              hCell('Pu_xd\n(kip/ft)',1,HFILL2), hCell('Mu_xd\n(kip-ft/ft)',1,HFILL2), hCell('eccen.\n(ft)',1,HFILL2),
              hCell('Eccen.\nCheck',1,HFILL2), hCell('Hu_xd\n(kip/ft)',1,HFILL2),
              hCell('φR_sand\n(kip/ft)',1,HFILL2), hCell('φR_clay\n(kip/ft)',1,HFILL2),
              hCell('Sliding\nCheck Sand',1,HFILL2), hCell('Sliding\nCheck Clay',1,HFILL2),
            ]}),
            ...extRows.map((r) => new TableRow({ children: [
              dCell(N(r.dh,2)), dCell(N(r.rl,2)),
              dCell(N(r.puEeIV,2)), dCell(N(r.muEeILat,2)), dCell(N(r.eccBrgEeI,2)),
              dCell(N(r.suBrgEeI,2)), chkCell(r.checkBrgEeI),
              dCell(N(r.pEv,2)), dCell(N(r.muEeILat,2)), dCell(N(r.eccOvtEeI,2)),
              chkCell(r.checkOvtEeI), dCell(N(r.puEeILat,2)),
              dCell(N(r.phiRrEeIClass1,2)), dCell(N(r.phiRrEeIFSoil,2)),
              chkCell(r.checkSldEeIClass1), chkCell(r.checkSldEeIFSoil),
            ]})),
          ],
        });

        // Service I table (7 cols)
        const serIColWidths = [700,700,1000,1000,800,800,860];
        const serITable = new Table({
          width: { size: 5860, type: WidthType.DXA }, alignment: AlignmentType.CENTER, borders: tblBorder,
          columnWidths: serIColWidths,
          rows: [
            new TableRow({ children: [hCell('', 2), hCell('Bearing Pressure Calculations', 5)] }),
            new TableRow({ children: [
              hCell('DH\n(ft)',1,HFILL2), hCell('RL\n(ft)',1,HFILL2),
              hCell('Pu_brg\n(kip/ft)',1,HFILL2), hCell('Mu_brg\n(kip-ft/ft)',1,HFILL2),
              hCell('eccen.\n(ft)',1,HFILL2), hCell('σu_bearing\n(ksf)',1,HFILL2), hCell('Bearing\nCheck',1,HFILL2),
            ]}),
            ...extRows.map((r) => new TableRow({ children: [
              dCell(N(r.dh,2)), dCell(N(r.rl,2)),
              dCell(N(r.puSerIV,2)), dCell(N(r.muSerILat,2)), dCell(N(r.eccBrgSerI,2)),
              dCell(N(r.suBrgSerI,2)), chkCell(r.checkBrgSerI),
            ]})),
          ],
        });

        // Controls RL External Stability table (7 cols)
        const ctrlColWidths = [700,700,2100,580,820,820,820];
        const ctrlTable = new Table({
          width: { size: 6540, type: WidthType.DXA }, alignment: AlignmentType.CENTER, borders: tblBorder,
          columnWidths: ctrlColWidths,
          rows: [
            new TableRow({ children: [
              hCell('DH\n(ft)',1,HFILL2), hCell('RL\n(ft)',1,HFILL2),
              hCell('Controls RL External Stability',1,HFILL2), hCell('NL*',1,HFILL2),
              hCell('ABP\n(ksf)',1,HFILL2), hCell('FBP\n(ksf)',1,HFILL2), hCell('FSL\n(kip/ft)',1,HFILL2),
            ]}),
            ...extRows.map((r) => new TableRow({ children: [
              dCell(N(r.dh,2)), dCell(N(r.rl,2)), dCell(fmtLS(r.limitState)),
              dCell(String(r.nl)), dCell(N(r.suBrgSerI,2)), dCell(N(r.suBrgStrI,2)), dCell(N(r.puStrILat,2)),
            ]})),
          ],
        });

        return [
          docxPara('Strength I', { size: 20, bold: true }), strITable, blank(200),
          docxPara('Extreme Event I', { size: 20, bold: true }), eeITable, blank(200),
          docxPara('Service I', { size: 20, bold: true }), serITable, blank(200),
          docxPara('Controls RL External Stability', { size: 20, bold: true }), ctrlTable, blank(140),
        ];
      })(),

      // ════════ INTERNAL STABILITY ════════
      secHead('Internal Stability', ''),
      headingRef('Determine required soil reinforcement lengths and grade for Metallic Strip, Metallic Grid, and Geosynthetic options.', ''),
      ...(() => {
        const gStripVal = intSample.length > 0 && intSample[0].z > 0
          ? intSample[0].sEvZ / ((gammaSVal / 1000) * intSample[0].z) : 1;
        const maxDhVal = parseFloat(dhStr[dhStr.length - 1]);
        const nStripNeeded = maxDhVal / sVval;
        const nStripActual = nStripNeeded / gStripVal;
        const yPlusA = maxDhVal - nStripActual * sVval;
        const xIdx = dhStr.length - 1;
        const z1Str = intSample.length > 0 ? `${N(intSample[0].z, 0)} ft` : '8 ft';
        const symbolicZMatrix = new OMathElement('m:d', undefined, [
          new OMathElement('m:dPr', undefined, [
            new OMathElement('m:begChr', { 'm:val': '[' }),
            new OMathElement('m:endChr', { 'm:val': ']' }),
            new OMathElement('m:grow', { 'm:val': '1' }),
          ]),
          new OMathElement('m:e', undefined, [
            new OMathElement('m:m', undefined, [
              new OMathElement('m:mPr', undefined, [
                new OMathElement('m:baseJc', { 'm:val': 'center' }),
                new OMathElement('m:mcs', undefined, [
                  new OMathElement('m:mc', undefined, [
                    new OMathElement('m:mcPr', undefined, [
                      new OMathElement('m:count', { 'm:val': '1' }),
                      new OMathElement('m:mcJc', { 'm:val': 'center' }),
                    ]),
                  ]),
                ]),
              ]),
              new OMathElement('m:mr', undefined, [new OMathElement('m:e', undefined, [new MathRun(z1Str)])]),
              new OMathElement('m:mr', undefined, [new OMathElement('m:e', undefined, [
                new MathRun('0.5 · '),
                ms('DH', 'x') as unknown as OMathElement,
              ])]),
              new OMathElement('m:mr', undefined, [new OMathElement('m:e', undefined, [
                ms('DH', 'x') as unknown as OMathElement,
              ])]),
            ]),
          ]),
        ]);
        const zPara = new Paragraph({
          spacing: { before: 0, after: 90, line: lineSpacing },
          children: [
            new OfficeMath({ children: [ms('Z', ''), new MathRun(' := '), symbolicZMatrix as unknown as MathComponent, new MathRun(' = ')] }),
            mathMatrix(intVals((r) => r.z, 3), ''),
            run(' ft', { italic: true }),
          ],
        });
        const gStripParamVal = isWing ? numP('G.strip', gStripVal) : gStripVal;
        const nNeedPara = new Paragraph({
          spacing: { before: 0, after: 90, line: lineSpacing },
          children: [new OfficeMath({ children: [
            ms('n', 'Strip.Needed'), new MathRun(' := '),
            new MathFraction({ numerator: [ms('DH', 'x')], denominator: [new MathRun(`${sVval.toFixed(1)} ft`)] }),
            new MathRun(` = ${N(nStripNeeded, 1)}`),
          ] })],
        });
        const nActPara = new Paragraph({
          spacing: { before: 0, after: 90, line: lineSpacing },
          children: [new OfficeMath({ children: [
            ms('n', 'Strip.Actual'), new MathRun(' := '),
            new MathFraction({
              numerator: [ms('DH', 'x'), new MathRun(` − ${N(yPlusA, 1)} ft`)],
              denominator: [new MathRun(`${sVval.toFixed(1)} ft`)],
            }),
            new MathRun(` = ${N(nStripActual, 1)}`),
          ] })],
        });
        const gStrPara = new Paragraph({
          spacing: { before: 0, after: 140, line: lineSpacing },
          children: [new OfficeMath({ children: [
            ms('γ', 'Strip'), new MathRun(' := '),
            new MathFraction({ numerator: [ms('n', 'Strip.Needed')], denominator: [ms('n', 'Strip.Actual')] }),
            new MathRun(` = ${N(gStripParamVal, 3)}`),
          ] })],
        });
        const gStripWingPara = new Paragraph({
          spacing: { before: 0, after: 140, line: lineSpacing },
          children: [new OfficeMath({ children: [
            ms('γ', 'Strip'), new MathRun(` := G.strip = ${N(gStripParamVal, 3)}`),
          ] })],
        });
        return [
          vt([
            vr([calcLine([run('s'), sub('V'), run(` := ${sVval.toFixed(1)} ft`), run('          s'), sub('H'), run(' := 2.5 ft')])],
              'Typically horizontal and vertical spacing (if applicable)'),
            vr([calcLine([run('C := 2')])], 'Surface factor'),
            vr([
              calcLine([run('x := '), run(String(xIdx))]),
              zPara,
            ], 'Select which wall height to analyze. Reinforcement depths along wall, up to maximum. 8ft is highest'),
          ]),
          blank(80),
          ...(isWing
            ? [gStripWingPara]
            : [calcTwoColumn(
                [nNeedPara, gStrPara],
                [nActPara, noteP('DH extends above top of wall constructed. Amplify load on strips to account for additional load')],
                80,
              )]
          ),
        ];
      })(),

      // ── Geosynthetic Strip ──
      headingRef('Extensible Reinforcement Parameters: Continuous Geosynthetic Strip', ''),
      ...(() => {
        const fpGsVal = 0.67 * Math.tan((phiSdeg * Math.PI) / 180);
        const psiVal = 45 + phiSdeg * 0.5;
        const rlMaxVal = N(parseFloat(rlStr[rlStr.length - 1]), 3);
        return [
          vt([
            vr([calcLine([run('φ'), sub('PO.GeoStrip'), run(' := 0.9')])], ''),
            vr([calcLine([run("F'"), sub('GeoStrip'), run(` := 0.67 · tan(φ`), sub('S'), run(`) = ${N(fpGsVal, 3)}`)])],
              'AASHTO Figure 11.10.6.3.2-2'),
            vr([calcLine([run('α'), sub('GeoStrip'), run(' := 0.6')])], 'AASHTO Table 11.10.6.3.2-1'),
            vr([calcLine([run('R'), sub('C.GeoStrip'), run(' := 0.8')])], 'AASHTO 11.10.6.4.1'),
            vr([calcLine([run('k'), sub('R.GeoStrip'), run(` := 1.0 · k`), sub('A.S'), run(` = ${N(kaVal, 3)}`)])],
              'Lateral Stress Coefficient. AASHTO Figure 11.10.6.2.1-3'),
          ]),
          blank(80),
          page4Para([run('Max Stress at Reinforcement Level', { bold: true })], { after: 80 }),
          vt([
            vr([
              matrixLine([run('σ'), sub('EV.Z'), run(' := γ'), sub('S'), run(' · Z · γ'), sub('Strip'), run(' = ')], intVals((r) => r.sEvZ, 3), 'ksf'),
              matrixLine([run('σ'), sub('LS.Z'), run(' := γ'), sub('S'), run(' · h'), sub('eq'), run(' · γ'), sub('Strip'), run(' = ')], intVals((r) => r.sLsZ, 3), 'ksf'),
            ], 'Pressure at each Z level due to soil and LS loads'),
            vr([calcLine([run('σ'), sub('V'), run(' := σ'), sub('EV.Z')])], 'Unfactored vertical load'),
            vr([
              calcLine([run('σ'), sub('V.Str.I'), run(' := γ'), sub('EH.Str.I'), run(' · σ'), sub('EV.Z'), run(' + γ'), sub('LS.Str.I'), run(' · σ'), sub('LS.Z')]),
            ], ''),
            vr([
              matrixLine([run('σ'), sub('H.Str.I'), run(' := (γ'), sub('EH.Str.I'), run(' · σ'), sub('EV.Z'), run(' + γ'), sub('LS.Str.I'), run(' · σ'), sub('LS.Z'), run(') · k'), sub('R.GeoStrip'), run(' = ')], intVals((r) => r.sHStrI, 3), 'ksf'),
            ], 'Factored Pressure for each limit state'),
          ]),
          calcLine([run('σ'), sub('V.EE.I'), run(' := γ'), sub('EV.EE.I'), run(' · σ'), sub('EV.Z'), run(' + γ'), sub('LS.EE.I'), run(' · σ'), sub('LS.Z')]),
          matrixLine([run('σ'), sub('H.EE.I'), run(' := γ'), sub('EQ.EE.I'), run(' · σ'), sub('EQ'), run(' · γ'), sub('Strip'), run(' + γ'), sub('LS.EE.I'), run(' · σ'), sub('LS.Z'), run(' · k'), sub('R.GeoStrip'), run(' = ')], intVals((r) => r.sHEeI, 3), 'ksf'),
          blank(80),
          headingRef('Factored Tmax at Reinforcement Level', 'AASHTO 11.10.6.2.1-2'),
          calcTwoColumn(
            [matrixLine([run('T'), sub('Max.Str.I.GeoStrip'), run(' := σ'), sub('H.Str.I'), run(' · s'), sub('V'), run(' = ')], intVals((r) => r.tMaxStrIGstrip, 3), 'kip/ft')],
            [matrixLine([run('T'), sub('Max.EE.I.GeoStrip'), run(' := σ'), sub('H.EE.I'), run(' · s'), sub('V'), run(' = ')], intVals((r) => r.tMaxEeIGstrip, 3), 'kip/ft')],
            80,
          ),
          blank(80),
          headingRef('Min Required Resistance Zone', 'AASHTO 11.10.6.2.1-2'),
          calcLine([run('L'), sub('E.Str.I'), run(' := for i ∈ 0..2', { italic: true })]),
          calcLine([run('   L'), sub('i'), run(' ← T'), sub('Max.Str.I.GeoStrip'), run(' / (φ'), sub('PO.GeoStrip'), run(' · F\''), sub('GeoStrip'), run(' · α'), sub('GeoStrip'), run(' · σ'), sub('V'), run(' · C · R'), sub('C.GeoStrip'), run(')')], { after: 60 }),
          matrixLine([run('   L = ')], intVals((r) => r.lEStrIGs, 3), 'ft'),
          calcLine([run('L'), sub('E.EE.I'), run(' := for i ∈ 0..2', { italic: true })]),
          calcLine([run('   L'), sub('i'), run(' ← T'), sub('Max.EE.I.GeoStrip'), run(' / (φ'), sub('PO.GeoStrip'), run(' · F\''), sub('GeoStrip'), run(' · α'), sub('GeoStrip'), run(' · σ'), sub('V'), run(' · C · R'), sub('C.GeoStrip'), run(')')], { after: 60 }),
          matrixLine([run('   L = ')], intVals((r) => r.lEEeIGs, 3), 'ft'),
          calcLine([run('L'), sub('E.GeoStrip'), run(' := for i ∈ 0..2, L'), sub('i'), run(' ← max(L'), sub('E.Str.I'), run(', L'), sub('E.EE.I'), run(')')], { after: 60 }),
          matrixLine([run('   L = ')], intVals((r) => r.lEGeostrip, 3), 'ft'),
          blank(80),
          page4Para([run('Minimum Reinforcement Length', { bold: true })], { after: 80 }),
          calcLine([run('Ψ := 45 deg + φ'), sub('S'), run(` · 0.5 = ${N(psiVal, 0)} deg`)], { after: 80 }),
          vt([
            vr([
              calcLine([run('L'), sub('A'), run(' := for i ∈ 0..2', { italic: true })]),
              calcLine([run('   L'), sub('i'), run(' ← (DH'), sub('x'), run(' − Z'), sub('i'), run(') · tan(90 deg − Ψ)')], { after: 60 }),
              matrixLine([run('   L = ')], intVals((r) => r.lAGs, 3), 'ft'),
            ], 'Inextensible Reinforcement. AASHTO Figure 11.10.6.3.1-1'),
          ]),
          calcTwoColumn(
            [matrixLine([run('RL'), sub('Min.GeoStrip'), run(' := L'), sub('A'), run(' + L'), sub('E.GeoStrip'), run(' = ')], intVals((r) => r.rlMinGeostrip, 3), 'ft')],
            [calcLine([run('RL'), sub('x'), run(` = ${rlMaxVal} ft`)])],
            80,
          ),
          blank(80),
          checkBox([run('Check'), sub('PO.GeoStrip'), run(' := if(RL'), sub('Min.GeoStrip'), run(' < RL'), sub('x'), run(', "Adequate", "INADEQUATE") = ')], intChecks((r) => r.poGeostripCheck)),
          blank(80),
          headingRef('Long Term Design Strength [LTDS]', 'AASHTO 11.10.6.4.1-1'),
          calcLine([run('LTDS'), sub('GeoStrip'), run(' := for i ∈ 0..2', { italic: true })]),
          calcLine([run('   L'), sub('i'), run(' ← max(T'), sub('Max.Str.I.GeoStrip'), run(', T'), sub('Max.EE.I.GeoStrip'), run(') / (φ'), sub('PO.GeoStrip'), run(' · R'), sub('C.GeoStrip'), run(')')], { after: 60 }),
          matrixLine([run('   L = ')], intVals((r) => r.ltdsGeostrip, 1), 'lb/ft'),
          blank(140),
        ];
      })(),

      // ── Geosynthetic Grid ──
      headingRef('Extensible Reinforcement Parameters: Geosynthetic Grid', ''),
      ...(() => {
        const fpGgVal = 0.67 * Math.tan((phiSdeg * Math.PI) / 180);
        const psiGgVal = 45 + phiSdeg * 0.5;
        const rlMaxGgVal = N(parseFloat(rlStr[rlStr.length - 1]), 3);
        return [
          vt([
            vr([
              calcLine([run('φ'), sub('PO.GeoGrid'), run(' := 0.9'), run('          '), run('φ'), sub('PO.GeoGrid.EE'), run(' := 0.85')]),
            ], ''),
            vr([calcLine([run("F'"), sub('GeoGrid'), run(` := 0.67 · tan(φ`), sub('S'), run(`) = ${N(fpGgVal, 3)}`)])],
              'AASHTO Figure 11.10.6.3.2-2'),
            vr([calcLine([run('α'), sub('GeoGrid'), run(' := 0.8')])], 'AASHTO Table 11.10.6.3.2-1'),
            vr([calcLine([run('R'), sub('C.GeoGrid'), run(' := 0.8')])], 'Assumed coverage ratio'),
            vr([calcLine([run('k'), sub('R.GeoGrid'), run(` := 1.0 · k`), sub('A.S'), run(` = ${N(kaVal, 3)}`)])],
              'Lateral Stress Coefficient. AASHTO Figure 11.10.6.2.1-3'),
          ]),
          blank(80),
          page4Para([run('Max Stress at Reinforcement Level', { bold: true })], { after: 80 }),
          vt([
            vr([
              matrixLine([run('σ'), sub('EV.Z'), run(' := γ'), sub('S'), run(' · Z · γ'), sub('Strip'), run(' = ')], intVals((r) => r.sEvZ, 3), 'ksf'),
              matrixLine([run('σ'), sub('LS.Z'), run(' := γ'), sub('S'), run(' · h'), sub('eq'), run(' · γ'), sub('Strip'), run(' = ')], intVals((r) => r.sLsZ, 3), 'ksf'),
            ], 'Pressure at each Z level due to soil and LS loads'),
            vr([
              calcLine([run('σ'), sub('V.Str.I'), run(' := γ'), sub('EV.Str.I'), run(' · σ'), sub('EV.Z'), run(' + γ'), sub('LS.Str.I'), run(' · σ'), sub('LS.Z')]),
            ], ''),
            vr([
              matrixLine([run('σ'), sub('H.Str.I'), run(' := (γ'), sub('EH.Str.I'), run(' · σ'), sub('EV.Z'), run(' + γ'), sub('LS.Str.I'), run(' · σ'), sub('LS.Z'), run(') · k'), sub('R.GeoGrid'), run(' = ')], intVals((r) => r.sHStrI, 3), 'ksf'),
            ], 'Factored Pressure for each limit state'),
          ]),
          calcLine([run('σ'), sub('V.EE.I'), run(' := γ'), sub('EV.EE.I'), run(' · σ'), sub('EV.Z'), run(' + γ'), sub('LS.EE.I'), run(' · σ'), sub('LS.Z')]),
          matrixLine([run('σ'), sub('H.EE.I'), run(' := γ'), sub('EQ.EE.I'), run(' · σ'), sub('EQ'), run(' · γ'), sub('Strip'), run(' + γ'), sub('LS.EE.I'), run(' · σ'), sub('LS.Z'), run(' · k'), sub('R.GeoGrid'), run(' = ')], intVals((r) => r.sHEeI, 3), 'ksf'),
          blank(80),
          headingRef('Factored Tmax at Reinforcement Level', 'AASHTO 11.10.6.2.1-2'),
          calcTwoColumn(
            [matrixLine([run('T'), sub('Max.Str.I.GeoGrid'), run(' := σ'), sub('H.Str.I'), run(' · s'), sub('V'), run(' = ')], intVals((r) => r.tMaxStrIGgrid, 3), 'kip/ft')],
            [matrixLine([run('T'), sub('Max.EE.I.GeoGrid'), run(' := σ'), sub('H.EE.I'), run(' · s'), sub('V'), run(' = ')], intVals((r) => r.tMaxEeIGgrid, 3), 'kip/ft')],
            80,
          ),
          blank(80),
          headingRef('Min Required Resistance Zone', 'AASHTO 11.10.6.2.1-2'),
          calcLine([run('L'), sub('E.Str.I'), run(' := for i ∈ 0..2', { italic: true })]),
          calcLine([run('   L'), sub('i'), run(' ← T'), sub('Max.Str.I.GeoGrid'), run(' / (φ'), sub('PO.GeoGrid'), run(' · F\''), sub('GeoGrid'), run(' · α'), sub('GeoGrid'), run(' · σ'), sub('V'), run(' · C · R'), sub('C.GeoGrid'), run(')')], { after: 60 }),
          matrixLine([run('   L = ')], intVals((r) => r.lEStrIGg, 3), 'ft'),
          calcLine([run('L'), sub('E.EE.I'), run(' := for i ∈ 0..2', { italic: true })]),
          calcLine([run('   L'), sub('i'), run(' ← T'), sub('Max.EE.I.GeoGrid'), run(' / (φ'), sub('PO.GeoGrid.EE'), run(' · F\''), sub('GeoGrid'), run(' · α'), sub('GeoGrid'), run(' · σ'), sub('V'), run(' · C · R'), sub('C.GeoGrid'), run(')')], { after: 60 }),
          matrixLine([run('   L = ')], intVals((r) => r.lEEeIGg, 3), 'ft'),
          calcLine([run('L'), sub('E.GeoGrid'), run(' := for i ∈ 0..2, L'), sub('i'), run(' ← max(L'), sub('E.Str.I'), run(', L'), sub('E.EE.I'), run(')')], { after: 60 }),
          matrixLine([run('   L = ')], intVals((r) => r.lEGeogrid, 3), 'ft'),
          blank(80),
          page4Para([run('Minimum Reinforcement Length', { bold: true })], { after: 80 }),
          calcLine([run('Ψ := 45 deg + φ'), sub('S'), run(` · 0.5 = ${N(psiGgVal, 0)} deg`)], { after: 80 }),
          vt([
            vr([
              calcLine([run('L'), sub('A'), run(' := for i ∈ 0..2', { italic: true })]),
              calcLine([run('   L'), sub('i'), run(' ← (DH'), sub('x'), run(' − Z'), sub('i'), run(') · tan(90 deg − Ψ)')], { after: 60 }),
              matrixLine([run('   L = ')], intVals((r) => r.lAGg, 3), 'ft'),
            ], 'Inextensible Reinforcement. AASHTO Figure 11.10.6.3.1-1'),
          ]),
          calcTwoColumn(
            [matrixLine([run('RL'), sub('Min.GeoGrid'), run(' := L'), sub('A'), run(' + L'), sub('E.GeoGrid'), run(' = ')], intVals((r) => r.rlMinGeogrid, 3), 'ft')],
            [calcLine([run('RL'), sub('x'), run(` = ${rlMaxGgVal} ft`)])],
            80,
          ),
          blank(80),
          checkBox([run('Check'), sub('PO.GeoGrid'), run(' := if(RL'), sub('Min.GeoGrid'), run(' < RL'), sub('x'), run(', "Adequate", "INADEQUATE") = ')], intChecks((r) => r.poGeogridCheck)),
          blank(80),
          headingRef('Long Term Design Strength [LTDS]', 'AASHTO 11.10.6.4.1-1'),
          calcLine([run('LTDS'), sub('GeoGrid'), run(' := for i ∈ 0..2', { italic: true })]),
          calcLine([run('   L'), sub('i'), run(' ← max(T'), sub('Max.Str.I.GeoGrid'), run(' / (φ'), sub('PO.GeoGrid'), run(' · R'), sub('C.GeoGrid'), run('), T'), sub('Max.EE.I.GeoGrid'), run(' / (φ'), sub('PO.GeoGrid.EE'), run(' · R'), sub('C.GeoGrid'), run(')')], { after: 60 }),
          matrixLine([run('   L = ')], intVals((r) => r.ltdsGeogrid, 1), 'lb/ft'),
          blank(140),
        ];
      })(),

      // ── Metallic Grid ──
      headingRef('Inextensible Reinforcement Parameters: Metallic Grid', ''),
      ...(() => {
        const tStVal = 0.375;
        const stSgVal = 4;
        const f1Sg = N(10 * tStVal / stSgVal, 3);
        const f2Sg = N(20 * tStVal / stSgVal, 3);
        const rlMaxSgVal = N(parseFloat(rlStr[rlStr.length - 1]), 3);
        return [
          vt([
            vr([
              calcLine([run('t'), sub('SteelGrid'), run(' := 0.375 in'), run('          '), run('s'), sub('T.SteelGrid'), run(' := 4 in')]),
            ], 'Grid spacing and thickness. Typical values as per Reinforced Earth Product Guide'),
            vr([calcLine([run('φ'), sub('PO.SteelGrid'), run(' := 0.65')])], ''),
            vr([
              calcLine([run('F'), sub('1'), run(' := 10 · t'), sub('SteelGrid'), run(' / s'), sub('T.SteelGrid'), run(` = ${f1Sg}`), run('     '), run('F'), sub('2'), run(' := 20 · t'), sub('SteelGrid'), run(' / s'), sub('T.SteelGrid'), run(` = ${f2Sg}`)]),
            ], 'AASHTO Figure 11.10.6.3.2-2'),
            vr([
              calcLine([run("F'"), sub('SteelGrid'), run(' := for i ∈ 0..2', { italic: true })]),
              calcLine([run('   F'), sub('i'), run(' ← if(Z'), sub('i'), run(' > 20 ft, F'), sub('1'), run(', F'), sub('1'), run(' − ((20 ft − Z'), sub('i'), run(') / 20 ft) · (F'), sub('1'), run(' − F'), sub('2'), run(')')], { after: 60 }),
              matrixLine([run('   F = ')], intVals((r) => r.fpMg, 3), ''),
            ], ''),
            vr([calcLine([run('α'), sub('SteelGrid'), run(' := 1.0')])], 'AASHTO Table 11.10.6.3.2-1'),
            vr([calcLine([run('R'), sub('C.SteelGrid'), run(' := 0.8')])], 'Coverage Ratio. AASHTO Figure 11.10.6.4.1-1'),
            vr([
              calcLine([run('k'), sub('R.SteelGrid'), run(' := for i ∈ 0..2', { italic: true })]),
              calcLine([run('   k'), sub('i'), run(' ← if(Z'), sub('i'), run(' > 20 ft, 1.2, 1.2 − ((20 ft − Z'), sub('i'), run(') / 20 ft) · (1.2 − 2.5))')], { after: 60 }),
              matrixLine([run('   · k'), sub('A.S'), run(' = ')], intVals((r) => r.krSg, 3), ''),
            ], 'Lateral Stress Coefficient. AASHTO Figure 11.10.6.2.1-3'),
          ]),
          blank(80),
          page4Para([run('Max Stress at Reinforcement Level', { bold: true })], { after: 80 }),
          vt([
            vr([
              calcLine([run('σ'), sub('V.Str.I'), run(' := γ'), sub('EH.Str.I'), run(' · σ'), sub('EV.Z'), run(' + γ'), sub('LS.Str.I'), run(' · σ'), sub('LS.Z')]),
            ], ''),
            vr([
              calcLine([run('σ'), sub('H.Str.I'), run(' := for i ∈ 0..2', { italic: true })]),
              calcLine([run('   k'), sub('i'), run(' ← σ'), sub('V.Str.I'), sub('i'), run(' · k'), sub('R.SteelGrid'), sub('i')], { after: 60 }),
              matrixLine([run('   k = ')], intVals((r) => r.sHStrIMg, 3), 'ksf'),
            ], 'Factored Pressure for each limit state'),
          ]),
          calcLine([run('σ'), sub('V.EE.I'), run(' := γ'), sub('EV.EE.I'), run(' · σ'), sub('EV.Z'), run(' + γ'), sub('LS.EE.I'), run(' · σ'), sub('LS.Z')]),
          calcLine([run('σ'), sub('H.EE.I'), run(' := for i ∈ 0..2', { italic: true })]),
          calcLine([run('   k'), sub('i'), run(' ← γ'), sub('EQ.EE.I'), run(' · σ'), sub('EQ'), sub('i'), run(' · γ'), sub('Strip'), run(' · (k'), sub('R.SteelGrid'), sub('i'), run(' / k'), sub('A.S'), run(') + γ'), sub('LS.EE.I'), run(' · σ'), sub('LS.Z'), sub('i'), run(' · k'), sub('R.SteelGrid'), sub('i')], { after: 60 }),
          matrixLine([run('   k = ')], intVals((r) => r.sHEeIMg, 3), 'ksf'),
          blank(80),
          headingRef('Factored Tmax at Reinforcement Level', 'AASHTO 11.10.6.2.1-2'),
          calcTwoColumn(
            [matrixLine([run('T'), sub('Max.Str.I.SteelGrid'), run(' := σ'), sub('H.Str.I'), run(' · s'), sub('V'), run(' = ')], intVals((r) => r.tMaxStrISg, 3), 'kip/ft')],
            [matrixLine([run('T'), sub('Max.EE.I.SteelGrid'), run(' := σ'), sub('H.EE.I'), run(' · s'), sub('V'), run(' = ')], intVals((r) => r.tMaxEeISg, 3), 'kip/ft')],
            80,
          ),
          blank(80),
          headingRef('Min Required Resistance Zone', 'AASHTO 11.10.6.2.1-2'),
          calcLine([run('L'), sub('E.Str.I'), run(' := for i ∈ 0..2', { italic: true })]),
          calcLine([run('   L'), sub('i'), run(' ← T'), sub('Max.Str.I.SteelGrid'), sub('i'), run(' / (φ'), sub('PO.SteelGrid'), run(' · F\''), sub('SteelGrid'), sub('i'), run(' · α'), sub('SteelGrid'), run(' · σ'), sub('V'), sub('i'), run(' · C · R'), sub('C.SteelGrid'), run(')')], { after: 60 }),
          matrixLine([run('   L = ')], intVals((r) => r.lEStrIMg, 3), 'ft'),
          calcLine([run('L'), sub('E.EE.I'), run(' := for i ∈ 0..2', { italic: true })]),
          calcLine([run('   L'), sub('i'), run(' ← T'), sub('Max.EE.I.SteelGrid'), sub('i'), run(' / (φ'), sub('PO.SteelGrid'), run(' · F\''), sub('SteelGrid'), sub('i'), run(' · α'), sub('SteelGrid'), run(' · σ'), sub('V'), sub('i'), run(' · C · R'), sub('C.SteelGrid'), run(')')], { after: 60 }),
          matrixLine([run('   L = ')], intVals((r) => r.lEEeIMg, 3), 'ft'),
          calcLine([run('L'), sub('E.SteelGrid'), run(' := for i ∈ 0..2, L'), sub('i'), run(' ← max(L'), sub('E.Str.I'), run(', L'), sub('E.EE.I'), run(')')], { after: 60 }),
          matrixLine([run('   L = ')], intVals((r) => r.lESg, 3), 'ft'),
          blank(80),
          page4Para([run('Minimum Reinforcement Length', { bold: true })], { after: 80 }),
          vt([
            vr([
              calcLine([run('L'), sub('A'), run(' := for i ∈ 0..2', { italic: true })]),
              calcLine([run('   L'), sub('i'), run(' ← if(Z'), sub('i'), run(' < 0.5 · DH'), sub('x'), run(', 0.3 · DH'), sub('x'), run(', 0.3 · DH'), sub('x'), run(' · (DH'), sub('x'), run(' − Z'), sub('i'), run(') / (0.5 · DH'), sub('x'), run(')')], { after: 60 }),
              matrixLine([run('   L = ')], intVals((r) => r.lASg, 3), 'ft'),
            ], 'Inextensible Reinforcement. AASHTO Figure 11.10.6.3.1-1'),
          ]),
          calcTwoColumn(
            [matrixLine([run('RL'), sub('Min.SteelGrid'), run(' := L'), sub('A'), run(' + L'), sub('E.SteelGrid'), run(' = ')], intVals((r) => r.rlMinSg, 3), 'ft')],
            [calcLine([run('RL'), sub('x'), run(` = ${rlMaxSgVal} ft`)])],
            80,
          ),
          blank(80),
          checkBox([run('Check'), sub('PO.SteelGrid'), run(' := if(RL'), sub('Min.SteelGrid'), run(' < RL'), sub('x'), run(', "Adequate", "INADEQUATE") = ')], intChecks((r) => r.poSgCheck)),
          blank(80),
          headingRef('Long Term Design Strength [LTDS]', 'AASHTO 11.10.6.4.1-1'),
          calcLine([run('LTDS'), sub('SteelGrid'), run(' := for i ∈ 0..2', { italic: true })]),
          calcLine([run('   L'), sub('i'), run(' ← max(T'), sub('Max.Str.I.SteelGrid'), sub('i'), run(', T'), sub('Max.EE.I.SteelGrid'), sub('i'), run(') / (φ'), sub('PO.SteelGrid'), run(' · R'), sub('C.SteelGrid'), run(')')], { after: 60 }),
          matrixLine([run('   L = ')], intVals((r) => r.ltdsSg, 1), 'lb/ft'),
          blank(140),
        ];
      })(),

      // ── Ribbed Metallic Strip ──
      headingRef('Inextensible Reinforcement Parameters: Ribbed Metallic Strip', ''),
      ...(() => {
        const f1SsVal = N(Math.tan((phiSdeg * Math.PI) / 180), 3);
        const d10Val = numP('D10', 0.01);
        const d60Val = numP('D60', 0.1);
        const f2WingVal = N((d10Val / d60Val) * Math.tan(toRad(phiSdeg)), 3);
        const rcSsVal = N(2 / 18, 3);
        const rlMaxSsVal = N(parseFloat(rlStr[rlStr.length - 1]), 3);
        return [
          vt([
            vr([
              calcLine([run('t'), sub('SteelStrip'), run(' := 0.5 in'), run('          '), run('b'), sub('SteelGrid'), run(' := 2 in')]),
            ], 'Strip width and thickness. Typical values as per Reinforced Earth Product Guide. Decrease spacing so internal stability does not control'),
            vr([
              calcLine([run('φ'), sub('PO.SteelStrip'), run(' := 0.75'), run('          '), run('s'), sub('H'), run(' := 18 in')]),
            ], ''),
            vr([
              isWing
                ? calcLine([run('F'), sub('1'), run(` := tan(φ`), sub('S'), run(`) = ${f1SsVal}`), run('     '), run('F'), sub('2'), run(' := (D'), sub('10'), run(' / D'), sub('60'), run(`) · tan(φ`), sub('S'), run(`) = ${f2WingVal}`)])
                : calcLine([run('F'), sub('1'), run(` := tan(φ`), sub('S'), run(`) = ${f1SsVal}`), run('     '), run('F'), sub('2'), run(' := min(2, 1.2 + log(C'), sub('U.S'), run(')) = 2')]),
            ], ''),
            vr([
              calcLine([run("F'"), sub('SteelStrip'), run(' := for i ∈ 0..2', { italic: true })]),
              calcLine([run('   F'), sub('i'), run(' ← if(Z'), sub('i'), run(' > 20 ft, F'), sub('1'), run(', F'), sub('1'), run(' − ((20 ft − Z'), sub('i'), run(') / 20 ft) · (F'), sub('1'), run(' − F'), sub('2'), run(')')], { after: 60 }),
              matrixLine([run('   F = ')], intVals((r) => r.fpSs, 3), ''),
            ], 'AASHTO Figure 11.10.6.3.2-2'),
            vr([calcLine([run('α'), sub('SteelStrip'), run(' := 1.0')])], 'AASHTO Table 11.10.6.3.2-1'),
            vr([
              mFracLine(
                [ms('R', 'C.SteelStrip'), new MathRun(' := ')],
                [ms('b', 'SteelGrid')],
                [ms('s', 'H')],
                [rcSsVal],
                '',
              ),
            ], 'Coverage Ratio. AASHTO Figure 11.10.6.4.1-1'),
            vr([
              calcLine([run('k'), sub('R.SteelStrip'), run(' := for i ∈ 0..2', { italic: true })]),
              calcLine([run('   k'), sub('i'), run(' ← if(Z'), sub('i'), run(' > 20 ft, 1.2, 1.2 − ((20 ft − Z'), sub('i'), run(') / 20 ft) · (1.2 − 1.7))')], { after: 60 }),
              matrixLine([run('   · k'), sub('A.S'), run(' = ')], intVals((r) => r.krSs, 3), ''),
            ], 'Lateral Stress Coefficient. AASHTO Figure 11.10.6.2.1-3'),
          ]),
          blank(80),
          page4Para([run('Max Stress at Reinforcement Level', { bold: true })], { after: 80 }),
          vt([
            vr([
              calcLine([run('σ'), sub('V.Str.I'), run(' := γ'), sub('EH.Str.I'), run(' · σ'), sub('EV.Z'), run(' + γ'), sub('LS.Str.I'), run(' · σ'), sub('LS.Z')]),
            ], ''),
            vr([
              calcLine([run('σ'), sub('H.Str.I'), run(' := for i ∈ 0..2', { italic: true })]),
              calcLine([run('   k'), sub('i'), run(' ← σ'), sub('V.Str.I'), sub('i'), run(' · k'), sub('R.SteelStrip'), sub('i')], { after: 60 }),
              matrixLine([run('   k = ')], intVals((r) => r.sHStrISs, 3), 'ksf'),
            ], 'Factored Pressure for each limit state'),
          ]),
          calcLine([run('σ'), sub('V.EE.I'), run(' := γ'), sub('EV.EE.I'), run(' · σ'), sub('EV.Z'), run(' + γ'), sub('LS.EE.I'), run(' · σ'), sub('LS.Z')]),
          calcLine([run('σ'), sub('H.EE.I'), run(' := for i ∈ 0..2', { italic: true })]),
          calcLine([run('   k'), sub('i'), run(' ← (γ'), sub('EQ.EE.I'), run(' · σ'), sub('EQ'), sub('i'), run(' · γ'), sub('Strip'), run(' · (k'), sub('R.SteelStrip'), sub('i'), run(' / k'), sub('A.S'), run(') + γ'), sub('LS.EE.I'), run(' · σ'), sub('LS.Z'), sub('i'), run(' · k'), sub('R.SteelStrip'), sub('i'), run(')')], { after: 60 }),
          matrixLine([run('   k = ')], intVals((r) => r.sHEeISs, 3), 'ksf'),
          blank(80),
          headingRef('Factored Tmax at Reinforcement Level', 'AASHTO 11.10.6.2.1-2'),
          calcTwoColumn(
            [matrixLine([run('T'), sub('Max.Str.I.SteelStrip'), run(' := σ'), sub('H.Str.I'), run(' · s'), sub('V'), run(' = ')], intVals((r) => r.tMaxStrISs, 3), 'kip/ft')],
            [matrixLine([run('T'), sub('Max.EE.I.SteelStrip'), run(' := σ'), sub('H.EE.I'), run(' · s'), sub('V'), run(' = ')], intVals((r) => r.tMaxEeISs, 3), 'kip/ft')],
            80,
          ),
          blank(80),
          headingRef('Min Required Resistance Zone', 'AASHTO 11.10.6.2.1-2'),
          calcLine([run('L'), sub('E.Str.I'), run(' := for i ∈ 0..2', { italic: true })]),
          calcLine([run('   L'), sub('i'), run(' ← T'), sub('Max.Str.I.SteelStrip'), sub('i'), run(' / (φ'), sub('PO.SteelStrip'), run(' · F\''), sub('SteelStrip'), sub('i'), run(' · α'), sub('SteelStrip'), run(' · σ'), sub('V'), sub('i'), run(' · C · R'), sub('C.SteelStrip'), run(')')], { after: 60 }),
          matrixLine([run('   L = ')], intVals((r) => r.lEStrISs, 3), 'ft'),
          calcLine([run('L'), sub('E.EE.I'), run(' := for i ∈ 0..2', { italic: true })]),
          calcLine([run('   L'), sub('i'), run(' ← T'), sub('Max.EE.I.SteelStrip'), sub('i'), run(' / (φ'), sub('PO.SteelStrip'), run(' · F\''), sub('SteelStrip'), sub('i'), run(' · α'), sub('SteelStrip'), run(' · σ'), sub('V'), sub('i'), run(' · C · R'), sub('C.SteelStrip'), run(')')], { after: 60 }),
          matrixLine([run('   L = ')], intVals((r) => r.lEEeISs, 3), 'ft'),
          calcLine([run('L'), sub('E.SteelStrip'), run(' := for i ∈ 0..2, L'), sub('i'), run(' ← max(L'), sub('E.Str.I'), run(', L'), sub('E.EE.I'), run(')')], { after: 60 }),
          matrixLine([run('   L = ')], intVals((r) => r.lESs, 3), 'ft'),
          blank(80),
          page4Para([run('Minimum Reinforcement Length', { bold: true })], { after: 80 }),
          vt([
            vr([
              calcLine([run('L'), sub('A'), run(' := for i ∈ 0..2', { italic: true })]),
              calcLine([run('   L'), sub('i'), run(' ← if(Z'), sub('i'), run(' < 0.5 · DH'), sub('x'), run(', 0.3 · DH'), sub('x'), run(', 0.3 · DH'), sub('x'), run(' · (DH'), sub('x'), run(' − Z'), sub('i'), run(') / (0.5 · DH'), sub('x'), run(')')], { after: 60 }),
              matrixLine([run('   L = ')], intVals((r) => r.lASs, 3), 'ft'),
            ], 'Inextensible Reinforcement. AASHTO Figure 11.10.6.3.1-1'),
          ]),
          calcTwoColumn(
            [matrixLine([run('RL'), sub('Min.SteelStrip'), run(' := L'), sub('A'), run(' + L'), sub('E.SteelStrip'), run(' = ')], intVals((r) => r.rlMinSs, 3), 'ft')],
            [calcLine([run('RL'), sub('x'), run(` = ${rlMaxSsVal} ft`)])],
            80,
          ),
          blank(80),
          checkBox([run('Check'), sub('PO.SteelStrip'), run(' := if(RL'), sub('Min.SteelStrip'), run(' < RL'), sub('x'), run(', "Adequate", "INADEQUATE") = ')], intChecks((r) => r.poSsCheck)),
          blank(80),
          headingRef('Long Term Design Strength [LTDS]', 'AASHTO 11.10.6.4.1-1'),
          calcLine([run('LTDS'), sub('SteelStrip'), run(' := for i ∈ 0..2', { italic: true })]),
          calcLine([run('   L'), sub('i'), run(' ← max(T'), sub('Max.Str.I.SteelStrip'), sub('i'), run(', T'), sub('Max.EE.I.SteelStrip'), sub('i'), run(') / (φ'), sub('PO.SteelStrip'), run(' · R'), sub('C.SteelStrip'), run(')')], { after: 60 }),
          matrixLine([run('   L = ')], intVals((r) => r.ltdsSs, 1), 'lb/ft'),
          blank(140),
        ];
      })(),

      // ── Internal Design Summary (ref page 32) ──
      page4Para([run('Internal Design Summary', { bold: true })], { after: 160 }),
    ];

    if (chart) {
      out.push(
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 80, after: 120 },
          children: [new ImageRun({ type: 'png', data: chart, transformation: { width: 480, height: 320 } })],
        }),
      );
    }
    out.push(
      calcTwoColumn(
        [
          checkBox([run('Check'), sub('PO.GeoStrip'), run(' = ')], intChecks((r) => r.poGeostripCheck)),
          checkBox([run('Check'), sub('PO.GeoGrid'), run(' = ')], intChecks((r) => r.poGeogridCheck)),
          checkBox([run('Check'), sub('PO.SteelGrid'), run(' = ')], intChecks((r) => r.poSgCheck)),
          checkBox([run('Check'), sub('PO.SteelStrip'), run(' = ')], intChecks((r) => r.poSsCheck)),
        ],
        [
          matrixLine([run('LTDS'), sub('GeoStrip'), run(' = ')], intVals((r) => r.ltdsGeostrip / 1000, 3), 'kip/ft'),
          matrixLine([run('LTDS'), sub('GeoGrid'), run(' = ')], intVals((r) => r.ltdsGeogrid / 1000, 3), 'kip/ft'),
          matrixLine([run('LTDS'), sub('SteelGrid'), run(' = ')], intVals((r) => r.ltdsSg / 1000, 3), 'kip/ft'),
          matrixLine([run('LTDS'), sub('SteelStrip'), run(' = ')], intVals((r) => r.ltdsSs / 1000, 3), 'kip/ft'),
        ],
        0,
      ),
      blank(120),
      headingRef('Summary Tables for Excel Spreadsheets', `DH = ${dhStr[0]} ft - ${dhStr[dhStr.length - 1]} ft`),
      ...(() => {
        const sz = 14;
        const cw = [1170, 1170, 1170, 1170, 1170, 1170, 1170, 1170];
        const hc = (text: string, span = 1) =>
          new TableCell({
            columnSpan: span,
            borders: cellBorder,
            shading: { type: ShadingType.SOLID, fill: '1E3A5F', color: '1E3A5F' },
            verticalAlign: VerticalAlign.CENTER,
            children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text, bold: true, size: sz, color: 'FFFFFF' })] })],
          });
        const dc = (text: string) =>
          new TableCell({
            borders: cellBorder,
            verticalAlign: VerticalAlign.CENTER,
            children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text, size: sz })] })],
          });
        const talReqdTable = new Table({
          width: { size: 9360, type: WidthType.DXA },
          alignment: AlignmentType.CENTER,
          columnWidths: cw,
          borders: tblBorder,
          rows: [
            new TableRow({ children: [hc('', 1), hc('Tal.reqd (lb/ft)', 7)] }),
            new TableRow({ children: [hc('', 1), hc('Strength I', 3), hc('Extreme Event I', 4)] }),
            new TableRow({ tableHeader: true, children: [hc('Z (ft)'), hc('Geosynthetic'), hc('Metal Strip'), hc('Metal Grid'), hc('Geogrid'), hc('Geostrip'), hc('Metal Strip'), hc('Metal Grid')] }),
            ...intRows.map((r) => new TableRow({ children: [
              dc(N(r.z, 2)),
              dc(N(r.ltdsGeostrip, 2)),
              dc(N(r.ltdsSs, 2)),
              dc(N(r.ltdsSg, 2)),
              dc(N(r.ltdsEeIGg, 2)),
              dc(N(r.ltdsEeIGs, 2)),
              dc(N(r.ltdsEeISs, 2)),
              dc(N(r.ltdsEeISg, 2)),
            ] })),
          ],
        });
        return [talReqdTable];
      })(),
    );
    return out;
  };

  // ════════════════════════════════════════════════════════════════════════
  // Precast Panel Facing — hand-calculation builder (mirrors ref pages 42-51)
  // ════════════════════════════════════════════════════════════════════════
  const panelFacingChildren = (ds: PanelFaceDesignSection, sectionNum: number): DocChild[] => {
    const r = ds.result;
    const inp = ds.inputs;
    const prms = ds.params;
    const numPp = (key: string, fb: number) => {
      const v = parseFloat(prms[key] ?? '');
      return isFinite(v) ? v : fb;
    };
    const lPanelV = numPp('L panel (ft)', 10);
    const hPanelV = numPp('h panel (ft)', 5);
    const tPanelV = numPp('t panel (in)', 6);
    const ssrV = numPp('S sr (in)', 30);
    const cCoverPosV = numPp('Cover +ve (in)', 2);
    const cCoverNegV = numPp('Cover -ve (in)', 3);
    const ratioStr = (num: number, den: number, d = 3) =>
      isFinite(num / den) && !isNaN(num / den) ? (num / den).toFixed(d) : '—';

    // Row/table helpers (same pattern as vr/vt in wallCalcChildren)
    const lVr = (left: (Paragraph | Table)[], note: string): TableRow =>
      new TableRow({
        children: [
          new TableCell({
            width: { size: 5400, type: WidthType.DXA },
            borders: noBorder,
            margins: { top: 0, bottom: 60, left: 0, right: 160 },
            children: left,
          }),
          new TableCell({
            width: { size: 3960, type: WidthType.DXA },
            borders: noBorder,
            margins: { top: 0, bottom: 60, left: 160, right: 0 },
            children: note
              ? [noteP(note)]
              : [new Paragraph({ spacing: { before: 0, after: 0 }, children: [] })],
          }),
        ],
      });
    const lVt = (rows: TableRow[]): Table =>
      new Table({
        width: { size: 9360, type: WidthType.DXA },
        layout: TableLayoutType.FIXED,
        columnWidths: [5400, 3960],
        borders: noBorder,
        rows,
      });
    // Full-width row spanning both columns (used for check boxes)
    const lVrFull = (children: (Paragraph | Table)[]): TableRow =>
      new TableRow({
        children: [
          new TableCell({
            width: { size: 9360, type: WidthType.DXA },
            columnSpan: 2,
            borders: noBorder,
            margins: { top: 0, bottom: 60, left: 0, right: 0 },
            children,
          }),
        ],
      });

    // Bar diameter as inline OfficeMath fraction + spacing param on same line
    const barRow = (
      dSub: string, barNum: number, sSub: string, spacing: number, note: string,
    ): TableRow =>
      lVr(
        [
          new Paragraph({
            spacing: { before: 0, after: 90, line: lineSpacing },
            children: [
              new OfficeMath({
                children: [
                  ms('d', dSub),
                  new MathRun(' := '),
                  new MathFraction({
                    numerator: [new MathRun(String(barNum))],
                    denominator: [new MathRun('8')],
                  }),
                  new MathRun(' · in'),
                ],
              }),
              run('          s'), sub(sSub), run(` := ${spacing} `), blue('in', { italic: true }),
            ],
          }),
        ],
        note,
      );

    let _sub = 0;
    const panelSecHead = (t: string, ref = '') =>
      headingRef(`${sectionNum}.${++_sub} ${t}`, ref, 360, HeadingLevel.HEADING_2);

    const flexBlock = (
      headTitle: string, ref: string,
      abSub: string, dSub: string, flexCheckSub: string,
      MNsub: string, MUsub: string,
      C: number, a: number, et: number, phi: number,
      MN: number, phiMN: number, MU: number,
      check: string, barDesignation: string, directionText: string,
    ): DocChild[] => [
      headingRef(headTitle, ref),
      page4Para([run('Flexural Strength Parameters:', { bold: true })], { after: 80 }),
      lVt([
        lVr([
          calcLine([run('β'), sub('1'), run(' := max(0.85 − 0.05·(f\''), sub('C.Con'), run(' − 4.0 ksi)/1 ksi, 0.65) = '), run(`${N(r.beta1, 3)}`)]),
        ], 'Stress Block Factor. AASHTO 5.6.2.2'),
        lVr([
          calcLine([run('α1'), run(' := min(max(0.85 − 0.02·(f\''), sub('C.Con'), run(' − 10.0 ksi)/1 ksi, 0.75), 0.85) = '), run(`${N(r.alpha1, 3)}`)]),
        ], ''),
        lVr([
          calcLine([run('c := A'), sub(abSub), run(' · f'), sub('Y.Steel'), run(' / (α'), sub('1'), run(' · f\''), sub('C.Con'), run(' · β'), sub('1'), run(' · s'), sub('SR'), run(`) = ${N(C, 3)} `), blue('in', { italic: true })]),
        ], 'Concrete Stress Block. AASHTO 5.6.3.1.1-4'),
        lVr([
          calcLine([run('a := β'), sub('1'), run(` · c = ${N(a, 3)} `), blue('in', { italic: true })]),
        ], 'Effective Stress Block. AASHTO 5.6.3.2.2'),
      ]),
      page4Para([run('Strength Reduction Factor', { bold: true })], { after: 80 }),
      lVt([
        lVr([
          calcLine([run('ε'), sub('t'), run(' := (d'), sub(dSub), run(' − c) / c · 0.003 = '), run(`${N(et, 5)}`)]),
        ], 'Tension Controlled Check. AASHTO 5.5.4.2'),
        lVr([
          calcLine([run('φ'), sub('f'), run(` := if ε`), sub('t'), run(` ≥ 0.005   = ${N(phi, 3)}`)]),
          calcLine([run('           | return 0.9')]),
          calcLine([run('           else')]),
          calcLine([run('           | return max(0.75, 0.75 + (0.15·(ε'), sub('t'), run(' − 0.002)) / (0.005 − 0.002))')]),
        ], 'Flexure Resistance Factor. AASHTO 5.5.4.2.1'),
      ]),
      page4Para([run('Factored Flexural Capacity', { bold: true })], { after: 80 }),
      lVt([
        lVr([
          calcLine([run('M'), sub('N.' + MNsub), run(' := A'), sub(abSub), run(' · f'), sub('Y.Steel'), run(' · (d'), sub(dSub), run(' − a/2) = '), run(`${N(MN, 3)} `), blue('kip·ft', { italic: true })]),
        ], 'Nominal Flexural Capacity. AASHTO 5.6.3.2.2-1'),
        lVr([
          calcLine([run('φ'), sub('f'), run(' · M'), sub('N.' + MNsub), run(' := φ'), sub('f'), run(' · M'), sub('N.' + MNsub), run(` = ${N(phiMN, 3)} `), blue('kip·ft', { italic: true })]),
        ], 'Factored Flexure Capacity of wall stem per unit height'),
        lVr([
          calcLine([run('M'), sub('U.Panel.' + MUsub), run(` = ${N(MU, 3)} `), blue('kip·ft', { italic: true })]),
        ], ''),
        lVr([
          calcLine([run('φ'), sub('f'), run(' · M'), sub('N.' + MNsub), run(' / M'), sub('U.Panel.' + MUsub), run(` = ${ratioStr(phiMN, MU)}`)]),
        ], ''),
        lVrFull([checkBox([run('Check'), sub(flexCheckSub), run(' = ')], [check])]),
      ]),
      page4Para([run(`${barDesignation} is ${check} for ${directionText}`, { bold: true })], { after: 120, align: AlignmentType.CENTER }),
      pageBreak(),
    ];

    const crackBlock = (
      headTitle: string,
      sB: number, a: number, fs: number, dc: number, vs: number, smax: number,
      check: string,
      abSub: string, dPosSub: string, dNegSub: string,
    ): DocChild[] => [
      headingRef(headTitle, ''),
      lVt([
        lVr([
          calcLine([run('s'), sub('B'), run(` := ${N(sB, 1)} `), blue('in', { italic: true })]),
        ], ''),
        lVr([
          calcLine([run(`a := ${N(a, 3)} `), blue('in', { italic: true })]),
        ], ''),
        lVr([
          calcLine([run('γ'), sub('e'), run(' := 1.0')]),
        ], 'Exposure Factor for Class 1'),
        lVr([
          calcLine([run('f'), sub('SS'), run(' := min(0.6·f'), sub('Y.Steel'), run(',   M'), sub('U.Panel.Pos'), run('/(γ'), sub('EV.Str.I'), run('·A'), sub(abSub), run('·(d'), sub(dPosSub), run(' − a/2)),')]),
          calcLine([run('                    M'), sub('U.Panel.Neg'), run('/(γ'), sub('EV.Str.I'), run('·A'), sub(abSub), run('·(d'), sub(dNegSub), run(' − a/2)) )   = '), run(`${N(fs, 3)} `), blue('ksi', { italic: true })]),
        ], 'Max tensile stress in reinforcing steel. CONSERVATIVE APPROACH'),
        lVr([
          calcLine([run('d'), sub('C'), run(' := t'), sub('Panel'), run(' − d'), sub(dNegSub), run(` = ${N(dc, 3)} `), blue('in', { italic: true })]),
        ], 'Distance from extreme tensile face to center of reinforcement. Controlling case.'),
        lVr([
          calcLine([run('β'), sub('S'), run(' := 1 + d'), sub('C'), run(' / (0.7·(t'), sub('Panel'), run(' − d'), sub('C'), run(`)) = ${N(vs, 3)}`)]),
        ], ''),
        lVr([
          calcLine([run('s'), sub('Max.Crack'), run(' := max(5 '), blue('in', { italic: true }), run(', 700·γ'), sub('e'), run(' / (β'), sub('S'), run('·f'), sub('SS'), run(') − 2·d'), sub('C'), run(` ) = ${N(smax, 3)} `), blue('in', { italic: true })]),
        ], 'Max allowable rebar spacing. AASHTO 5.6.7-1'),
        lVrFull([checkBox([run('Check'), sub('Service.Cracking'), run(' = ')], [check])]),
      ]),
      pageBreak(),
    ];

    return [
      blank(220),
      headingRef(`${sectionNum}.   Precast Panel Facing Design`, '', 0, HeadingLevel.HEADING_1),
      calcP('Soil and Live Load Surcharge loads acting horizontally on Precast Panel Facing. Soil Reinforcement Strips act as supports.', { after: 40 }),
      calcP('Design for maximum positive moment between supports, and maximum negative moment at supports. Assume discrete reinforcement spaced 2.5ft horizontally and vertically.', { after: 160 }),

      // ── N.1 Panel Geometry and Reinforcement ──
      panelSecHead('Panel Geometry and Reinforcement'),
      lVt([
        lVr([
          calcLine([run('L'), sub('Panel'), run(` := ${N(lPanelV, 0)} `), blue('ft', { italic: true }), run('          h'), sub('Panel'), run(` := ${N(hPanelV, 0)} `), blue('ft', { italic: true })]),
        ], '10ft by 5ft panels standard size. Use max allowable soil reinforcement spacing. Use 6" nominal structural panel thickness.'),
        lVr([calcLine([run('s'), sub('SR'), run(` := ${N(ssrV, 0)} `), blue('in', { italic: true })])], ''),
        lVr([calcLine([run('t'), sub('Panel'), run(` := ${N(tPanelV, 0)} `), blue('in', { italic: true })])], ''),
        lVr([calcLine([run('c'), sub('Cover.Pos'), run(` := ${N(cCoverPosV, 0)} `), blue('in', { italic: true })])], ''),
        lVr([calcLine([run('c'), sub('Cover.Neg'), run(` := ${N(cCoverNegV, 0)} `), blue('in', { italic: true })])], ''),
      ]),
      blank(120),
      lVt([
        barRow('B.Vert', inp.barNumVert, 'B.Vert', inp.spacingVert, `#${inp.barNumVert} @ ${N(inp.spacingVert, 0)}" placed vertically in panel`),
        barRow('B.Hor', inp.barNumHor, 'B.Hor', inp.spacingHor, `#${inp.barNumHor} @ ${N(inp.spacingHor, 0)}" placed horizontally in panel`),
        lVr([
          calcLine([run('A'), sub('B.Vert'), run(' := (π/4)·d'), sub('B.Vert'), run('²·(1/s'), sub('B.Vert'), run(')·s'), sub('SR'), run(` = ${N(r.ABvert, 3)} `), blue('in²', { italic: true })]),
          calcLine([run('A'), sub('B.Hor'), run(' := (π/4)·d'), sub('B.Hor'), run('²·(1/s'), sub('B.Hor'), run(')·s'), sub('SR'), run(` = ${N(r.ABhor, 3)} `), blue('in²', { italic: true })]),
        ], 'Area of reinforcement per tributary area.'),
        lVr([
          calcLine([run('d'), sub('Rebar.Pos.Vert'), run(' := t'), sub('Panel'), run(' − c'), sub('Cover.Pos'), run(' − 0.5·d'), sub('B.Vert'), run(` = ${N(r.dB_pos_Vert, 3)} `), blue('in', { italic: true })]),
          calcLine([run('d'), sub('Rebar.Pos.Hor'), run(' := t'), sub('Panel'), run(' − c'), sub('Cover.Pos'), run(' − d'), sub('B.Vert'), run(' − 0.5·d'), sub('B.Hor'), run(` = ${N(r.dB_pos_Hor, 3)} `), blue('in', { italic: true })]),
        ], 'Depth to rebar from compression face.'),
        lVr([
          calcLine([run('d'), sub('Rebar.Neg.Vert'), run(' := t'), sub('Panel'), run(' − d'), sub('Rebar.Pos.Vert'), run(` = ${N(r.dB_neg_Vert, 3)} `), blue('in', { italic: true })]),
          calcLine([run('d'), sub('Rebar.Neg.Hor'), run(' := t'), sub('Panel'), run(' − d'), sub('Rebar.Pos.Hor'), run(` = ${N(r.dB_neg_Hor, 3)} `), blue('in', { italic: true })]),
        ], ''),
      ]),
      pageBreak(),

      // ── N.2 Factored Load on Panel ──
      panelSecHead('Factored Load on Panel', 'AASHTO 11.10.6.2.1'),
      calcP('Factored tensile load applied to the soil reinforcement connection at the wall face. Maximum TMax from internal stability, equal to LTDS for soil reinforcement.', { after: 100 }),
      lVt([
        lVr([
          calcLine([run('H'), sub('U.Str.Panel'), run(' := for i ∈ 0..2', { italic: true })]),
          calcLine([run('   H'), sub('i'), run(' ← max(T'), sub('Max.Str.I.SteelStrip,i'), run(', T'), sub('Max.Str.I.SteelGrid,i'), run(', T'), sub('Max.Str.I.GeoGrid,i'), run(', T'), sub('Max.Str.I.GeoStrip,i'), run(')')]),
          calcLine([run('   H')]),
          calcLine([run('H'), sub("U.Str.Panel'"), run(' := max(H'), sub('U.Str.Panel,0'), run(', H'), sub('U.Str.Panel,1'), run(', H'), sub('U.Str.Panel,2'), run(`) = ${N(inp.huStr, 3)} `), blue('kip/ft', { italic: true })]),
        ], 'Factored tensile load per unit height'),
        lVr([
          calcLine([run('H'), sub('U.EE.Panel'), run(' := for i ∈ 0..2', { italic: true })]),
          calcLine([run('   H'), sub('i'), run(' ← max(T'), sub('Max.EE.I.SteelStrip,i'), run(', T'), sub('Max.EE.I.SteelGrid,i'), run(', T'), sub('Max.EE.I.GeoGrid,i'), run(', T'), sub('Max.EE.I.GeoStrip,i'), run(')')]),
          calcLine([run('   H')]),
          calcLine([run('H'), sub("U.EE.Panel'"), run(' := max(H'), sub('U.EE.Panel,0'), run(', H'), sub('U.EE.Panel,1'), run(', H'), sub('U.EE.Panel,2'), run(`) = ${N(inp.huEe, 3)} `), blue('kip/ft', { italic: true })]),
        ], ''),
        lVr([
          calcLine([run('H'), sub('U.Panel'), run(' := max(H'), sub("U.Str.Panel'"), run(', H'), sub("U.EE.Panel'"), run(`) = ${N(r.HU_panel, 3)} `), blue('kip/ft', { italic: true })]),
        ], ''),
      ]),
      blank(120),
      page4Para([run('Factored Loads of Frame', { bold: true })], { after: 100 }),
      lVt([
        lVr([
          calcLine([run('M'), sub('U.Panel.Pos'), run(' := max(H'), sub('U.Panel'), run('·s'), sub('SR'), run('²/8, 0.08·H'), sub('U.Panel'), run('·s'), sub('SR'), run(`² ) = ${N(r.MU_pos, 3)} `), blue('kip·ft', { italic: true })]),
          calcLine([run('M'), sub('U.Panel.Neg'), run(' := max(H'), sub('U.Panel'), run('·s'), sub('SR'), run('²/12, 0.125·H'), sub('U.Panel'), run('·s'), sub('SR'), run(`² ) = ${N(r.MU_neg, 3)} `), blue('kip·ft', { italic: true })]),
          calcLine([run('V'), sub('U.Panel'), run(' := 0.625·H'), sub('U.Panel'), run('·s'), sub('SR'), run(` = ${N(r.VU_panel, 3)} `), blue('kip', { italic: true })]),
        ], 'Positive moment between soil reinforcement and negative moment behind soil reinforcement. Use controlling case between single span and continuous span.'),
      ]),
      pageBreak(),

      // ── N.3 Concrete Cracking Moment ──
      panelSecHead('Concrete Cracking Moment', 'AASHTO 5.4.2.6'),
      lVt([
        lVr([
          calcLine([run('f'), sub('Rupture'), run(" := 0.24·√(f'"), sub('C.Con'), run('/ksi)·ksi'), run(` = ${N(r.fr, 3)} `), blue('ksi', { italic: true })]),
        ], 'Modulus of Rupture. AASHTO 5.4.2.6'),
        lVr([
          calcLine([run('S'), sub('Panel'), run(' := s'), sub('SR'), run('·t'), sub('Panel'), run('²/6'), run(` = ${N(r.St, 1)} `), blue('in³', { italic: true })]),
        ], 'Section Modulus'),
        lVr([
          calcLine([run('M'), sub('CR'), run(' := f'), sub('Rupture'), run('·S'), sub('Panel'), run(` = ${N(r.Mcr, 3)} `), blue('kip·ft', { italic: true })]),
        ], 'Cracking Moment. AASHTO 5.6.3.3.2-1'),
      ]),

      // ── N.4 Governing Moment Demands ──
      panelSecHead('Governing Moment Demands', 'AASHTO 5.6.3.3'),
      page4Para([run('Minimum Applied Moment', { bold: true })], { after: 80 }),
      lVt([
        lVr([
          calcLine([run('M'), sub('Min.Pos'), run(' := min(1.33·M'), sub('U.Panel.Pos'), run(', 1.6·0.67·M'), sub('CR'), run(` ) = ${N(Math.min(1.33 * r.MU_pos, 1.6 * 0.67 * r.Mcr), 3)} `), blue('kip·ft', { italic: true })]),
        ], ''),
        lVr([
          calcLine([run('M'), sub('Min.Neg'), run(' := min(1.33·M'), sub('U.Panel.Neg'), run(', 1.6·0.67·M'), sub('CR'), run(` ) = ${N(Math.min(1.33 * r.MU_neg, 1.6 * 0.67 * r.Mcr), 3)} `), blue('kip·ft', { italic: true })]),
        ], ''),
      ]),
      blank(80),
      page4Para([run('Factored Ultimate Moment', { bold: true })], { after: 100 }),
      lVt([
        lVr([
          calcLine([run('M'), sub('U.Panel.Pos'), run(' := max(M'), sub('U.Panel.Pos'), run(', M'), sub('Min.Pos'), run(` ) = ${N(r.MMin_pos, 3)} `), blue('kip·ft', { italic: true })]),
          calcLine([run('M'), sub('U.Panel.Neg'), run(' := max(M'), sub('U.Panel.Neg'), run(', M'), sub('Min.Neg'), run(` ) = ${N(r.MMin_neg, 3)} `), blue('kip·ft', { italic: true })]),
          calcLine([run('V'), sub('U.Panel'), run(` := ${N(r.VU_panel, 3)} `), blue('kip', { italic: true })]),
        ], ''),
      ]),
      pageBreak(),

      // ── N.5 Flexural Capacity ──
      panelSecHead('Flexural Capacity', 'AASHTO 5.6.3.2.2'),
      ...flexBlock('Horizontal Positive Flexural Capacity:', 'AASHTO 5.6.3.2.2', 'B.Hor', 'Rebar.Pos.Hor', 'Flexure.Pos.Hor', 'Pos.Hor', 'Pos', r.C_HorPos, r.a_HorPos, r.et_HorPos, r.phi_f_HorPos, r.MN_pos_Hor, r.phiMN_pos_Hor, r.MMin_pos, r.check_HorPos_flex, `#${inp.barNumHor} @ ${N(inp.spacingHor, 0)}"`, 'Horizontal Positive Flexure'),
      ...flexBlock('Vertical Positive Flexural Capacity:', 'AASHTO 5.6.3.2.2', 'B.Vert', 'Rebar.Pos.Vert', 'Flexure.Pos.Vert', 'Pos.Vert', 'Pos', r.C_VertPos, r.a_VertPos, r.et_VertPos, r.phi_f_VertPos, r.MN_pos_Vert, r.phiMN_pos_Vert, r.MMin_pos, r.check_VertPos_flex, `#${inp.barNumVert} @ ${N(inp.spacingVert, 0)}"`, 'Vertical Positive Flexure'),
      ...flexBlock('Horizontal Negative Flexural Capacity:', 'AASHTO 5.6.3.2.2', 'B.Hor', 'Rebar.Neg.Hor', 'Flexure.Neg.Hor', 'Neg.Hor', 'Neg', r.C_HorNeg, r.a_HorNeg, r.et_HorNeg, r.phi_f_HorNeg, r.MN_neg_Hor, r.phiMN_neg_Hor, r.MMin_neg, r.check_HorNeg_flex, `#${inp.barNumHor} @ ${N(inp.spacingHor, 0)}"`, 'Horizontal Negative Flexure'),
      ...flexBlock('Vertical Negative Flexural Capacity:', 'AASHTO 5.6.3.2.2', 'B.Vert', 'Rebar.Neg.Vert', 'Flexure.Neg.Vert', 'Neg.Vert', 'Neg', r.C_VertNeg, r.a_VertNeg, r.et_VertNeg, r.phi_f_VertNeg, r.MN_neg_Vert, r.phiMN_neg_Vert, r.MMin_neg, r.check_VertNeg_flex, `#${inp.barNumVert} @ ${N(inp.spacingVert, 0)}"`, 'Vertical Negative Flexure'),

      // ── N.6 Crack Control ──
      panelSecHead('Crack Control', 'AASHTO 5.6.7'),
      ...crackBlock('Service I: Service Crack Control: Horizontal Reinforcement', inp.spacingHor, r.a_HorPos, r.fs_Hor, r.dc_Hor, r.Vs_Hor, r.Smax_Hor, r.check_crack_Hor, 'B.Hor', 'Rebar.Pos.Hor', 'Rebar.Neg.Hor'),
      ...crackBlock('Service I: Service Crack Control: Vertical Reinforcement', inp.spacingVert, r.a_VertPos, r.fs_Vert, r.dc_Vert, r.Vs_Vert, r.Smax_Vert, r.check_crack_Vert, 'B.Vert', 'Rebar.Pos.Vert', 'Rebar.Neg.Vert'),

      // ── N.7 Shear Capacity ──
      panelSecHead('Shear Capacity', 'AASHTO 5.7.3.4.1'),
      page4Para([run('Shear Capacity Parameters:', { bold: true })], { after: 80 }),
      lVt([
        lVr([
          calcLine([run('V'), sub('U.Panel'), run(` := ${N(r.VU_panel, 3)} `), blue('kip', { italic: true })]),
        ], 'Factored shear force at location of soil reinforcement connection. AASHTO 5.5.4.2.1 / 5.7.3.4.1'),
        lVr([
          calcLine([run('φ'), sub('V'), run(' := 0.9          β'), sub('S'), run(' := 2')]),
        ], ''),
      ]),
      page4Para([run('Factored Shear Capacity:', { bold: true })], { after: 80 }),
      lVt([
        lVr([
          calcLine([run('V'), sub('N.1'), run(' := 0.0316·β'), sub('S'), run('·√(f\''), sub('C.Con'), run('/ksi)·ksi·t'), sub('Panel'), run('·s'), sub('SR'), run(` = ${N(r.Vc, 3)} `), blue('kip', { italic: true })]),
        ], 'AASHTO 5.7.3.3-3'),
        lVr([
          calcLine([run('V'), sub('N.2'), run(' := 0.25·f\''), sub('C.Con'), run('·t'), sub('Panel'), run('·s'), sub('SR'), run(` = ${N(r.Vc_max, 3)} `), blue('kip', { italic: true })]),
        ], 'AASHTO 5.7.3.3-2'),
        lVr([
          calcLine([run('V'), sub('N.Panel'), run(' := min(V'), sub('N.1'), run(', V'), sub('N.2'), run(`) = ${N(Math.min(r.Vc, r.Vc_max), 3)} `), blue('kip', { italic: true })]),
        ], 'Nominal / Factored Shear Capacity. AASHTO 5.7.3.3'),
        lVr([
          calcLine([run('φV'), sub('N.Panel'), run(' := φ'), sub('V'), run('·V'), sub('N.Panel'), run(` = ${N(r.phiVc, 3)} `), blue('kip', { italic: true }), run('     φV'), sub('N.Panel'), run('/V'), sub('U.Panel'), run(` = ${ratioStr(r.phiVc, r.VU_panel)}`)]),
        ], ''),
        lVrFull([checkBox([run('Check'), sub('Shear.Panel'), run(' = ')], [r.check_shear])]),
      ]),
    ];
  };

  // ── Pre-render internal-stability LTDS charts (async, before assembly) ──
  const abutmentChart = abutmentInternal ? await renderLtdsChartPng(abutmentInternal.rows) : null;
  const wingChart = wingInternal ? await renderLtdsChartPng(wingInternal.rows) : null;

  const wallSection = (titleText: string, children: DocChild[]) => ({
    properties: { page },
    headers: { default: calculationHeader(titleText) },
    footers: { default: pageFooter },
    children,
  });

  const docSections: ISectionOptions[] = [
    reportSection,
    designBasisSection,
  ];

  let docSecNum = 0;
  if (hasAbutment || (!hasAbutment && !hasWing)) {
    ++docSecNum;
    docSections.push(
      wallSection(
        abutmentTitle,
        wallCalcChildren(abutmentCtx, { title: abutmentTitle, isWing: false, chart: abutmentChart, sectionNum: docSecNum }),
      ),
    );
  }
  if (hasWing) {
    ++docSecNum;
    const wingTitle = 'MSE Wing Wall Design Calculations';
    docSections.push(
      wallSection(
        wingTitle,
        wallCalcChildren(wingCtx, { title: wingTitle, isWing: true, chart: wingChart, sectionNum: docSecNum }),
      ),
    );
  }
  if (panelDesign) {
    ++docSecNum;
    docSections.push(
      wallSection('Precast Panel Facing', panelFacingChildren(panelDesign, docSecNum)),
    );
  }

  const doc = new Document({
    creator: data.generatedBy,
    sections: docSections,
  });

  return Packer.toBuffer(doc);
}
