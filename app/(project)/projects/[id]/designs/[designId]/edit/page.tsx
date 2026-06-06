import { notFound, redirect } from 'next/navigation';
import { auth } from '@/auth';
import {
  getDesignWithData,
  updateAbutment,
  updateWing,
  updatePanelFace,
} from '@/app/actions/design-inputs';
import { getProject } from '@/app/actions/projects';
import AbutmentForm from '../../create/[typeKey]/abutment-form';
import WingForm from '../../create/[typeKey]/wing-form';
import PanelFaceForm from '../../create/[typeKey]/panel-face-form';

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

  if (typeKey === 'abutment' && design.abutmentDesign) {
    return (
      <AbutmentForm
        projectId={id}
        designId={designId}
        typeName={design.designType.name}
        designName={designName}
        data={design.abutmentDesign}
        action={updateAbutment}
      />
    );
  }

  if (typeKey === 'wing' && design.wingDesign) {
    return (
      <WingForm
        projectId={id}
        designId={designId}
        typeName={design.designType.name}
        designName={designName}
        data={design.wingDesign}
        action={updateWing}
      />
    );
  }

  if (typeKey === 'panel_face' && design.panelFaceDesign) {
    return (
      <PanelFaceForm
        projectId={id}
        designId={designId}
        typeName={design.designType.name}
        designName={designName}
        data={design.panelFaceDesign}
        action={updatePanelFace}
      />
    );
  }

  notFound();
}
