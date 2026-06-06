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

function num(fd: FormData, key: string): number {
  return parseFloat(fd.get(key) as string);
}

// ─── Abutment Design ──────────────────────────────────────────────────────────

function parseAbutment(fd: FormData) {
  return {
    yev: num(fd, 'yev'),
    ylsV: num(fd, 'ylsV'),
    bstemBatter: num(fd, 'bstemBatter'),
    bI: num(fd, 'bI'),
    deltaS: num(fd, 'deltaS'),
    gRFill: num(fd, 'gRFill'),
    phiRFill: num(fd, 'phiRFill'),
    sigmaBrg: num(fd, 'sigmaBrg'),
    phiFSoil: num(fd, 'phiFSoil'),
    pga: num(fd, 'pga'),
    fPgaEq: num(fd, 'fPgaEq'),
    kV: num(fd, 'kV'),
    phiPoGs: num(fd, 'phiPoGs'),
    alphaGs: num(fd, 'alphaGs'),
    rcGs: num(fd, 'rcGs'),
    c: num(fd, 'c'),
    phiPoGg: num(fd, 'phiPoGg'),
    phiPoGgEe: num(fd, 'phiPoGgEe'),
    alphaGg: num(fd, 'alphaGg'),
    rcGg: num(fd, 'rcGg'),
    y: num(fd, 'y'),
    maxDh: num(fd, 'maxDh'),
    a: num(fd, 'a'),
    tSt: num(fd, 'tSt'),
    stSg: num(fd, 'stSg'),
    phiPoSg: num(fd, 'phiPoSg'),
    alphaSg: num(fd, 'alphaSg'),
    rcSg: num(fd, 'rcSg'),
    bSs: num(fd, 'bSs'),
    phiPoSs: num(fd, 'phiPoSs'),
    f2: num(fd, 'f2'),
    alphaSs: num(fd, 'alphaSs'),
    sh: num(fd, 'sh'),
    minDesignHeight: num(fd, 'minDesignHeight'),
    maxDesignHeight: num(fd, 'maxDesignHeight'),
    sV: num(fd, 'sV'),
    minRl: num(fd, 'minRl'),
  };
}

export async function createAbutment(projectId: string, formData: FormData) {
  const access = await requireMember(projectId);
  if (!access) return { error: 'Forbidden' };
  const designType = await db.designType.findUnique({ where: { key: 'abutment' } });
  if (!designType) return { error: 'Design type not found' };
  const data = parseAbutment(formData);
  if (Object.values(data).some(isNaN)) return { error: 'All fields are required and must be numbers' };
  const name = (formData.get('name') as string | null)?.trim() || null;
  const design = await db.design.create({
    data: { userId: access.userId, projectId, designTypeId: designType.id, name },
  });
  await db.abutmentDesign.create({
    data: { ...data, projectId, designId: design.id },
  });
  redirect(`/projects/${projectId}/designs`);
}

export async function updateAbutment(designId: string, projectId: string, formData: FormData) {
  const access = await requireDesignOwnerOrProjectOwner(designId, projectId);
  if (!access) return { error: 'Forbidden' };
  const data = parseAbutment(formData);
  if (Object.values(data).some(isNaN)) return { error: 'All fields are required and must be numbers' };
  const name = (formData.get('name') as string | null)?.trim() || null;
  await db.design.update({ where: { id: designId }, data: { name } });
  await db.abutmentDesign.update({ where: { designId }, data });
  redirect(`/projects/${projectId}/designs/${designId}`);
}

export async function getAbutment(designId: string, projectId: string) {
  const session = await auth();
  if (!session?.user?.id) return null;
  return db.abutmentDesign.findUnique({
    where: { designId },
    include: { design: { include: { creator: { select: { id: true, name: true } }, designType: true } } },
  });
}

// ─── Wing Design ──────────────────────────────────────────────────────────────

function parseWing(fd: FormData) {
  return {
    yev: num(fd, 'yev'),
    ylsV: num(fd, 'ylsV'),
    bstemBatter: num(fd, 'bstemBatter'),
    theta: num(fd, 'theta'),
    bI: num(fd, 'bI'),
    deltaS: num(fd, 'deltaS'),
    gRFill: num(fd, 'gRFill'),
    phiRFill: num(fd, 'phiRFill'),
    sigmaBrg: num(fd, 'sigmaBrg'),
    phiFSoil: num(fd, 'phiFSoil'),
    pga: num(fd, 'pga'),
    fPgaEq: num(fd, 'fPgaEq'),
    kV: num(fd, 'kV'),
    phiPoGs: num(fd, 'phiPoGs'),
    alphaGs: num(fd, 'alphaGs'),
    rcGs: num(fd, 'rcGs'),
    gStrip: num(fd, 'gStrip'),
    c: num(fd, 'c'),
    phiPoGg: num(fd, 'phiPoGg'),
    phiPoGgEe: num(fd, 'phiPoGgEe'),
    alphaGg: num(fd, 'alphaGg'),
    rcGg: num(fd, 'rcGg'),
    y: num(fd, 'y'),
    a: num(fd, 'a'),
    maxDh: num(fd, 'maxDh'),
    tSt: num(fd, 'tSt'),
    stSg: num(fd, 'stSg'),
    phiPoSg: num(fd, 'phiPoSg'),
    alphaSg: num(fd, 'alphaSg'),
    rcSg: num(fd, 'rcSg'),
    bSs: num(fd, 'bSs'),
    phiPoSs: num(fd, 'phiPoSs'),
    alphaSs: num(fd, 'alphaSs'),
    sh: num(fd, 'sh'),
    d60: num(fd, 'd60'),
    d10: num(fd, 'd10'),
    minDesignHeight: num(fd, 'minDesignHeight'),
    maxDesignHeight: num(fd, 'maxDesignHeight'),
    sV: num(fd, 'sV'),
    minRl: num(fd, 'minRl'),
  };
}

export async function createWing(projectId: string, formData: FormData) {
  const access = await requireMember(projectId);
  if (!access) return { error: 'Forbidden' };
  const designType = await db.designType.findUnique({ where: { key: 'wing' } });
  if (!designType) return { error: 'Design type not found' };
  const data = parseWing(formData);
  if (Object.values(data).some(isNaN)) return { error: 'All fields are required and must be numbers' };
  const name = (formData.get('name') as string | null)?.trim() || null;
  const design = await db.design.create({
    data: { userId: access.userId, projectId, designTypeId: designType.id, name },
  });
  await db.wingDesign.create({
    data: { ...data, projectId, designId: design.id },
  });
  redirect(`/projects/${projectId}/designs`);
}

export async function updateWing(designId: string, projectId: string, formData: FormData) {
  const access = await requireDesignOwnerOrProjectOwner(designId, projectId);
  if (!access) return { error: 'Forbidden' };
  const data = parseWing(formData);
  if (Object.values(data).some(isNaN)) return { error: 'All fields are required and must be numbers' };
  const name = (formData.get('name') as string | null)?.trim() || null;
  await db.design.update({ where: { id: designId }, data: { name } });
  await db.wingDesign.update({ where: { designId }, data });
  redirect(`/projects/${projectId}/designs/${designId}`);
}

export async function getWing(designId: string, projectId: string) {
  const session = await auth();
  if (!session?.user?.id) return null;
  return db.wingDesign.findUnique({
    where: { designId },
    include: { design: { include: { creator: { select: { id: true, name: true } }, designType: true } } },
  });
}

// ─── Panel Face Design ────────────────────────────────────────────────────────

function parsePanelFace(fd: FormData) {
  return {
    fc: num(fd, 'fc'),
    fy: num(fd, 'fy'),
    lPanel: num(fd, 'lPanel'),
    hPanel: num(fd, 'hPanel'),
    tPanel: num(fd, 'tPanel'),
    ssr: num(fd, 'ssr'),
    cCoverPos: num(fd, 'cCoverPos'),
    cCoverNeg: num(fd, 'cCoverNeg'),
    barNumVert: num(fd, 'barNumVert'),
    spacingVert: num(fd, 'spacingVert'),
    barNumHor: num(fd, 'barNumHor'),
    spacingHor: num(fd, 'spacingHor'),
    huStr: num(fd, 'huStr'),
    huEe: num(fd, 'huEe'),
  };
}

export async function createPanelFace(projectId: string, formData: FormData) {
  const access = await requireMember(projectId);
  if (!access) return { error: 'Forbidden' };
  const designType = await db.designType.findUnique({ where: { key: 'panel_face' } });
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
      abutmentDesign: true,
      wingDesign: true,
      panelFaceDesign: true,
    },
  });
  if (!design || design.projectId !== projectId) return null;
  return design;
}
