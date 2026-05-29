const YEV_STR_I = 1.35;
const GAMMA_E = 1.0;    // exposure factor
const BETA_SHEAR = 2.0; // AASHTO simplified procedure
const PHI_V = 0.9;      // shear resistance factor

export interface PanelFaceParams {
  fc: number;          // ksi
  fy: number;          // ksi
  tPanel: number;      // in (panel thickness)
  ssr: number;         // in (connector/reinforcement spacing)
  cCoverPos: number;   // in (cover to positive moment steel)
  cCoverNeg: number;   // in (cover to negative moment steel, not directly used — geometry handles it)
  barNumVert: number;  // bar number (e.g. 5 for #5)
  spacingVert: number; // in
  barNumHor: number;   // bar number
  spacingHor: number;  // in
  huStr: number;       // kip/ft — max TMax Strength I from internal stability
  huEe: number;        // kip/ft — max TMax Extreme Event I from internal stability
}

export interface PanelFaceResult {
  // Derived bar / area properties
  dBarVert: number;   // in
  dBarHor: number;    // in
  ABvert: number;     // in² per ssr width
  ABhor: number;      // in²
  dB_pos_Vert: number; // in — effective depth, positive vertical
  dB_pos_Hor: number;  // in — effective depth, positive horizontal
  dB_neg_Vert: number; // in — effective depth, negative vertical
  dB_neg_Hor: number;  // in — effective depth, negative horizontal

  // Panel loads
  HU_panel: number;  // kip/ft
  MU_pos: number;    // kip·ft — positive moment demand
  MU_neg: number;    // kip·ft — negative moment demand
  VU_panel: number;  // kip — shear demand

  // Section properties
  fr: number;   // ksi — modulus of rupture
  St: number;   // in³ — elastic section modulus
  Mcr: number;  // kip·ft — cracking moment

  // Governing demands (with min reinforcement check)
  MMin_pos: number; // kip·ft
  MMin_neg: number; // kip·ft

  // Stress block factors
  beta1: number;
  alpha1: number;

  // Horizontal Positive Flexure
  C_HorPos: number;
  a_HorPos: number;
  et_HorPos: number;
  phi_f_HorPos: number;
  MN_pos_Hor: number;
  phiMN_pos_Hor: number;
  check_HorPos_flex: string;

  // Vertical Positive Flexure
  C_VertPos: number;
  a_VertPos: number;
  et_VertPos: number;
  phi_f_VertPos: number;
  MN_pos_Vert: number;
  phiMN_pos_Vert: number;
  check_VertPos_flex: string;

  // Horizontal Negative Flexure
  C_HorNeg: number;
  a_HorNeg: number;
  et_HorNeg: number;
  phi_f_HorNeg: number;
  MN_neg_Hor: number;
  phiMN_neg_Hor: number;
  check_HorNeg_flex: string;

  // Vertical Negative Flexure
  C_VertNeg: number;
  a_VertNeg: number;
  et_VertNeg: number;
  phi_f_VertNeg: number;
  MN_neg_Vert: number;
  phiMN_neg_Vert: number;
  check_VertNeg_flex: string;

  // Shear
  Vc: number;
  Vc_max: number;
  phiVc: number;
  check_shear: string;

  // Crack control — horizontal bars
  dc_Hor: number;
  Vs_Hor: number;
  fs_Hor: number;  // ksi
  Smax_Hor: number; // in
  check_crack_Hor: string;

  // Crack control — vertical bars
  dc_Vert: number;
  Vs_Vert: number;
  fs_Vert: number;  // ksi
  Smax_Vert: number; // in
  check_crack_Vert: string;
}

function phiF(et: number): number {
  if (et >= 0.005) return 0.9;
  return Math.max(0.75, 0.75 + (0.15 * (et - 0.002)) / 0.003);
}

function flexureCheck(
  As: number,
  fy: number,
  alpha1: number,
  fc: number,
  beta1: number,
  b: number,
  d: number,
) {
  const C = (As * fy) / (alpha1 * fc * beta1 * b);
  const a = beta1 * C;
  const et = ((d - C) / C) * 0.003;
  const phi = phiF(et);
  const MN = (As * fy * (d - a / 2)) / 12; // kip·ft
  return { C, a, et, phi, MN, phiMN: phi * MN };
}

export function analyzePanelFace(p: PanelFaceParams): PanelFaceResult {
  const { fc, fy, tPanel, ssr, cCoverPos, barNumVert, spacingVert, barNumHor, spacingHor, huStr, huEe } = p;

  // Bar diameters and areas
  const dBarVert = barNumVert / 8;
  const dBarHor = barNumHor / 8;
  const ABvert = (Math.PI / 4) * dBarVert ** 2 * (1 / spacingVert) * ssr;
  const ABhor = (Math.PI / 4) * dBarHor ** 2 * (1 / spacingHor) * ssr;

  // Effective depths
  const dB_pos_Vert = tPanel - cCoverPos - 0.5 * dBarVert;
  const dB_pos_Hor = tPanel - cCoverPos - dBarVert - 0.5 * dBarHor;
  const dB_neg_Vert = tPanel - dB_pos_Vert;
  const dB_neg_Hor = tPanel - dB_pos_Hor;

  // Panel loads
  const HU_panel = Math.max(huStr, huEe);
  const span = ssr / 12; // ft
  const MU_pos = Math.max((HU_panel * span ** 2) / 8, 0.08 * HU_panel * span ** 2);
  const MU_neg = Math.max((HU_panel * span ** 2) / 12, 0.125 * HU_panel * span ** 2);
  const VU_panel = 0.625 * HU_panel * span;

  // Concrete section properties
  const fr = 0.24 * Math.sqrt(fc);
  const St = (ssr * tPanel ** 2) / 6;
  const Mcr = (fr * St) / 12;

  // Governing demands with minimum reinforcement check
  const MMin_pos = Math.max(MU_pos, Math.min(1.33 * MU_pos, 1.6 * 0.67 * Mcr));
  const MMin_neg = Math.max(MU_neg, Math.min(1.33 * MU_neg, 1.6 * 0.67 * Mcr));

  // Stress block factors
  const beta1 = Math.max(0.85 - 0.05 * (fc - 4), 0.65);
  const alpha1 = Math.min(Math.max(0.85 - 0.02 * (fc - 10), 0.75), 0.85);

  // Flexure checks — b = ssr (compression zone width = connector spacing, per Excel G15)
  const horPos = flexureCheck(ABhor, fy, alpha1, fc, beta1, ssr, dB_pos_Hor);
  const vertPos = flexureCheck(ABvert, fy, alpha1, fc, beta1, ssr, dB_pos_Vert);
  const horNeg = flexureCheck(ABhor, fy, alpha1, fc, beta1, ssr, dB_neg_Hor);
  const vertNeg = flexureCheck(ABvert, fy, alpha1, fc, beta1, ssr, dB_neg_Vert);

  // Shear (over ssr × tPanel cross-section)
  const Vc = 0.0316 * BETA_SHEAR * Math.sqrt(fc) * tPanel * ssr;
  const Vc_max = 0.25 * fc * tPanel * ssr;
  const phiVc = PHI_V * Math.min(Vc, Vc_max);

  // Crack control — horizontal bars (a from horPos flexure check, per Excel T27 = C99)
  const dc_Hor = tPanel - dB_neg_Hor;
  const Vs_Hor = 1 + dc_Hor / (0.7 * (tPanel - dc_Hor));
  const fs_Hor = Math.min(
    0.6 * fy,
    ((MMin_pos / YEV_STR_I) * 12) / (ABhor * (dB_pos_Hor - horPos.a / 2)),
    ((MMin_neg / YEV_STR_I) * 12) / (ABhor * (dB_neg_Hor - horPos.a / 2)),
  );
  const Smax_Hor = Math.max(5, (700 * GAMMA_E) / (Vs_Hor * fs_Hor) - 2 * dc_Hor);

  // Crack control — vertical bars (a from vertPos, both terms use dB_pos_Vert per Excel Z59)
  const dc_Vert = tPanel - dB_neg_Vert;
  const Vs_Vert = 1 + dc_Vert / (0.7 * (tPanel - dc_Vert));
  const fs_Vert = Math.min(
    0.6 * fy,
    ((MMin_pos / YEV_STR_I) * 12) / (ABvert * (dB_pos_Vert - vertPos.a / 2)),
    ((MMin_neg / YEV_STR_I) * 12) / (ABvert * (dB_neg_Vert - vertPos.a / 2)),
  );
  const Smax_Vert = Math.max(5, (700 * GAMMA_E) / (Vs_Vert * fs_Vert) - 2 * dc_Vert);

  return {
    dBarVert, dBarHor, ABvert, ABhor,
    dB_pos_Vert, dB_pos_Hor, dB_neg_Vert, dB_neg_Hor,
    HU_panel, MU_pos, MU_neg, VU_panel,
    fr, St, Mcr,
    MMin_pos, MMin_neg,
    beta1, alpha1,
    C_HorPos: horPos.C, a_HorPos: horPos.a, et_HorPos: horPos.et, phi_f_HorPos: horPos.phi,
    MN_pos_Hor: horPos.MN, phiMN_pos_Hor: horPos.phiMN,
    check_HorPos_flex: horPos.phiMN >= MMin_pos ? 'Adequate' : 'Inadequate',
    C_VertPos: vertPos.C, a_VertPos: vertPos.a, et_VertPos: vertPos.et, phi_f_VertPos: vertPos.phi,
    MN_pos_Vert: vertPos.MN, phiMN_pos_Vert: vertPos.phiMN,
    check_VertPos_flex: vertPos.phiMN >= MMin_pos ? 'Adequate' : 'Inadequate',
    C_HorNeg: horNeg.C, a_HorNeg: horNeg.a, et_HorNeg: horNeg.et, phi_f_HorNeg: horNeg.phi,
    MN_neg_Hor: horNeg.MN, phiMN_neg_Hor: horNeg.phiMN,
    check_HorNeg_flex: horNeg.phiMN >= MMin_neg ? 'Adequate' : 'Inadequate',
    C_VertNeg: vertNeg.C, a_VertNeg: vertNeg.a, et_VertNeg: vertNeg.et, phi_f_VertNeg: vertNeg.phi,
    MN_neg_Vert: vertNeg.MN, phiMN_neg_Vert: vertNeg.phiMN,
    check_VertNeg_flex: vertNeg.phiMN >= MMin_neg ? 'Adequate' : 'Inadequate',
    Vc, Vc_max, phiVc,
    check_shear: phiVc >= VU_panel ? 'Adequate' : 'Inadequate',
    dc_Hor, Vs_Hor, fs_Hor, Smax_Hor,
    check_crack_Hor: spacingHor <= Smax_Hor ? 'Adequate' : 'Inadequate',
    dc_Vert, Vs_Vert, fs_Vert, Smax_Vert,
    check_crack_Vert: spacingVert <= Smax_Vert ? 'Adequate' : 'Inadequate',
  };
}
