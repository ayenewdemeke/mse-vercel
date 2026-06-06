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
  if (dh <= 10) return 4 - ((dh - 5) / 5);
  return 3 - ((dh - 10) / 10);
}

const Y_LS_STR_I = 1.75;
const Y_EH_STR_I = 1.5;
const Y_EV_STR_I = 1.35;
const Y_LS_EE_I = 0.5;
const Y_EV_EE_I = 1;
const Y_EQ_EE_I = 1;

export interface InternalStabilityRow {
  dh: number; rl: number; z: number;
  sEvZ: number; hEq: number; sLsZ: number;
  wIr: number; wAe: number; wEq1: number; wEq2: number; pEq: number; sEq: number;
  // Geosynthetic strip
  sVStrI: number; sHStrI: number; sVEeI: number; sHEeI: number;
  tMaxStrIGstrip: number; tMaxEeIGstrip: number;
  lEStrIGs: number; lEEeIGs: number; lEGeostrip: number; lAGs: number;
  rlMinGeostrip: number; ltdsGeostrip: number; poGeostripCheck: string;
  // Geosynthetic grid
  tMaxStrIGgrid: number; tMaxEeIGgrid: number;
  lEStrIGg: number; lEEeIGg: number; lEGeogrid: number; lAGg: number;
  rlMinGeogrid: number; ltdsGeogrid: number; poGeogridCheck: string;
  // Metallic grid
  fpMg: number; krSg: number;
  sVStrIMg: number; sHStrIMg: number; sVEeIMg: number; sHEeIMg: number;
  tMaxStrISg: number; tMaxEeISg: number;
  lEStrIMg: number; lEEeIMg: number; lESg: number; lASg: number;
  rlMinSg: number; ltdsSg: number; poSgCheck: string;
  // Ribbed metallic strip
  fpSs: number; krSs: number;
  sVStrISs: number; sHStrISs: number; sVEeISs: number; sHEeISs: number;
  tMaxStrISs: number; tMaxEeISs: number; rcSs: number;
  lEStrISs: number; lEEeISs: number; lESs: number; lASs: number;
  rlMinSs: number; ltdsSs: number; poSsCheck: string;
  // Required factored LTDS (EE-I)
  ltdsEeIGs: number; ltdsEeIGg: number; ltdsEeISg: number; ltdsEeISs: number;
}

export interface AbutmentInternalParams {
  bstemBatter: number; bI: number; deltaS: number;
  gRFill: number; phiRFill: number;
  pga: number; fPgaEq: number; kV: number;
  phiPoGs: number; alphaGs: number; rcGs: number; c: number;
  phiPoGg: number; phiPoGgEe: number; alphaGg: number; rcGg: number;
  y: number; maxDh: number; a: number;
  tSt: number; stSg: number; phiPoSg: number; alphaSg: number; rcSg: number;
  bSs: number; phiPoSs: number; f2: number; alphaSs: number; sh: number;
  minDesignHeight: number; maxDesignHeight: number; sV: number; minRl: number;
}

export interface WingInternalParams {
  bstemBatter: number; bI: number; deltaS: number;
  gRFill: number; phiRFill: number;
  pga: number; fPgaEq: number; kV: number;
  phiPoGs: number; alphaGs: number; rcGs: number; gStrip: number; c: number;
  phiPoGg: number; phiPoGgEe: number; alphaGg: number; rcGg: number;
  y: number; a: number; maxDh: number;
  tSt: number; stSg: number; phiPoSg: number; alphaSg: number; rcSg: number;
  bSs: number; phiPoSs: number; alphaSs: number; sh: number;
  d60: number; d10: number;
  minDesignHeight: number; maxDesignHeight: number; sV: number; minRl: number;
}

function computeKAe(
  phiRFill: number, phiMo: number, bstemBatter: number,
  deltaSRad: number, bI: number,
): number {
  const term1 = Math.pow(Math.cos(deg(phiRFill) - deg(phiMo) - deg(bstemBatter)), 2) /
    (Math.cos(deg(phiMo)) * Math.pow(Math.cos(deg(bstemBatter)), 2) *
      Math.cos(deg(deltaSRad + bstemBatter + phiMo)));
  const term2 = Math.pow(1 + Math.sqrt(
    (Math.sin(deg(phiRFill + deltaSRad)) * Math.sin(deg(phiRFill - phiMo - bI))) /
    (Math.cos(deg(deltaSRad + bstemBatter + phiMo)) * Math.cos(deg(bI - bstemBatter)))
  ), -2);
  return term1 * term2;
}

function computeMetallicGrid(
  z: number, kA: number, sEvZ: number, sLsZ: number, sEq: number, gStrip: number,
  tSt: number, stSg: number, phiPoSg: number, alphaSg: number, rcSg: number, c: number,
  maxDh: number, sV: number, phiPoGgEe: number, rcGg: number,
) {
  const f1Mg = 10 * (tSt / stSg);
  const f2Mg = 20 * (tSt / stSg);
  const fpMg = z > 20 ? f1Mg : f1Mg - ((20 - z) / 20) * (f1Mg - f2Mg);
  const krSg = (z > 20 ? 1.2 : 1.2 - ((20 - z) / 20) * (1.2 - 2.5)) * kA;
  // PHP uses Y_EH_STR_I (1.5) instead of Y_EV_STR_I for sVStrIMg — preserved as-is
  const sVStrIMg = (Y_EH_STR_I * sEvZ) + (Y_LS_STR_I * sLsZ);
  const sHStrIMg = krSg * sVStrIMg;
  const sVEeIMg = (Y_EV_EE_I * sEvZ) + (Y_LS_EE_I * sLsZ);
  const sHEeIMg = (Y_EQ_EE_I * sEq * gStrip * (krSg / kA)) + (Y_LS_EE_I * sLsZ * krSg);
  const tMaxStrISg = sV * sHStrIMg;
  const tMaxEeISg = sV * sHEeIMg;
  const lEStrIMg = tMaxStrISg / (phiPoSg * fpMg * alphaSg * sEvZ * c * rcSg);
  const lEEeIMg = tMaxEeISg / (phiPoSg * fpMg * alphaSg * sEvZ * c * rcSg);
  const lESg = Math.max(lEStrIMg, lEEeIMg);
  const lASg = Math.max(z < 0.5 * maxDh ? 0.3 * maxDh : 0.3 * maxDh * ((maxDh - z) / (0.5 * maxDh)), 0);
  const rlMinSg = lESg + lASg;
  const ltdsSg = (Math.max(tMaxStrISg, tMaxEeISg) / (phiPoSg * rcSg)) * 1000;
  const poSgCheck = rlMinSg < 0.7 * maxDh ? 'Adequate' : 'Inadequate';
  // PHP bug: ltdsEeISg uses phiPoGgEe and rcGg instead of phiPoSg/rcSg — preserved
  const ltdsEeISg = (tMaxEeISg / (phiPoGgEe * rcGg)) * 1000;
  return { fpMg, krSg, sVStrIMg, sHStrIMg, sVEeIMg, sHEeIMg, tMaxStrISg, tMaxEeISg, lEStrIMg, lEEeIMg, lESg, lASg, rlMinSg, ltdsSg, poSgCheck, ltdsEeISg };
}

function computeRibbedStrip(
  z: number, kA: number, sEvZ: number, sLsZ: number, sEq: number, gStrip: number,
  f2Ss: number, phiPoSs: number, alphaSs: number, bSs: number, sh: number, c: number,
  maxDh: number, sV: number, phiRFill: number,
) {
  const f1Ss = Math.tan(deg(phiRFill));
  const fpSs = z > 20 ? f1Ss : f1Ss - ((20 - z) / 20) * (f1Ss - f2Ss);
  const krSs = (z > 20 ? 1.2 : 1.2 - ((20 - z) / 20) * (1.2 - 1.7)) * kA;
  // PHP uses Y_EH_STR_I (1.5) for sVStrISs — preserved as-is
  const sVStrISs = (Y_EH_STR_I * sEvZ) + (Y_LS_STR_I * sLsZ);
  const sHStrISs = krSs * sVStrISs;
  const sVEeISs = (Y_EV_EE_I * sEvZ) + (Y_LS_EE_I * sLsZ);
  const sHEeISs = (Y_EQ_EE_I * sEq * gStrip * (krSs / kA)) + (Y_LS_EE_I * sLsZ * krSs);
  const tMaxStrISs = sV * sHStrISs;
  const tMaxEeISs = sV * sHEeISs;
  const rcSs = bSs / sh;
  const lEStrISs = tMaxStrISs / (phiPoSs * fpSs * alphaSs * sEvZ * c * rcSs);
  const lEEeISs = tMaxEeISs / (phiPoSs * fpSs * alphaSs * sEvZ * c * rcSs);
  const lESs = Math.max(lEStrISs, lEEeISs);
  const lASs = Math.max(z < 0.5 * maxDh ? 0.3 * maxDh : 0.3 * maxDh * ((maxDh - z) / (0.5 * maxDh)), 0);
  const rlMinSs = lESs + lASs;
  const ltdsSs = (Math.max(tMaxStrISs, tMaxEeISs) / (phiPoSs * rcSs)) * 1000;
  const poSsCheck = rlMinSs < 0.7 * maxDh ? 'Adequate' : 'Inadequate';
  const ltdsEeISs = (tMaxEeISs / (phiPoSs * rcSs)) * 1000;
  return { fpSs, krSs, sVStrISs, sHStrISs, sVEeISs, sHEeISs, tMaxStrISs, tMaxEeISs, rcSs, lEStrISs, lEEeISs, lESs, lASs, rlMinSs, ltdsSs, poSsCheck, ltdsEeISs };
}

export function analyzeAbutmentInternal(p: AbutmentInternalParams): InternalStabilityRow[] {
  const {
    bstemBatter, bI, deltaS, gRFill, phiRFill,
    pga, fPgaEq, kV,
    phiPoGs, alphaGs, rcGs, c,
    phiPoGg, phiPoGgEe, alphaGg, rcGg,
    y, maxDh, a,
    tSt, stSg, phiPoSg, alphaSg, rcSg,
    bSs, phiPoSs, f2, alphaSs, sh,
    minDesignHeight, maxDesignHeight, sV, minRl,
  } = p;

  const dhs = generateDh(minDesignHeight, maxDesignHeight, sV);
  const rows: InternalStabilityRow[] = [];
  let z = 0;

  for (let i = 0; i < dhs.length; i++) {
    const dh = dhs[i];
    const rl = Math.max(0.7 * dh, minRl);

    if (i === 0) {
      z = (y + a) - 1.25;
    } else {
      z += sV / 2;
    }

    const numStripNeeded = maxDh / sV;
    const numStripActual = (maxDh - y) / sV;
    const gStrip = numStripNeeded / numStripActual;

    const sEvZ = (gRFill / 1000) * z * gStrip;
    const hEq = calcHEq(dh);
    const sLsZ = (gRFill / 1000) * hEq * gStrip;
    const kH = pga * fPgaEq;
    const wIr = kH * (0.5 * (gRFill / 1000) * Math.pow(z, 2));
    const phiMo = (180 / Math.PI) * Math.atan(kH / (1 - kV));
    // deltaSRad: converted to radians and then passed to deg() — mixed-unit bug preserved from PHP
    const deltaSRad = deltaS * Math.PI / 180;
    const kAe = computeKAe(phiRFill, phiMo, bstemBatter, deltaSRad, bI);
    const wAe = 0.5 * (gRFill / 1000) * Math.pow(z, 2) * kAe;
    const wEq1 = wAe + 0.5 * wIr;
    const wEq2 = wIr + 0.5 * wAe;
    const pEq = Math.max(wEq1, wEq2);
    const sEq = pEq / z;

    // Rankine kA for abutment
    const kA = Math.pow(Math.tan(deg(45) - deg(phiRFill) / 2), 2);

    // Geosynthetic strip
    const sVStrI = (Y_EV_STR_I * sEvZ) + (Y_LS_STR_I * sLsZ);
    const sHStrI = ((Y_EH_STR_I * sEvZ) + (Y_LS_STR_I * sLsZ)) * kA;
    const sVEeI = (Y_EV_EE_I * sEvZ) + (Y_LS_EE_I * sLsZ);
    const sHEeI = (Y_EQ_EE_I * sEq * gStrip) + ((Y_LS_EE_I * sLsZ) * kA);
    const tMaxStrIGstrip = sV * sHStrI;
    const tMaxEeIGstrip = sV * sHEeI;
    const fpGs = 0.67 * Math.tan(deg(phiRFill));
    const lEStrIGs = tMaxStrIGstrip / (phiPoGs * fpGs * alphaGs * sEvZ * c * rcGs);
    const lEEeIGs = tMaxEeIGstrip / (phiPoGs * fpGs * alphaGs * sEvZ * c * rcGs);
    const lEGeostrip = Math.max(lEStrIGs, lEEeIGs);
    const psi = 45 + phiRFill * 0.5;
    const lAGs = Math.max((maxDh - z) * Math.tan(deg(90 - psi)), 0);
    const rlMinGeostrip = lEGeostrip + lAGs;
    const ltdsGeostrip = (Math.max(tMaxStrIGstrip, tMaxEeIGstrip) / (phiPoGs * rcGs)) * 1000;
    const poGeostripCheck = rlMinGeostrip < 0.7 * maxDh ? 'Adequate' : 'Inadequate';

    // Geosynthetic grid (same sHStrI/sHEeI as geostrip)
    const tMaxStrIGgrid = sV * sHStrI;
    const tMaxEeIGgrid = sV * sHEeI;
    const fpGg = 0.67 * Math.tan(deg(phiRFill));
    const lEStrIGg = tMaxStrIGgrid / (phiPoGg * fpGg * alphaGg * sEvZ * c * rcGg);
    const lEEeIGg = tMaxEeIGgrid / (phiPoGgEe * fpGg * alphaGg * sEvZ * c * rcGg);
    const lEGeogrid = Math.max(lEStrIGg, lEEeIGg);
    const lAGg = Math.max((maxDh - z) * Math.tan(deg(90 - psi)), 0);
    const rlMinGeogrid = lEGeogrid + lAGg;
    const ltdsGeogrid = Math.max(tMaxStrIGgrid / (phiPoGg * rcGg), tMaxEeIGgrid / (phiPoGgEe * rcGg)) * 1000;
    const poGeogridCheck = rlMinGeogrid < 0.7 * maxDh ? 'Adequate' : 'Inadequate';

    // Metallic grid
    const mg = computeMetallicGrid(z, kA, sEvZ, sLsZ, sEq, gStrip, tSt, stSg, phiPoSg, alphaSg, rcSg, c, maxDh, sV, phiPoGgEe, rcGg);

    // Ribbed metallic strip
    const rs = computeRibbedStrip(z, kA, sEvZ, sLsZ, sEq, gStrip, f2, phiPoSs, alphaSs, bSs, sh, c, maxDh, sV, phiRFill);

    // Required factored LTDS (EE-I)
    const ltdsEeIGs = (tMaxEeIGstrip / (phiPoGs * rcGs)) * 1000;
    const ltdsEeIGg = (tMaxEeIGgrid / (phiPoGgEe * rcGg)) * 1000;
    const ltdsEeISg = mg.ltdsEeISg;
    const ltdsEeISs = rs.ltdsEeISs;

    rows.push({
      dh, rl, z,
      sEvZ, hEq, sLsZ, wIr, wAe, wEq1, wEq2, pEq, sEq,
      sVStrI, sHStrI, sVEeI, sHEeI,
      tMaxStrIGstrip, tMaxEeIGstrip, lEStrIGs, lEEeIGs, lEGeostrip, lAGs, rlMinGeostrip, ltdsGeostrip, poGeostripCheck,
      tMaxStrIGgrid, tMaxEeIGgrid, lEStrIGg, lEEeIGg, lEGeogrid, lAGg, rlMinGeogrid, ltdsGeogrid, poGeogridCheck,
      fpMg: mg.fpMg, krSg: mg.krSg, sVStrIMg: mg.sVStrIMg, sHStrIMg: mg.sHStrIMg, sVEeIMg: mg.sVEeIMg, sHEeIMg: mg.sHEeIMg,
      tMaxStrISg: mg.tMaxStrISg, tMaxEeISg: mg.tMaxEeISg, lEStrIMg: mg.lEStrIMg, lEEeIMg: mg.lEEeIMg, lESg: mg.lESg, lASg: mg.lASg, rlMinSg: mg.rlMinSg, ltdsSg: mg.ltdsSg, poSgCheck: mg.poSgCheck,
      fpSs: rs.fpSs, krSs: rs.krSs, sVStrISs: rs.sVStrISs, sHStrISs: rs.sHStrISs, sVEeISs: rs.sVEeISs, sHEeISs: rs.sHEeISs,
      tMaxStrISs: rs.tMaxStrISs, tMaxEeISs: rs.tMaxEeISs, rcSs: rs.rcSs, lEStrISs: rs.lEStrISs, lEEeISs: rs.lEEeISs, lESs: rs.lESs, lASs: rs.lASs, rlMinSs: rs.rlMinSs, ltdsSs: rs.ltdsSs, poSsCheck: rs.poSsCheck,
      ltdsEeIGs, ltdsEeIGg, ltdsEeISg, ltdsEeISs,
    });
  }

  return rows;
}

export function analyzeWingInternal(p: WingInternalParams): InternalStabilityRow[] {
  const {
    bstemBatter, bI, deltaS, gRFill, phiRFill,
    pga, fPgaEq, kV,
    phiPoGs, alphaGs, rcGs, gStrip, c,
    phiPoGg, phiPoGgEe, alphaGg, rcGg,
    y, a, maxDh,
    tSt, stSg, phiPoSg, alphaSg, rcSg,
    bSs, phiPoSs, alphaSs, sh, d60, d10,
    minDesignHeight, maxDesignHeight, sV, minRl,
  } = p;

  const dhs = generateDh(minDesignHeight, maxDesignHeight, sV);
  const rows: InternalStabilityRow[] = [];
  let z = 0;

  // kA: Coulomb formula with theta=90 (vertical wall; theta not in schema)
  const theta = 90;
  const gammaKa = Math.pow(
    1 + Math.sqrt(
      (Math.sin(deg(phiRFill + deltaS)) * Math.sin(deg(phiRFill - bI))) /
      (Math.sin(deg(theta - deltaS)) * Math.sin(deg(theta + bI)))
    ), 2
  );
  const kA = Math.pow(Math.sin(deg(theta + phiRFill)), 2) /
    (gammaKa * Math.pow(Math.sin(deg(theta)), 2) * Math.sin(deg(90 - deltaS)));

  // f2 for ribbed strip derived from grain sizes (d60/d10 in schema replace f2)
  const f2Ss = (d10 / d60) * Math.tan(deg(phiRFill));

  for (let i = 0; i < dhs.length; i++) {
    const dh = dhs[i];
    const rl = Math.max(0.7 * dh, minRl);

    if (i === 0) {
      z = (sV / 2) + 1;
    } else {
      z += sV / 2;
    }

    // Wing: gStrip is a direct input; no gBFill in schema
    const sEvZ = (gRFill / 1000) * z * gStrip;
    const hEq = 0;
    const sLsZ = 0;
    const kH = pga * fPgaEq;
    const wIr = kH * (0.5 * (gRFill / 1000) * Math.pow(z, 2));
    const phiMo = (180 / Math.PI) * Math.atan(kH / (1 - kV));
    // mixed-unit bug preserved from PHP
    const deltaSRad = deltaS * Math.PI / 180;
    const kAe = computeKAe(phiRFill, phiMo, bstemBatter, deltaSRad, bI);
    const wAe = 0.5 * (gRFill / 1000) * Math.pow(z, 2) * kAe;
    const wEq1 = wAe + 0.5 * wIr;
    const wEq2 = wIr + 0.5 * wAe;
    const pEq = Math.max(wEq1, wEq2);
    const sEq = pEq / z;

    // Geosynthetic strip (wing: no LS terms since sLsZ=0)
    const sVStrI = Y_EV_STR_I * sEvZ;
    const sHStrI = (Y_EH_STR_I * sEvZ) * kA;
    const sVEeI = Y_EV_EE_I * sEvZ;
    const sHEeI = Y_EQ_EE_I * sEq * gStrip;
    const tMaxStrIGstrip = sV * sHStrI;
    const tMaxEeIGstrip = sV * sHEeI;
    const fpGs = 0.67 * Math.tan(deg(phiRFill));
    const lEStrIGs = tMaxStrIGstrip / (phiPoGs * fpGs * alphaGs * sEvZ * c * rcGs);
    const lEEeIGs = tMaxEeIGstrip / (phiPoGs * fpGs * alphaGs * sEvZ * c * rcGs);
    const lEGeostrip = Math.max(lEStrIGs, lEEeIGs);
    const psi = 45 + phiRFill * 0.5;
    const lAGs = Math.max((maxDh - z) * Math.tan(deg(90 - psi)), 0);
    const rlMinGeostrip = lEGeostrip + lAGs;
    const ltdsGeostrip = (Math.max(tMaxStrIGstrip, tMaxEeIGstrip) / (phiPoGs * rcGs)) * 1000;
    const poGeostripCheck = rlMinGeostrip < 0.7 * maxDh ? 'Adequate' : 'Inadequate';

    // Geosynthetic grid
    const tMaxStrIGgrid = sV * sHStrI;
    const tMaxEeIGgrid = sV * sHEeI;
    const fpGg = 0.67 * Math.tan(deg(phiRFill));
    const lEStrIGg = tMaxStrIGgrid / (phiPoGg * fpGg * alphaGg * sEvZ * c * rcGg);
    const lEEeIGg = tMaxEeIGgrid / (phiPoGgEe * fpGg * alphaGg * sEvZ * c * rcGg);
    const lEGeogrid = Math.max(lEStrIGg, lEEeIGg);
    const lAGg = Math.max((maxDh - z) * Math.tan(deg(90 - psi)), 0);
    const rlMinGeogrid = lEGeogrid + lAGg;
    const ltdsGeogrid = Math.max(tMaxStrIGgrid / (phiPoGg * rcGg), tMaxEeIGgrid / (phiPoGgEe * rcGg)) * 1000;
    const poGeogridCheck = rlMinGeogrid < 0.7 * maxDh ? 'Adequate' : 'Inadequate';

    // Metallic grid
    const mg = computeMetallicGrid(z, kA, sEvZ, sLsZ, sEq, gStrip, tSt, stSg, phiPoSg, alphaSg, rcSg, c, maxDh, sV, phiPoGgEe, rcGg);

    // Ribbed metallic strip (f2 derived from d10/d60)
    const rs = computeRibbedStrip(z, kA, sEvZ, sLsZ, sEq, gStrip, f2Ss, phiPoSs, alphaSs, bSs, sh, c, maxDh, sV, phiRFill);

    // Required factored LTDS (EE-I)
    const ltdsEeIGs = (tMaxEeIGstrip / (phiPoGs * rcGs)) * 1000;
    const ltdsEeIGg = (tMaxEeIGgrid / (phiPoGgEe * rcGg)) * 1000;
    const ltdsEeISg = mg.ltdsEeISg;
    const ltdsEeISs = rs.ltdsEeISs;

    rows.push({
      dh, rl, z,
      sEvZ, hEq, sLsZ, wIr, wAe, wEq1, wEq2, pEq, sEq,
      sVStrI, sHStrI, sVEeI, sHEeI,
      tMaxStrIGstrip, tMaxEeIGstrip, lEStrIGs, lEEeIGs, lEGeostrip, lAGs, rlMinGeostrip, ltdsGeostrip, poGeostripCheck,
      tMaxStrIGgrid, tMaxEeIGgrid, lEStrIGg, lEEeIGg, lEGeogrid, lAGg, rlMinGeogrid, ltdsGeogrid, poGeogridCheck,
      fpMg: mg.fpMg, krSg: mg.krSg, sVStrIMg: mg.sVStrIMg, sHStrIMg: mg.sHStrIMg, sVEeIMg: mg.sVEeIMg, sHEeIMg: mg.sHEeIMg,
      tMaxStrISg: mg.tMaxStrISg, tMaxEeISg: mg.tMaxEeISg, lEStrIMg: mg.lEStrIMg, lEEeIMg: mg.lEEeIMg, lESg: mg.lESg, lASg: mg.lASg, rlMinSg: mg.rlMinSg, ltdsSg: mg.ltdsSg, poSgCheck: mg.poSgCheck,
      fpSs: rs.fpSs, krSs: rs.krSs, sVStrISs: rs.sVStrISs, sHStrISs: rs.sHStrISs, sVEeISs: rs.sVEeISs, sHEeISs: rs.sHEeISs,
      tMaxStrISs: rs.tMaxStrISs, tMaxEeISs: rs.tMaxEeISs, rcSs: rs.rcSs, lEStrISs: rs.lEStrISs, lEEeISs: rs.lEEeISs, lESs: rs.lESs, lASs: rs.lASs, rlMinSs: rs.rlMinSs, ltdsSs: rs.ltdsSs, poSsCheck: rs.poSsCheck,
      ltdsEeIGs, ltdsEeIGg, ltdsEeISg, ltdsEeISs,
    });
  }

  return rows;
}
