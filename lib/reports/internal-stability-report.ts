import {
  AlignmentType,
  BorderStyle,
  Document,
  HeadingLevel,
  ImageRun,
  Packer,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} from 'docx';
import ExcelJS from 'exceljs';
import { ChartJSNodeCanvas } from 'chartjs-node-canvas';
import { LinearScale, PointElement, LineElement, Legend, Tooltip } from 'chart.js';
import type { InternalStabilityRow } from '@/lib/calculations/internal-stability';

const N = (v: number, d = 4) => (isFinite(v) ? v.toFixed(d) : '—');

// ─── Server-side chart renderer ────────────────────────────────────────────────

async function renderLtdsChartPng(rows: InternalStabilityRow[]): Promise<Buffer> {
  const canvas = new ChartJSNodeCanvas({
    width: 900,
    height: 600,
    backgroundColour: 'white',
    chartCallback: (ChartJS) => {
      ChartJS.register(LinearScale, PointElement, LineElement, Legend, Tooltip);
    },
  });

  const zValues = rows.map((r) => r.z);
  const make = (ltds: number[]) => ltds.map((v, i) => ({ x: v / 1000, y: zValues[i] }));
  const maxZ = Math.max(...zValues);

  const buf = await canvas.renderToBuffer({
    type: 'scatter',
    data: {
      datasets: [
        { label: 'Geostrip',      data: make(rows.map((r) => r.ltdsGeostrip)), borderColor: 'rgba(75,192,192,1)',  backgroundColor: 'rgba(75,192,192,1)',  borderWidth: 2, pointRadius: 3, showLine: true },
        { label: 'Geogrid',       data: make(rows.map((r) => r.ltdsGeogrid)), borderColor: 'rgba(255,99,132,1)',  backgroundColor: 'rgba(255,99,132,1)',  borderWidth: 2, pointRadius: 3, showLine: true },
        { label: 'Metallic Grid', data: make(rows.map((r) => r.ltdsSg)),      borderColor: 'rgba(54,162,235,1)',  backgroundColor: 'rgba(54,162,235,1)',  borderWidth: 2, pointRadius: 3, showLine: true },
        { label: 'Metallic Strip',data: make(rows.map((r) => r.ltdsSs)),      borderColor: 'rgba(153,102,255,1)', backgroundColor: 'rgba(153,102,255,1)', borderWidth: 2, pointRadius: 3, showLine: true },
      ],
    },
    options: {
      responsive: false,
      parsing: false,
      animation: false,
      scales: {
        x: {
          type: 'linear',
          position: 'bottom',
          title: { display: true, text: 'Required Factored LTDS (kip/ft)' },
          beginAtZero: true,
          grid: { display: true, color: 'rgba(0,0,0,0.07)' },
          ticks: { stepSize: 0.5 },
        },
        y: {
          type: 'linear',
          title: { display: true, text: 'Depth below finished grade, z (ft)' },
          beginAtZero: true,
          max: Math.ceil(maxZ + 1),
          reverse: true,
          grid: { display: true, color: 'rgba(0,0,0,0.07)' },
          ticks: { stepSize: 1, callback: (v: number | string) => Number(v) % 5 === 0 ? String(v) : '' },
        },
      },
      plugins: {
        legend: { position: 'top' },
      },
    },
  });

  return buf;
}

export interface InternalReportData {
  projectName: string;
  projectLocation: string;
  designTypeName: string;
  createdBy: string;
  generatedAt: Date;
  minRl: number;
  params: Record<string, string>;
  rows: InternalStabilityRow[];
}

// ─── Word (.docx) ─────────────────────────────────────────────────────────────

const border = {
  top: { style: BorderStyle.SINGLE, size: 1 },
  bottom: { style: BorderStyle.SINGLE, size: 1 },
  left: { style: BorderStyle.SINGLE, size: 1 },
  right: { style: BorderStyle.SINGLE, size: 1 },
};

function cell(text: string, header = false): TableCell {
  return new TableCell({
    borders: border,
    children: [
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [new TextRun({ text, bold: header, size: header ? 18 : 16 })],
      }),
    ],
  });
}

function headerRow(cols: string[]): TableRow {
  return new TableRow({ children: cols.map((c) => cell(c, true)), tableHeader: true });
}

function dataRow(cols: string[]): TableRow {
  return new TableRow({ children: cols.map((c) => cell(c)) });
}

function section(title: string): Paragraph {
  return new Paragraph({
    text: title,
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 240, after: 80 },
  });
}

function makeTable(headers: string[], rows: string[][]): Table {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [headerRow(headers), ...rows.map(dataRow)],
  });
}

export async function generateDocx(d: InternalReportData): Promise<Buffer> {
  const { projectName, projectLocation, designTypeName, createdBy, generatedAt, params, rows } = d;
  const paramRows = Object.entries(params).map(([k, v]) => [k, v]);
  const chartPng = await renderLtdsChartPng(rows);

  const doc = new Document({
    sections: [{
      children: [
        new Paragraph({ text: 'MSE Design Analysis Report', heading: HeadingLevel.HEADING_1, alignment: AlignmentType.CENTER }),
        new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: `${projectName} — ${projectLocation}`, size: 22 })] }),
        new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: designTypeName, size: 20, italics: true })] }),
        new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: `Generated by ${createdBy} on ${generatedAt.toLocaleDateString()}`, size: 18, color: '666666' })], spacing: { after: 240 } }),

        section('Input Parameters'),
        makeTable(['Parameter', 'Value'], paramRows),

        section('Stress / Load Determination at Reinforcement Level'),
        makeTable(
          ['DH (ft)', 'RL (ft)', 'z (ft)', 'σEV.Z (ksf)', 'h_eq (ft)', 'σLS.Z (ksf)', 'ωIR (kip/ft)', 'ωAE (kip/ft)', 'ωEQ.1', 'ωEQ.2', 'PEQ', 'σEQ'],
          rows.map((r) => [N(r.dh, 2), N(r.rl, 2), N(r.z, 2), N(r.sEvZ), N(r.hEq, 1), N(r.sLsZ), N(r.wIr, 3), N(r.wAe, 3), N(r.wEq1, 3), N(r.wEq2, 3), N(r.pEq, 3), N(r.sEq, 3)]),
        ),

        section('Geosynthetic Strip'),
        makeTable(
          ['z (ft)', 'σV Str-I', 'σH Str-I', 'σV EE-I', 'σH EE-I', 'Tmax Str-I', 'Tmax EE-I', 'lE Str-I', 'lE EE-I', 'lE', 'lA', 'RL min', 'LTDS (lb/ft)', 'PO Check'],
          rows.map((r) => [N(r.z, 2), N(r.sVStrI), N(r.sHStrI), N(r.sVEeI), N(r.sHEeI), N(r.tMaxStrIGstrip), N(r.tMaxEeIGstrip), N(r.lEStrIGs, 3), N(r.lEEeIGs, 3), N(r.lEGeostrip, 3), N(r.lAGs, 3), N(r.rlMinGeostrip, 3), N(r.ltdsGeostrip, 0), r.poGeostripCheck]),
        ),

        section('Geosynthetic Grid'),
        makeTable(
          ['z (ft)', 'σV Str-I', 'σH Str-I', 'σV EE-I', 'σH EE-I', 'Tmax Str-I', 'Tmax EE-I', 'lE Str-I', 'lE EE-I', 'lE', 'lA', 'RL min', 'LTDS (lb/ft)', 'PO Check'],
          rows.map((r) => [N(r.z, 2), N(r.sVStrI), N(r.sHStrI), N(r.sVEeI), N(r.sHEeI), N(r.tMaxStrIGgrid), N(r.tMaxEeIGgrid), N(r.lEStrIGg, 3), N(r.lEEeIGg, 3), N(r.lEGeogrid, 3), N(r.lAGg, 3), N(r.rlMinGeogrid, 3), N(r.ltdsGeogrid, 0), r.poGeogridCheck]),
        ),

        section('Metallic Grid'),
        makeTable(
          ['z (ft)', "F'", 'kR.Sg', 'σV Str-I', 'σH Str-I', 'σV EE-I', 'σH EE-I', 'Tmax Str-I', 'Tmax EE-I', 'lE Str-I', 'lE EE-I', 'lE', 'lA', 'RL min', 'LTDS (lb/ft)', 'PO Check'],
          rows.map((r) => [N(r.z, 2), N(r.fpMg), N(r.krSg), N(r.sVStrIMg), N(r.sHStrIMg), N(r.sVEeIMg), N(r.sHEeIMg), N(r.tMaxStrISg), N(r.tMaxEeISg), N(r.lEStrIMg, 3), N(r.lEEeIMg, 3), N(r.lESg, 3), N(r.lASg, 2), N(r.rlMinSg, 3), N(r.ltdsSg, 0), r.poSgCheck]),
        ),

        section('Ribbed Metallic Strip'),
        makeTable(
          ['z (ft)', "F'", 'kR.Ss', 'Rc.Ss', 'σV Str-I', 'σH Str-I', 'σV EE-I', 'σH EE-I', 'Tmax Str-I', 'Tmax EE-I', 'lE Str-I', 'lE EE-I', 'lE', 'lA', 'RL min', 'LTDS (lb/ft)', 'PO Check'],
          rows.map((r) => [N(r.z, 2), N(r.fpSs), N(r.krSs), N(r.rcSs), N(r.sVStrISs), N(r.sHStrISs), N(r.sVEeISs), N(r.sHEeISs), N(r.tMaxStrISs), N(r.tMaxEeISs), N(r.lEStrISs, 3), N(r.lEEeISs, 3), N(r.lESs, 3), N(r.lASs, 2), N(r.rlMinSs, 3), N(r.ltdsSs, 0), r.poSsCheck]),
        ),

        section('Required Factored LTDS (lb/ft)'),
        makeTable(
          ['z (ft)', 'Geostrip Str-I', 'Geogrid Str-I', 'Met.Grid Str-I', 'Rib.Strip Str-I', 'Geostrip EE-I', 'Geogrid EE-I', 'Met.Grid EE-I', 'Rib.Strip EE-I'],
          rows.map((r) => [N(r.z, 2), N(r.ltdsGeostrip, 0), N(r.ltdsGeogrid, 0), N(r.ltdsSg, 0), N(r.ltdsSs, 0), N(r.ltdsEeIGs, 0), N(r.ltdsEeIGg, 0), N(r.ltdsEeISg, 0), N(r.ltdsEeISs, 0)]),
        ),

        section('Internal Stability — LTDS Chart'),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 120, after: 120 },
          children: [
            new ImageRun({
              type: 'png',
              data: chartPng,
              transformation: { width: 620, height: 413 },
            }),
          ],
        }),
      ],
    }],
  });

  return Packer.toBuffer(doc);
}

// ─── Excel (.xlsx) ─────────────────────────────────────────────────────────────

const ADEQUATE_FILL: ExcelJS.Fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD1FAE5' } };
const INADEQUATE_FILL: ExcelJS.Fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEE2E2' } };

function addSheet(wb: ExcelJS.Workbook, name: string, headers: string[], data: (string | number)[][]) {
  const ws = wb.addWorksheet(name);
  ws.addRow(headers).eachCell((c) => {
    c.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 10 };
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A5F' } };
    c.alignment = { horizontal: 'center', wrapText: true };
    c.border = { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } };
  });
  for (const row of data) {
    const r = ws.addRow(row);
    r.eachCell((c) => {
      c.alignment = { horizontal: 'center' };
      c.border = { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } };
      if (typeof c.value === 'string') {
        if (c.value === 'Adequate') c.fill = ADEQUATE_FILL;
        else if (c.value === 'Inadequate') { c.fill = INADEQUATE_FILL; c.font = { color: { argb: 'FF991B1B' } }; }
      }
    });
  }
  ws.columns.forEach((col) => { col.width = Math.max(12, (col.header?.toString().length ?? 12) + 4); });
}

export async function generateXlsx(d: InternalReportData): Promise<Buffer> {
  const { projectName, projectLocation, designTypeName, createdBy, generatedAt, params, rows } = d;
  const chartPng = await renderLtdsChartPng(rows);
  const wb = new ExcelJS.Workbook();
  wb.creator = createdBy;
  wb.created = generatedAt;

  const info = wb.addWorksheet('Info');
  info.addRow(['MSE Design Analysis Report']);
  info.getRow(1).font = { bold: true, size: 14 };
  info.addRow(['Project', projectName]);
  info.addRow(['Location', projectLocation]);
  info.addRow(['Design Type', designTypeName]);
  info.addRow(['Generated By', createdBy]);
  info.addRow(['Date', generatedAt.toLocaleDateString()]);
  info.addRow([]);
  info.addRow(['Parameter', 'Value']);
  info.getRow(8).font = { bold: true };
  for (const [k, v] of Object.entries(params)) info.addRow([k, v]);
  info.columns = [{ width: 28 }, { width: 30 }];

  addSheet(wb, 'Stress-Load',
    ['DH (ft)', 'RL (ft)', 'z (ft)', 'σEV.Z', 'h_eq', 'σLS.Z', 'ωIR', 'ωAE', 'ωEQ.1', 'ωEQ.2', 'PEQ', 'σEQ'],
    rows.map((r) => [r.dh, r.rl, r.z, r.sEvZ, r.hEq, r.sLsZ, r.wIr, r.wAe, r.wEq1, r.wEq2, r.pEq, r.sEq]),
  );

  addSheet(wb, 'Geostrip',
    ['z (ft)', 'σV Str-I', 'σH Str-I', 'σV EE-I', 'σH EE-I', 'Tmax Str-I', 'Tmax EE-I', 'lE Str-I', 'lE EE-I', 'lE', 'lA', 'RL min', 'LTDS (lb/ft)', 'PO Check'],
    rows.map((r) => [r.z, r.sVStrI, r.sHStrI, r.sVEeI, r.sHEeI, r.tMaxStrIGstrip, r.tMaxEeIGstrip, r.lEStrIGs, r.lEEeIGs, r.lEGeostrip, r.lAGs, r.rlMinGeostrip, r.ltdsGeostrip, r.poGeostripCheck]),
  );

  addSheet(wb, 'Geogrid',
    ['z (ft)', 'σV Str-I', 'σH Str-I', 'σV EE-I', 'σH EE-I', 'Tmax Str-I', 'Tmax EE-I', 'lE Str-I', 'lE EE-I', 'lE', 'lA', 'RL min', 'LTDS (lb/ft)', 'PO Check'],
    rows.map((r) => [r.z, r.sVStrI, r.sHStrI, r.sVEeI, r.sHEeI, r.tMaxStrIGgrid, r.tMaxEeIGgrid, r.lEStrIGg, r.lEEeIGg, r.lEGeogrid, r.lAGg, r.rlMinGeogrid, r.ltdsGeogrid, r.poGeogridCheck]),
  );

  addSheet(wb, 'Metallic Grid',
    ['z (ft)', "F'", 'kR.Sg', 'σV Str-I', 'σH Str-I', 'σV EE-I', 'σH EE-I', 'Tmax Str-I', 'Tmax EE-I', 'lE Str-I', 'lE EE-I', 'lE', 'lA', 'RL min', 'LTDS (lb/ft)', 'PO Check'],
    rows.map((r) => [r.z, r.fpMg, r.krSg, r.sVStrIMg, r.sHStrIMg, r.sVEeIMg, r.sHEeIMg, r.tMaxStrISg, r.tMaxEeISg, r.lEStrIMg, r.lEEeIMg, r.lESg, r.lASg, r.rlMinSg, r.ltdsSg, r.poSgCheck]),
  );

  addSheet(wb, 'Ribbed Strip',
    ['z (ft)', "F'", 'kR.Ss', 'Rc.Ss', 'σV Str-I', 'σH Str-I', 'σV EE-I', 'σH EE-I', 'Tmax Str-I', 'Tmax EE-I', 'lE Str-I', 'lE EE-I', 'lE', 'lA', 'RL min', 'LTDS (lb/ft)', 'PO Check'],
    rows.map((r) => [r.z, r.fpSs, r.krSs, r.rcSs, r.sVStrISs, r.sHStrISs, r.sVEeISs, r.sHEeISs, r.tMaxStrISs, r.tMaxEeISs, r.lEStrISs, r.lEEeISs, r.lESs, r.lASs, r.rlMinSs, r.ltdsSs, r.poSsCheck]),
  );

  addSheet(wb, 'LTDS',
    ['z (ft)', 'Geostrip Str-I', 'Geogrid Str-I', 'Met.Grid Str-I', 'Rib.Strip Str-I', 'Geostrip EE-I', 'Geogrid EE-I', 'Met.Grid EE-I', 'Rib.Strip EE-I'],
    rows.map((r) => [r.z, r.ltdsGeostrip, r.ltdsGeogrid, r.ltdsSg, r.ltdsSs, r.ltdsEeIGs, r.ltdsEeIGg, r.ltdsEeISg, r.ltdsEeISs]),
  );

  const chartWs = wb.addWorksheet('Chart');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const imageId = wb.addImage({ buffer: chartPng as any, extension: 'png' });
  chartWs.addImage(imageId, { tl: { col: 0, row: 0 }, ext: { width: 900, height: 600 } });

  const buf = await wb.xlsx.writeBuffer();
  return Buffer.from(buf);
}
