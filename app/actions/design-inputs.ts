'use server';

import { auth } from '@/auth';
import { db } from '@/lib/db';
import { redirect } from 'next/navigation';

async function requireMember(projectId: string) {
  const session = await auth();
  if (!session?.user?.id) return null;
  const userId = session.user.id;
  const project = await db.project.findUnique({ where: { id: projectId } });
  if (!project) return null;
  if (project.userId === userId) return { userId, isOwner: true, project };
  const member = await db.member.findFirst({ where: { projectId, userId } });
  return member ? { userId, isOwner: false, project } : null;
}

async function requireDesignOwnerOrProjectOwner(designId: string, projectId: string) {
  const session = await auth();
  if (!session?.user?.id) return null;
  const userId = session.user.id;
  const design = await db.design.findUnique({ where: { id: designId } });
  if (!design || design.projectId !== projectId) return null;
  const project = await db.project.findUnique({ where: { id: projectId } });
  if (!project) return null;
  if (project.userId === userId || design.userId === userId) return { userId, design, project };
  return null;
}

// ─── Abutment External ─────────────────────────────────────────────────────────

function parseAbutmentExternal(fd: FormData) {
  return {
    yev: parseFloat(fd.get('yev') as string),
    ylsV: parseFloat(fd.get('ylsV') as string),
    bstemBatter: parseFloat(fd.get('bstemBatter') as string),
    bI: parseFloat(fd.get('bI') as string),
    sigmaBrg: parseFloat(fd.get('sigmaBrg') as string),
    deltaS: parseFloat(fd.get('deltaS') as string),
    gRFill: parseFloat(fd.get('gRFill') as string),
    phiRFill: parseFloat(fd.get('phiRFill') as string),
    phiFSoil: parseFloat(fd.get('phiFSoil') as string),
    pga: parseFloat(fd.get('pga') as string),
    fPgaEq: parseFloat(fd.get('fPgaEq') as string),
    kV: parseFloat(fd.get('kV') as string),
    minDesignHeight: parseFloat(fd.get('minDesignHeight') as string),
    maxDesignHeight: parseFloat(fd.get('maxDesignHeight') as string),
    sV: parseFloat(fd.get('sV') as string),
  };
}

export async function createAbutmentExternal(projectId: string, formData: FormData) {
  const access = await requireMember(projectId);
  if (!access) return { error: 'Forbidden' };
  const designType = await db.designType.findUnique({
    where: { key: 'abutment_external_stability' },
  });
  if (!designType) return { error: 'Design type not found' };
  const data = parseAbutmentExternal(formData);
  if (Object.values(data).some(isNaN)) return { error: 'All fields are required and must be numbers' };
  const name = (formData.get('name') as string | null)?.trim() || null;
  const design = await db.design.create({
    data: { userId: access.userId, projectId, designTypeId: designType.id, name },
  });
  await db.abutmentExternalStability.create({
    data: { ...data, projectId, designId: design.id },
  });
  redirect(`/projects/${projectId}/designs`);
}

export async function updateAbutmentExternal(
  designId: string,
  projectId: string,
  formData: FormData,
) {
  const access = await requireDesignOwnerOrProjectOwner(designId, projectId);
  if (!access) return { error: 'Forbidden' };
  const data = parseAbutmentExternal(formData);
  if (Object.values(data).some(isNaN)) return { error: 'All fields are required and must be numbers' };
  const name = (formData.get('name') as string | null)?.trim() || null;
  await db.design.update({ where: { id: designId }, data: { name } });
  await db.abutmentExternalStability.update({ where: { designId }, data });
  redirect(`/projects/${projectId}/designs/${designId}`);
}

export async function getAbutmentExternal(designId: string, projectId: string) {
  const session = await auth();
  if (!session?.user?.id) return null;
  return db.abutmentExternalStability.findUnique({
    where: { designId },
    include: { design: { include: { creator: { select: { id: true, name: true } }, designType: true } } },
  });
}

// ─── Wing External (with Live Load) ────────────────────────────────────────────

function parseWingExternal(fd: FormData) {
  return {
    yev: parseFloat(fd.get('yev') as string),
    ylsV: parseFloat(fd.get('ylsV') as string),
    bstemBatter: parseFloat(fd.get('bstemBatter') as string),
    theta: parseFloat(fd.get('theta') as string),
    bI: parseFloat(fd.get('bI') as string),
    sigmaBrg: parseFloat(fd.get('sigmaBrg') as string),
    deltaS: parseFloat(fd.get('deltaS') as string),
    gRFill: parseFloat(fd.get('gRFill') as string),
    phiRFill: parseFloat(fd.get('phiRFill') as string),
    phiFSoil: parseFloat(fd.get('phiFSoil') as string),
    pga: parseFloat(fd.get('pga') as string),
    fPgaEq: parseFloat(fd.get('fPgaEq') as string),
    kV: parseFloat(fd.get('kV') as string),
    minDesignHeight: parseFloat(fd.get('minDesignHeight') as string),
    maxDesignHeight: parseFloat(fd.get('maxDesignHeight') as string),
    sV: parseFloat(fd.get('sV') as string),
  };
}

export async function createWingExternalLl(projectId: string, formData: FormData) {
  const access = await requireMember(projectId);
  if (!access) return { error: 'Forbidden' };
  const designType = await db.designType.findUnique({
    where: { key: 'wing_external_stability_ll' },
  });
  if (!designType) return { error: 'Design type not found' };
  const data = parseWingExternal(formData);
  if (Object.values(data).some(isNaN)) return { error: 'All fields are required and must be numbers' };
  const name = (formData.get('name') as string | null)?.trim() || null;
  const design = await db.design.create({
    data: { userId: access.userId, projectId, designTypeId: designType.id, name },
  });
  await db.wingExternalStabilityLl.create({
    data: { ...data, projectId, designId: design.id },
  });
  redirect(`/projects/${projectId}/designs`);
}

export async function updateWingExternalLl(
  designId: string,
  projectId: string,
  formData: FormData,
) {
  const access = await requireDesignOwnerOrProjectOwner(designId, projectId);
  if (!access) return { error: 'Forbidden' };
  const data = parseWingExternal(formData);
  if (Object.values(data).some(isNaN)) return { error: 'All fields are required and must be numbers' };
  const name = (formData.get('name') as string | null)?.trim() || null;
  await db.design.update({ where: { id: designId }, data: { name } });
  await db.wingExternalStabilityLl.update({ where: { designId }, data });
  redirect(`/projects/${projectId}/designs/${designId}`);
}

export async function getWingExternalLl(designId: string, projectId: string) {
  const session = await auth();
  if (!session?.user?.id) return null;
  return db.wingExternalStabilityLl.findUnique({
    where: { designId },
    include: { design: { include: { creator: { select: { id: true, name: true } }, designType: true } } },
  });
}

export async function createWingExternal(projectId: string, formData: FormData) {
  const access = await requireMember(projectId);
  if (!access) return { error: 'Forbidden' };
  const designType = await db.designType.findUnique({
    where: { key: 'wing_external_stability' },
  });
  if (!designType) return { error: 'Design type not found' };
  const data = parseWingExternal(formData);
  if (Object.values(data).some(isNaN)) return { error: 'All fields are required and must be numbers' };
  const name = (formData.get('name') as string | null)?.trim() || null;
  const design = await db.design.create({
    data: { userId: access.userId, projectId, designTypeId: designType.id, name },
  });
  await db.wingExternalStability.create({
    data: { ...data, projectId, designId: design.id },
  });
  redirect(`/projects/${projectId}/designs`);
}

export async function updateWingExternal(
  designId: string,
  projectId: string,
  formData: FormData,
) {
  const access = await requireDesignOwnerOrProjectOwner(designId, projectId);
  if (!access) return { error: 'Forbidden' };
  const data = parseWingExternal(formData);
  if (Object.values(data).some(isNaN)) return { error: 'All fields are required and must be numbers' };
  const name = (formData.get('name') as string | null)?.trim() || null;
  await db.design.update({ where: { id: designId }, data: { name } });
  await db.wingExternalStability.update({ where: { designId }, data });
  redirect(`/projects/${projectId}/designs/${designId}`);
}

export async function getWingExternal(designId: string, projectId: string) {
  const session = await auth();
  if (!session?.user?.id) return null;
  return db.wingExternalStability.findUnique({
    where: { designId },
    include: { design: { include: { creator: { select: { id: true, name: true } }, designType: true } } },
  });
}

// ─── Abutment Internal ─────────────────────────────────────────────────────────

function parseAbutmentInternal(fd: FormData) {
  return {
    bstemBatter: parseFloat(fd.get('bstemBatter') as string),
    bI: parseFloat(fd.get('bI') as string),
    deltaS: parseFloat(fd.get('deltaS') as string),
    gRFill: parseFloat(fd.get('gRFill') as string),
    phiRFill: parseFloat(fd.get('phiRFill') as string),
    pga: parseFloat(fd.get('pga') as string),
    fPgaEq: parseFloat(fd.get('fPgaEq') as string),
    kV: parseFloat(fd.get('kV') as string),
    phiPoGs: parseFloat(fd.get('phiPoGs') as string),
    alphaGs: parseFloat(fd.get('alphaGs') as string),
    rcGs: parseFloat(fd.get('rcGs') as string),
    c: parseFloat(fd.get('c') as string),
    phiPoGg: parseFloat(fd.get('phiPoGg') as string),
    phiPoGgEe: parseFloat(fd.get('phiPoGgEe') as string),
    alphaGg: parseFloat(fd.get('alphaGg') as string),
    rcGg: parseFloat(fd.get('rcGg') as string),
    y: parseFloat(fd.get('y') as string),
    maxDh: parseFloat(fd.get('maxDh') as string),
    a: parseFloat(fd.get('a') as string),
    tSt: parseFloat(fd.get('tSt') as string),
    stSg: parseFloat(fd.get('stSg') as string),
    phiPoSg: parseFloat(fd.get('phiPoSg') as string),
    alphaSg: parseFloat(fd.get('alphaSg') as string),
    rcSg: parseFloat(fd.get('rcSg') as string),
    bSs: parseFloat(fd.get('bSs') as string),
    phiPoSs: parseFloat(fd.get('phiPoSs') as string),
    f2: parseFloat(fd.get('f2') as string),
    alphaSs: parseFloat(fd.get('alphaSs') as string),
    sh: parseFloat(fd.get('sh') as string),
    minDesignHeight: parseFloat(fd.get('minDesignHeight') as string),
    maxDesignHeight: parseFloat(fd.get('maxDesignHeight') as string),
    sV: parseFloat(fd.get('sV') as string),
  };
}

export async function createAbutmentInternal(projectId: string, formData: FormData) {
  const access = await requireMember(projectId);
  if (!access) return { error: 'Forbidden' };
  const designType = await db.designType.findUnique({
    where: { key: 'abutment_internal_stability' },
  });
  if (!designType) return { error: 'Design type not found' };
  const data = parseAbutmentInternal(formData);
  if (Object.values(data).some(isNaN)) return { error: 'All fields are required and must be numbers' };
  const name = (formData.get('name') as string | null)?.trim() || null;
  const design = await db.design.create({
    data: { userId: access.userId, projectId, designTypeId: designType.id, name },
  });
  await db.abutmentInternalStability.create({
    data: { ...data, projectId, designId: design.id },
  });
  redirect(`/projects/${projectId}/designs`);
}

export async function updateAbutmentInternal(
  designId: string,
  projectId: string,
  formData: FormData,
) {
  const access = await requireDesignOwnerOrProjectOwner(designId, projectId);
  if (!access) return { error: 'Forbidden' };
  const data = parseAbutmentInternal(formData);
  if (Object.values(data).some(isNaN)) return { error: 'All fields are required and must be numbers' };
  const name = (formData.get('name') as string | null)?.trim() || null;
  await db.design.update({ where: { id: designId }, data: { name } });
  await db.abutmentInternalStability.update({ where: { designId }, data });
  redirect(`/projects/${projectId}/designs/${designId}`);
}

export async function getAbutmentInternal(designId: string, projectId: string) {
  const session = await auth();
  if (!session?.user?.id) return null;
  return db.abutmentInternalStability.findUnique({
    where: { designId },
    include: { design: { include: { creator: { select: { id: true, name: true } }, designType: true } } },
  });
}

// ─── Wing Internal ─────────────────────────────────────────────────────────────

function parseWingInternal(fd: FormData) {
  return {
    bstemBatter: parseFloat(fd.get('bstemBatter') as string),
    bI: parseFloat(fd.get('bI') as string),
    deltaS: parseFloat(fd.get('deltaS') as string),
    gRFill: parseFloat(fd.get('gRFill') as string),
    phiRFill: parseFloat(fd.get('phiRFill') as string),
    pga: parseFloat(fd.get('pga') as string),
    fPgaEq: parseFloat(fd.get('fPgaEq') as string),
    kV: parseFloat(fd.get('kV') as string),
    phiPoGs: parseFloat(fd.get('phiPoGs') as string),
    alphaGs: parseFloat(fd.get('alphaGs') as string),
    rcGs: parseFloat(fd.get('rcGs') as string),
    gStrip: parseFloat(fd.get('gStrip') as string),
    c: parseFloat(fd.get('c') as string),
    phiPoGg: parseFloat(fd.get('phiPoGg') as string),
    phiPoGgEe: parseFloat(fd.get('phiPoGgEe') as string),
    alphaGg: parseFloat(fd.get('alphaGg') as string),
    rcGg: parseFloat(fd.get('rcGg') as string),
    y: parseFloat(fd.get('y') as string),
    a: parseFloat(fd.get('a') as string),
    maxDh: parseFloat(fd.get('maxDh') as string),
    tSt: parseFloat(fd.get('tSt') as string),
    stSg: parseFloat(fd.get('stSg') as string),
    phiPoSg: parseFloat(fd.get('phiPoSg') as string),
    alphaSg: parseFloat(fd.get('alphaSg') as string),
    rcSg: parseFloat(fd.get('rcSg') as string),
    bSs: parseFloat(fd.get('bSs') as string),
    phiPoSs: parseFloat(fd.get('phiPoSs') as string),
    alphaSs: parseFloat(fd.get('alphaSs') as string),
    sh: parseFloat(fd.get('sh') as string),
    d60: parseFloat(fd.get('d60') as string),
    d10: parseFloat(fd.get('d10') as string),
    minDesignHeight: parseFloat(fd.get('minDesignHeight') as string),
    maxDesignHeight: parseFloat(fd.get('maxDesignHeight') as string),
    sV: parseFloat(fd.get('sV') as string),
  };
}

export async function createWingInternal(projectId: string, formData: FormData) {
  const access = await requireMember(projectId);
  if (!access) return { error: 'Forbidden' };
  const designType = await db.designType.findUnique({
    where: { key: 'wing_internal_stability' },
  });
  if (!designType) return { error: 'Design type not found' };
  const data = parseWingInternal(formData);
  if (Object.values(data).some(isNaN)) return { error: 'All fields are required and must be numbers' };
  const name = (formData.get('name') as string | null)?.trim() || null;
  const design = await db.design.create({
    data: { userId: access.userId, projectId, designTypeId: designType.id, name },
  });
  await db.wingInternalStability.create({
    data: { ...data, projectId, designId: design.id },
  });
  redirect(`/projects/${projectId}/designs`);
}

export async function updateWingInternal(
  designId: string,
  projectId: string,
  formData: FormData,
) {
  const access = await requireDesignOwnerOrProjectOwner(designId, projectId);
  if (!access) return { error: 'Forbidden' };
  const data = parseWingInternal(formData);
  if (Object.values(data).some(isNaN)) return { error: 'All fields are required and must be numbers' };
  const name = (formData.get('name') as string | null)?.trim() || null;
  await db.design.update({ where: { id: designId }, data: { name } });
  await db.wingInternalStability.update({ where: { designId }, data });
  redirect(`/projects/${projectId}/designs/${designId}`);
}

export async function getWingInternal(designId: string, projectId: string) {
  const session = await auth();
  if (!session?.user?.id) return null;
  return db.wingInternalStability.findUnique({
    where: { designId },
    include: { design: { include: { creator: { select: { id: true, name: true } }, designType: true } } },
  });
}

// ─── Panel Face Design ─────────────────────────────────────────────────────────

function parsePanelFace(fd: FormData) {
  return {
    fc: parseFloat(fd.get('fc') as string),
    fy: parseFloat(fd.get('fy') as string),
    lPanel: parseFloat(fd.get('lPanel') as string),
    hPanel: parseFloat(fd.get('hPanel') as string),
    tPanel: parseFloat(fd.get('tPanel') as string),
    ssr: parseFloat(fd.get('ssr') as string),
    cCoverPos: parseFloat(fd.get('cCoverPos') as string),
    cCoverNeg: parseFloat(fd.get('cCoverNeg') as string),
    barNumVert: parseFloat(fd.get('barNumVert') as string),
    spacingVert: parseFloat(fd.get('spacingVert') as string),
    barNumHor: parseFloat(fd.get('barNumHor') as string),
    spacingHor: parseFloat(fd.get('spacingHor') as string),
    huStr: parseFloat(fd.get('huStr') as string),
    huEe: parseFloat(fd.get('huEe') as string),
  };
}

export async function createPanelFace(projectId: string, formData: FormData) {
  const access = await requireMember(projectId);
  if (!access) return { error: 'Forbidden' };
  const designType = await db.designType.findUnique({ where: { key: 'panel_face_design' } });
  if (!designType) return { error: 'Design type not found' };
  const data = parsePanelFace(formData);
  if (Object.values(data).some(isNaN)) return { error: 'All fields are required and must be numbers' };
  const name = (formData.get('name') as string | null)?.trim() || null;
  const design = await db.design.create({
    data: { userId: access.userId, projectId, designTypeId: designType.id, name },
  });
  await db.panelFaceDesign.create({ data: { ...data, projectId, designId: design.id } });
  redirect(`/projects/${projectId}/designs`);
}

export async function updatePanelFace(designId: string, projectId: string, formData: FormData) {
  const access = await requireDesignOwnerOrProjectOwner(designId, projectId);
  if (!access) return { error: 'Forbidden' };
  const data = parsePanelFace(formData);
  if (Object.values(data).some(isNaN)) return { error: 'All fields are required and must be numbers' };
  const name = (formData.get('name') as string | null)?.trim() || null;
  await db.design.update({ where: { id: designId }, data: { name } });
  await db.panelFaceDesign.update({ where: { designId }, data });
  redirect(`/projects/${projectId}/designs/${designId}`);
}

export async function getPanelFace(designId: string, projectId: string) {
  const session = await auth();
  if (!session?.user?.id) return null;
  return db.panelFaceDesign.findUnique({
    where: { designId },
    include: { design: { include: { creator: { select: { id: true, name: true } }, designType: true } } },
  });
}

// ─── Generic get design with type-specific data ────────────────────────────────

export async function getDesignWithData(designId: string, projectId: string) {
  const session = await auth();
  if (!session?.user?.id) return null;
  const design = await db.design.findUnique({
    where: { id: designId },
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
  });
  if (!design || design.projectId !== projectId) return null;
  return design;
}
