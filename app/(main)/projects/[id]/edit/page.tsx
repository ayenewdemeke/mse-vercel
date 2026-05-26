import { notFound, redirect } from 'next/navigation';
import { auth } from '@/auth';
import { getProject } from '@/app/actions/projects';
import EditProjectForm from './edit-form';

export default async function EditProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.id) redirect('/login');

  const project = await getProject(id);
  if (!project) notFound();
  if (project.userId !== session.user.id) redirect(`/projects/${id}/dashboard`);

  return <EditProjectForm project={project} />;
}
