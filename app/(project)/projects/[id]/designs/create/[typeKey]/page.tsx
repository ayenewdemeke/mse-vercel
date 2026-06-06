import { notFound, redirect } from 'next/navigation';
import { db } from '@/lib/db';
import { auth } from '@/auth';
import {
  createAbutment,
  createWing,
  createPanelFace,
} from '@/app/actions/design-inputs';
import AbutmentForm from './abutment-form';
import WingForm from './wing-form';
import PanelFaceForm from './panel-face-form';

export default async function DesignCreatePage({
  params,
}: {
  params: Promise<{ id: string; typeKey: string }>;
}) {
  const { id, typeKey } = await params;
  const session = await auth();
  if (!session?.user?.id) redirect('/login');

  const designType = await db.designType.findUnique({ where: { key: typeKey } });
  if (!designType) notFound();

  if (typeKey === 'abutment') {
    return (
      <AbutmentForm projectId={id} typeName={designType.name} action={createAbutment} />
    );
  }
  if (typeKey === 'wing') {
    return (
      <WingForm projectId={id} typeName={designType.name} action={createWing} />
    );
  }
  if (typeKey === 'panel_face') {
    return (
      <PanelFaceForm projectId={id} typeName={designType.name} action={createPanelFace} />
    );
  }

  notFound();
}
