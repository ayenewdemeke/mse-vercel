import { notFound, redirect } from 'next/navigation';
import { auth } from '@/auth';
import {
  getDesignWithData,
  updateAbutmentExternal,
  updateWingExternalLl,
  updateWingExternal,
  updateAbutmentInternal,
  updateWingInternal,
} from '@/app/actions/design-inputs';
import { getProject } from '@/app/actions/projects';
import ExternalStabilityEditForm from './external-stability-edit-form';
import InternalStabilityEditForm from './internal-stability-edit-form';

export default async function DesignEditPage({
  params,
}: {
  params: Promise<{ id: string; designId: string }>;
}) {
  const { id, designId } = await params;
  const session = await auth();
  if (!session?.user?.id) redirect('/login');

  const [design, project] = await Promise.all([getDesignWithData(designId, id), getProject(id)]);
  if (!design || !project) notFound();

  const currentUserId = session.user.id;
  const isOwner = project.userId === currentUserId;
  const canEdit = isOwner || design.userId === currentUserId;
  if (!canEdit) redirect(`/projects/${id}/designs/${designId}`);

  const typeKey = design.designType.key;
  const designName = design.name;

  if (typeKey === 'abutment_external_stability' && design.abutmentExternalStability) {
    return (
      <ExternalStabilityEditForm
        projectId={id} designId={designId} typeName={design.designType.name}
        designName={designName} hasTheta={false} action={updateAbutmentExternal}
        data={design.abutmentExternalStability}
      />
    );
  }

  if (typeKey === 'wing_external_stability_ll' && design.wingExternalStabilityLl) {
    return (
      <ExternalStabilityEditForm
        projectId={id} designId={designId} typeName={design.designType.name}
        designName={designName} hasTheta action={updateWingExternalLl}
        data={design.wingExternalStabilityLl}
      />
    );
  }

  if (typeKey === 'wing_external_stability' && design.wingExternalStability) {
    return (
      <ExternalStabilityEditForm
        projectId={id} designId={designId} typeName={design.designType.name}
        designName={designName} hasTheta action={updateWingExternal}
        data={design.wingExternalStability}
      />
    );
  }

  if (typeKey === 'abutment_internal_stability' && design.abutmentInternalStability) {
    return (
      <InternalStabilityEditForm
        projectId={id} designId={designId} typeName={design.designType.name}
        designName={designName} isWing={false} action={updateAbutmentInternal}
        data={design.abutmentInternalStability}
      />
    );
  }

  if (typeKey === 'wing_internal_stability' && design.wingInternalStability) {
    return (
      <InternalStabilityEditForm
        projectId={id} designId={designId} typeName={design.designType.name}
        designName={designName} isWing action={updateWingInternal}
        data={design.wingInternalStability}
      />
    );
  }

  notFound();
}
