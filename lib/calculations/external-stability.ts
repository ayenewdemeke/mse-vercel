const deg = (d: number) => (d * Math.PI) / 180;

function generateDh(minH: number, maxH: number, sV: number): number[] {
  const spacing = sV / 2;
  const values: number[] = [];
  for (let h = minH; h <= maxH + 1e-9; h += spacing) values.push(h);
  return values;
}

function calcHEq(dh: number): number {
  if (dh <= 5) return 4;
  if (dh >= 20) return 2;
  if (dh <= 10) return 4 - ((dh - 5) / 5) * 1;
  return 3 - ((dh - 10) / 10) * 1;
}

export interface ExternalStabilityParams {
  yev: number;
  ylsV: number;
  bstemBatter: number;
  bI: number;
  sigmaBrg: number;
  deltaS: number;
  gRFill: number;
  phiRFill: number;
  phiFSoil: number;
  pga: number;
  fPgaEq: number;
  kV: number;
  minDesignHeight: number;
  maxDesignHeight: number;
  sV: number;
  theta?: number; // wing types only
  minRl?: number;
}

export interface AnalysisRow {
  dh: number;
  rl: number;
  hEq: number;
  pLsV: number;
  pEv: number;
  mLsV: number;
  mEv: number;
  pLsH: number;
  pEh: number;
  pEq: number;
  mLsH: number;
  mEh: number;
  mEq: number;
  puSerIV: number;
  muSerIV: number;
  puStrIV: number;
  muStrIV: number;
  puEeIV: number;
  muEeIV: number;
  puSerILat: number;
  muSerILat: number;
  puStrILat: number;
  muStrILat: number;
  puEeILat: number;
  muEeILat: number;
  eccBrgStrI: number;
  suBrgStrI: number;
  checkBrgStrI: string;
  eccOvtStrI: number;
  checkOvtStrI: string;
  phiRrStrIClass1: number;
  phiRrStrIFSoil: number;
  checkSldStrIClass1: string;
  checkSldStrIFSoil: string;
  eccBrgEeI: number;
  suBrgEeI: number;
  checkBrgEeI: string;
  eccOvtEeI: number;
  checkOvtEeI: string;
  phiRrEeIClass1: number;
  phiRrEeIFSoil: number;
  checkSldEeIClass1: string;
  checkSldEeIFSoil: string;
  eccBrgSerI: number;
  suBrgSerI: number;
  checkBrgSerI: string;
  demBrgStrI: number;
  demBrgEeI: number;
  demBrgSerI: number;
  demOvtStrI: number;
  demOvtEeI: number;
  demSldStrI: number;
  demSldEeI: number;
  demCtrl: number;
  limitState: string;
  nl: number;
  // wing only
  puSldStrI?: number;
}

// Load factors (AASHTO LRFD - same for all 3 external types)
const YLS_SER_I = 1;
const YEH_SER_I = 1;
const YEV_SER_I = 1;
const YEQ_SER_I = 0;
const YLS_STR_I = 1.75;
const YEH_STR_I = 1.5;
const YEV_STR_I = 1.35;
const YEQ_STR_I = 0;
const YEV_STR_I_MIN = 1;
const YLS_EE_I = 0.5;
const YEH_EE_I = 0;
const YEV_EE_I = 1;
const YEQ_EE_I = 1;
const PHI_B_STR = 0.65;
const PHI_B_EE = 0.9;
const PHI_SLIDING = 1;

export function analyzeAbutmentExternal(p: ExternalStabilityParams): AnalysisRow[] {
  const { yev, ylsV, bstemBatter, bI, sigmaBrg, deltaS, gRFill, phiRFill, phiFSoil,
    pga, fPgaEq, kV, minDesignHeight, maxDesignHeight, sV } = p;
  const minRl = p.minRl ?? 8;
  const rows: AnalysisRow[] = [];

  for (const dh of generateDh(minDesignHeight, maxDesignHeight, sV)) {
    const rl = Math.max(0.7 * dh, minRl);
    const hEq = calcHEq(dh);
    const sigmaLsV = (gRFill / 1000) * hEq;
    const pLsV = sigmaLsV * rl;
    const sigmaEv = (gRFill / 1000) * dh;
    const pEv = rl * sigmaEv;
    const mLsV = ylsV * pLsV;
    const mEv = yev * pEv;
    const kA = Math.tan(deg(45) - deg(phiRFill) / 2) ** 2;
    const sigmaLsH = (gRFill / 1000) * hEq * kA;
    const pLsH = dh * sigmaLsH;
    const pEh = 0.5 * (gRFill / 1000) * kA * dh ** 2;
    const kH = pga * fPgaEq;
    const phiMo = (Math.atan(kH / (1 - kV)) * 180) / Math.PI;
    const deltaSRad = deg(deltaS);
    const kAeTerm1 =
      Math.cos(deg(phiRFill) - deg(phiMo) - deg(bstemBatter)) ** 2 /
      (Math.cos(deg(phiMo)) *
        Math.cos(deg(bstemBatter)) ** 2 *
        Math.cos(deg(deltaSRad + bstemBatter + phiMo)));
    const kAeTerm2 =
      (1 +
        Math.sqrt(
          (Math.sin(deg(phiRFill + deltaSRad)) * Math.sin(deg(phiRFill - phiMo - bI))) /
            (Math.cos(deg(deltaSRad + bstemBatter + phiMo)) * Math.cos(deg(bI - bstemBatter))),
        )) **
      -2;
    const kAe = kAeTerm1 * kAeTerm2;
    const omegaIr = kH * (0.5 * (gRFill / 1000) * dh ** 2);
    const omegaAe = 0.5 * (gRFill / 1000) * dh ** 2 * kAe;
    const pEq = Math.max(omegaAe + 0.5 * omegaIr, omegaIr + 0.5 * omegaAe);
    const mLsH = pLsH * (dh / 2);
    const mEh = pEh * (dh / 3);
    const mEq = Math.max(
      omegaAe * (dh / 3) + 0.5 * omegaIr * 0.5 * dh,
      0.5 * omegaAe * (dh / 3) + omegaIr * 0.5 * dh,
    );

    // Load combinations
    const puSerIV = YLS_SER_I * pLsV + YEV_SER_I * pEv;
    const muSerIV = YLS_SER_I * mLsV + YEV_SER_I * mEv;
    const puStrIV = YLS_STR_I * pLsV + YEV_STR_I * pEv;
    const muStrIV = YLS_STR_I * mLsV + YEV_STR_I * mEv;
    const puEeIV = YLS_EE_I * pLsV + YEV_EE_I * pEv;
    const muEeIV = YLS_EE_I * mLsV + YEV_EE_I * mEv;
    const puSerILat = YLS_SER_I * pLsH + YEH_SER_I * pEh + YEQ_SER_I * pEq;
    const muSerILat = YLS_SER_I * mLsH + YEH_SER_I * mEh + YEQ_SER_I * mEq;
    const puStrILat = YLS_STR_I * pLsH + YEH_STR_I * pEh + YEQ_STR_I * pEq;
    const muStrILat = YLS_STR_I * mLsH + YEH_STR_I * mEh + YEQ_STR_I * mEq;
    const puEeILat = YLS_EE_I * pLsH + YEH_EE_I * pEh + YEQ_EE_I * pEq;
    const muEeILat = YLS_EE_I * mLsH + YEH_EE_I * mEh + YEQ_EE_I * mEq;

    // Str I checks
    const eccBrgStrI = muStrILat / puStrIV;
    const suBrgStrI = puStrIV / (rl - 2 * eccBrgStrI);
    const checkBrgStrI = suBrgStrI < PHI_B_STR * sigmaBrg ? 'Adequate' : 'Inadequate';
    const eccOvtStrI = muStrILat / (YEV_STR_I_MIN * pEv);
    const checkOvtStrI = eccOvtStrI < 0.25 * rl ? 'Adequate' : 'Inadequate';
    const phiRrStrIClass1 = PHI_SLIDING * YEV_STR_I_MIN * pEv * Math.tan(deg(phiRFill));
    const phiRrStrIFSoil = PHI_SLIDING * YEV_STR_I_MIN * pEv * Math.tan(deg(phiFSoil));
    const checkSldStrIClass1 = phiRrStrIClass1 > puStrILat ? 'Adequate' : 'Inadequate';
    const checkSldStrIFSoil = phiRrStrIFSoil > puStrILat ? 'Adequate' : 'Inadequate';

    // EE I checks
    const eccBrgEeI = muEeILat / puEeIV;
    const suBrgEeI = puEeIV / (rl - 2 * eccBrgEeI);
    const checkBrgEeI = suBrgEeI < PHI_B_EE * sigmaBrg ? 'Adequate' : 'Inadequate';
    const eccOvtEeI = muEeILat / (YEV_EE_I * pEv);
    const checkOvtEeI = eccOvtEeI < 0.25 * rl ? 'Adequate' : 'Inadequate';
    const phiRrEeIClass1 = PHI_SLIDING * YEV_EE_I * pEv * Math.tan(deg(phiRFill));
    const phiRrEeIFSoil = PHI_SLIDING * YEV_EE_I * pEv * Math.tan(deg(phiFSoil));
    const checkSldEeIClass1 = phiRrEeIClass1 > puEeILat ? 'Adequate' : 'Inadequate';
    const checkSldEeIFSoil = phiRrEeIFSoil > puEeILat ? 'Adequate' : 'Inadequate';

    // Ser I checks
    const eccBrgSerI = muSerILat / puSerIV;
    const suBrgSerI = puSerIV / (rl - 2 * eccBrgSerI);
    const checkBrgSerI = suBrgSerI < PHI_B_EE * sigmaBrg ? 'Adequate' : 'Inadequate';

    // Demand
    const demBrgStrI = (suBrgStrI / (PHI_B_STR * sigmaBrg)) * 100;
    const demBrgEeI = (suBrgEeI / (PHI_B_EE * sigmaBrg)) * 100;
    const demBrgSerI = (suBrgSerI / (PHI_B_STR * 0.65 * sigmaBrg)) * 100;
    const demOvtStrI = (eccOvtStrI / (0.25 * rl)) * 100;
    const demOvtEeI = (eccOvtEeI / (0.25 * rl)) * 100;
    const demSldStrI = (puStrILat / phiRrStrIFSoil) * 100;
    const demSldEeI = (puEeILat / phiRrEeIFSoil) * 100;

    const demMap: Record<string, number> = {
      'BEARING STRENGTH I': demBrgStrI,
      'BEARING EXTREME EVENT I': demBrgEeI,
      'BEARING SERVICE I': demBrgSerI,
      'OVERTURNING STRENGTH I': demOvtStrI,
      'OVERTURNING EXTREME EVENT I': demOvtEeI,
      'SLIDING STRENGTH I': demSldStrI,
      'SLIDING EXTREME EVENT I': demSldEeI,
    };
    const demCtrl = Math.max(...Object.values(demMap));
    const limitState = Object.keys(demMap).find((k) => demMap[k] === demCtrl) ?? '';

    rows.push({
      dh, rl, hEq, pLsV, pEv, mLsV, mEv, pLsH, pEh, pEq, mLsH, mEh, mEq,
      puSerIV, muSerIV, puStrIV, muStrIV, puEeIV, muEeIV,
      puSerILat, muSerILat, puStrILat, muStrILat, puEeILat, muEeILat,
      eccBrgStrI, suBrgStrI, checkBrgStrI, eccOvtStrI, checkOvtStrI,
      phiRrStrIClass1, phiRrStrIFSoil, checkSldStrIClass1, checkSldStrIFSoil,
      eccBrgEeI, suBrgEeI, checkBrgEeI, eccOvtEeI, checkOvtEeI,
      phiRrEeIClass1, phiRrEeIFSoil, checkSldEeIClass1, checkSldEeIFSoil,
      eccBrgSerI, suBrgSerI, checkBrgSerI,
      demBrgStrI, demBrgEeI, demBrgSerI, demOvtStrI, demOvtEeI,
      demSldStrI, demSldEeI, demCtrl, limitState,
      nl: Math.ceil(dh / sV),
    });
  }
  return rows;
}

function analyzeWingExternal(p: ExternalStabilityParams, hasLl: boolean): AnalysisRow[] {
  const { yev, ylsV, bstemBatter, bI, sigmaBrg, deltaS, gRFill, phiRFill, phiFSoil,
    pga, fPgaEq, kV, minDesignHeight, maxDesignHeight, sV, theta = 90 } = p;
  const minRl = p.minRl ?? 8;
  const rows: AnalysisRow[] = [];

  for (const dh of generateDh(minDesignHeight, maxDesignHeight, sV)) {
    const rl = Math.max(0.7 * dh, minRl);
    const hEq = hasLl ? calcHEq(dh) : 0;
    const sigmaLsV = (gRFill / 1000) * hEq;
    const pLsV = sigmaLsV * rl;
    const sigmaEv = (gRFill / 1000) * dh;
    const pEv1 = rl * sigmaEv;
    const pEv2 = rl * ((rl * Math.tan(deg(bI))) / 2) * (gRFill / 1000);
    const pEv = pEv1 + pEv2;
    const mLsV = ylsV * pLsV;
    const mEv = pEv2 * (rl / 6);
    const deltaSRad = deg(deltaS);
    const gamma =
      (1 +
        Math.sqrt(
          (Math.sin(deg(phiRFill + deltaSRad)) * Math.sin(deg(phiRFill - bI))) /
            (Math.sin(deg(theta - deltaSRad)) * Math.sin(deg(theta + bI))),
        )) **
      2;
    const kA =
      Math.sin(deg(theta + phiRFill)) ** 2 /
      (gamma * Math.sin(deg(theta)) ** 2 * Math.sin(deg(90 - deltaSRad)));
    const sigmaLsH = (gRFill / 1000) * hEq * kA;
    const pLsH = dh * sigmaLsH;
    const pEh = 0.5 * (gRFill / 1000) * kA * (dh + rl * Math.tan(deg(bI))) ** 2;
    const kH = pga * fPgaEq;
    const phiMo = (Math.atan(kH / (1 - kV)) * 180) / Math.PI;
    const kAeTerm1 =
      Math.cos(deg(phiRFill) - deg(phiMo) - deg(bstemBatter)) ** 2 /
      (Math.cos(deg(phiMo)) *
        Math.cos(deg(bstemBatter)) ** 2 *
        Math.cos(deg(deltaSRad + bstemBatter + phiMo)));
    const kAeTerm2 =
      (1 +
        Math.sqrt(
          (Math.sin(deg(phiRFill + deltaSRad)) * Math.sin(deg(phiRFill - phiMo - bI))) /
            (Math.cos(deg(deltaSRad + bstemBatter + phiMo)) * Math.cos(deg(bI - bstemBatter))),
        )) **
      -2;
    const kAe = kAeTerm1 * kAeTerm2;
    const omegaIr = kH * (0.5 * (gRFill / 1000) * dh ** 2);
    const omegaAe = 0.5 * (gRFill / 1000) * dh ** 2 * kAe;
    const pEq = Math.max(omegaAe + 0.5 * omegaIr, omegaIr + 0.5 * omegaAe);
    const mLsH = pLsH * (dh / 2);
    const mEh =
      (pEh * Math.cos(deg(bI)) * (dh + rl * Math.tan(deg(bI)))) / 3 -
      pEh * Math.sin(deg(bI)) * (rl / 2);
    const mEq = Math.max(
      omegaAe * (dh / 3) + 0.5 * omegaIr * 0.5 * dh,
      0.5 * omegaAe * (dh / 3) + omegaIr * 0.5 * dh,
    );

    const sinBI = Math.sin(deg(bI));
    const cosBI = Math.cos(deg(bI));

    // Load combinations
    const puSerIV = YLS_SER_I * pLsV + YEH_SER_I * pEv + YEV_SER_I * pEh * sinBI;
    const muSerIV = YLS_SER_I * mLsV + YEV_SER_I * mEv;
    const puStrIV = YLS_STR_I * pLsV + YEV_STR_I_MIN * pEv + YEH_STR_I * pEh * sinBI;
    const muStrIV = YLS_STR_I * mLsV + YEV_STR_I * mEv;
    const puEeIV = YLS_EE_I * pLsV + YEV_EE_I * pEv + YEH_EE_I * pEh * sinBI;
    const muEeIV = YLS_EE_I * mLsV + YEV_EE_I * mEv;
    const puSerILat = YLS_SER_I * pLsH + YEH_SER_I * pEh * cosBI + YEQ_SER_I * pEq;
    const muSerILat = YEH_SER_I * mEh - YEV_SER_I * pEv2 * (rl / 6) + YEQ_SER_I * mEq + YLS_SER_I * mLsH;
    const puStrILat = YLS_STR_I * pLsH + YEH_STR_I * pEh * cosBI + YEQ_STR_I * pEq;
    const muStrILat = YEH_STR_I * mEh + YEQ_STR_I * mEq + YLS_STR_I * mLsH - YEV_STR_I_MIN * pEv2 * (rl / 6);
    const puEeILat = YLS_EE_I * pLsH + YEH_EE_I * pEh * cosBI + YEQ_EE_I * pEq;
    const muEeILat = YEH_EE_I * mEh + YEQ_EE_I * mEq + YLS_EE_I * mLsH - YEV_EE_I * pEv2 * (rl / 6);

    // Str I checks
    const eccBrgStrI = muStrILat / puStrIV;
    const suBrgStrI = puStrIV / (rl - 2 * eccBrgStrI);
    const checkBrgStrI = suBrgStrI < PHI_B_STR * sigmaBrg ? 'Adequate' : 'Inadequate';
    const puSldStrI = YEV_STR_I_MIN * pEv + YEH_STR_I * pEh * sinBI;
    const eccOvtStrI = muStrILat / puSldStrI;
    const checkOvtStrI = eccOvtStrI < 0.25 * rl ? 'Adequate' : 'Inadequate';
    const phiRrStrIClass1 =
      PHI_SLIDING * (YEV_STR_I_MIN * puSldStrI + YEH_STR_I * pEh * sinBI * Math.tan(deg(phiRFill)));
    const phiRrStrIFSoil =
      PHI_SLIDING * (YEV_STR_I_MIN * puSldStrI + YEH_STR_I * pEh * sinBI * Math.tan(deg(phiFSoil)));
    const checkSldStrIClass1 = phiRrStrIClass1 > puStrILat ? 'Adequate' : 'Inadequate';
    const checkSldStrIFSoil = phiRrStrIFSoil > puStrILat ? 'Adequate' : 'Inadequate';

    // EE I checks
    const eccBrgEeI = muEeILat / puEeIV;
    const suBrgEeI = puEeIV / (rl - 2 * eccBrgEeI);
    const checkBrgEeI = suBrgEeI < PHI_B_EE * sigmaBrg ? 'Adequate' : 'Inadequate';
    const eccOvtEeI = muEeILat / (YEV_EE_I * pEv);
    const checkOvtEeI = eccOvtEeI < 0.25 * rl ? 'Adequate' : 'Inadequate';
    const phiRrEeIClass1 = PHI_SLIDING * YEV_EE_I * pEv * Math.tan(deg(phiRFill));
    const phiRrEeIFSoil = PHI_SLIDING * YEV_EE_I * pEv * Math.tan(deg(phiFSoil));
    const checkSldEeIClass1 = phiRrEeIClass1 > puEeILat ? 'Adequate' : 'Inadequate';
    const checkSldEeIFSoil = phiRrEeIFSoil > puEeILat ? 'Adequate' : 'Inadequate';

    // Ser I checks
    const eccBrgSerI = muSerILat / puSerIV;
    const suBrgSerI = puSerIV / (rl - 2 * eccBrgSerI);
    const checkBrgSerI = suBrgSerI < PHI_B_EE * sigmaBrg ? 'Adequate' : 'Inadequate';

    // Demand
    const demBrgStrI = (suBrgStrI / (PHI_B_STR * sigmaBrg)) * 100;
    const demBrgEeI = (suBrgEeI / (PHI_B_EE * sigmaBrg)) * 100;
    const demBrgSerI = (suBrgSerI / (PHI_B_STR * 0.65 * sigmaBrg)) * 100;
    const demOvtStrI = (eccOvtStrI / (0.25 * rl)) * 100;
    const demOvtEeI = (eccOvtEeI / (0.25 * rl)) * 100;
    const demSldStrI = (puStrILat / phiRrStrIFSoil) * 100;
    const demSldEeI = (puEeILat / phiRrEeIFSoil) * 100;

    const demMap: Record<string, number> = {
      'BEARING STRENGTH I': demBrgStrI,
      'BEARING EXTREME EVENT I': demBrgEeI,
      'BEARING SERVICE I': demBrgSerI,
      'OVERTURNING STRENGTH I': demOvtStrI,
      'OVERTURNING EXTREME EVENT I': demOvtEeI,
      'SLIDING STRENGTH I': demSldStrI,
      'SLIDING EXTREME EVENT I': demSldEeI,
    };
    const demCtrl = Math.max(...Object.values(demMap));
    const limitState = Object.keys(demMap).find((k) => demMap[k] === demCtrl) ?? '';

    rows.push({
      dh, rl, hEq, pLsV, pEv, mLsV, mEv, pLsH, pEh, pEq, mLsH, mEh, mEq,
      puSerIV, muSerIV, puStrIV, muStrIV, puEeIV, muEeIV,
      puSerILat, muSerILat, puStrILat, muStrILat, puEeILat, muEeILat,
      eccBrgStrI, suBrgStrI, checkBrgStrI, eccOvtStrI, checkOvtStrI,
      phiRrStrIClass1, phiRrStrIFSoil, checkSldStrIClass1, checkSldStrIFSoil,
      eccBrgEeI, suBrgEeI, checkBrgEeI, eccOvtEeI, checkOvtEeI,
      phiRrEeIClass1, phiRrEeIFSoil, checkSldEeIClass1, checkSldEeIFSoil,
      eccBrgSerI, suBrgSerI, checkBrgSerI,
      demBrgStrI, demBrgEeI, demBrgSerI, demOvtStrI, demOvtEeI,
      demSldStrI, demSldEeI, demCtrl, limitState,
      nl: Math.ceil(dh / sV),
      puSldStrI,
    });
  }
  return rows;
}

export function analyzeWingExternalLl(p: ExternalStabilityParams): AnalysisRow[] {
  return analyzeWingExternal(p, true);
}

export function analyzeWingExternalNoLl(p: ExternalStabilityParams): AnalysisRow[] {
  return analyzeWingExternal(p, false);
}
