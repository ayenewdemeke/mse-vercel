import { notFound, redirect } from 'next/navigation';
import { db } from '@/lib/db';
import { auth } from '@/auth';
import {
  createAbutmentExternal,
  createWingExternalLl,
  createWingExternal,
  createAbutmentInternal,
  createWingInternal,
  createPanelFace,
} from '@/app/actions/design-inputs';
import ExternalStabilityForm from './external-stability-form';
import InternalStabilityForm from './internal-stability-form';
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

  if (typeKey === 'abutment_external_stability') {
    return (
      <ExternalStabilityForm
        projectId={id}
        typeKey={typeKey}
        typeName={designType.name}
        action={createAbutmentExternal}
        hasTheta={false}
      />
    );
  }
  if (typeKey === 'wing_external_stability_ll') {
    return (
      <ExternalStabilityForm
        projectId={id}
        typeKey={typeKey}
        typeName={designType.name}
        action={createWingExternalLl}
        hasTheta
      />
    );
  }
  if (typeKey === 'wing_external_stability') {
    return (
      <ExternalStabilityForm
        projectId={id}
        typeKey={typeKey}
        typeName={designType.name}
        action={createWingExternal}
        hasTheta
      />
    );
  }
  if (typeKey === 'abutment_internal_stability') {
    return (
      <InternalStabilityForm
        projectId={id}
        typeName={designType.name}
        action={createAbutmentInternal}
        isWing={false}
      />
    );
  }
  if (typeKey === 'wing_internal_stability') {
    return (
      <InternalStabilityForm
        projectId={id}
        typeName={designType.name}
        action={createWingInternal}
        isWing
      />
    );
  }
  if (typeKey === 'panel_face_design') {
    return (
      <PanelFaceForm
        projectId={id}
        typeName={designType.name}
        action={createPanelFace}
      />
    );
  }

  notFound();
}
