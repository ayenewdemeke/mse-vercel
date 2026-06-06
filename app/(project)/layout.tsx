'use client';

import Link from 'next/link';
import { usePathname, useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import {
  LayoutDashboard,
  FileText,
  Users,
  BarChart3,
  ArrowLeft,
  FolderKanban,
  LogOut,
  Menu,
  ChevronLeft,
  ChevronsUpDown,
  Check,
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { getProjects, type ProjectListItem } from '@/app/actions/projects';
import { cn } from '@/lib/utils/cn';

const projectNavigation = [
  { name: 'Dashboard', href: 'dashboard', icon: LayoutDashboard },
  { name: 'Members',   href: 'members',   icon: Users },
  { name: 'Documents', href: 'documents', icon: FileText },
  { name: 'Designs',   href: 'designs',   icon: BarChart3 },
];

export default function ProjectLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const params = useParams();
  const { data: session } = useSession();
  const projectId = params.id as string;

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [switcherOpen, setSwitcherOpen] = useState(false);
  const [userProjects, setUserProjects] = useState<ProjectListItem[]>([]);

  const userName = session?.user?.name || 'User';
  const userImage = session?.user?.image ? `/api/storage/${session.user.image}` : null;
  const userInitials = userName
    .split(' ')
    .map((n: string) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  useEffect(() => {
    getProjects()
      .then(setUserProjects)
      .catch(() => {});
  }, []);

  const currentProject = userProjects.find((p) => p.id === projectId);
  const projectName = currentProject?.name ?? 'Loading…';

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Mobile backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Switcher backdrop */}
      {switcherOpen && (
        <div className="fixed inset-0 z-[45]" onClick={() => setSwitcherOpen(false)} />
      )}

      {/* Sidebar — project charcoal theme */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex flex-col bg-[hsl(var(--project-sidebar-bg))] border-r border-[hsl(var(--project-sidebar-muted))] transform transition-all duration-200 ease-in-out lg:translate-x-0',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full',
          sidebarCollapsed ? 'w-[4.5rem]' : 'w-64'
        )}
      >
        {/* Back to main */}
        <div className="flex items-center h-12 px-3 border-b border-[hsl(var(--project-sidebar-muted))]">
          <Link
            href="/projects"
            className={cn(
              'flex items-center gap-2 text-[hsl(var(--project-sidebar-foreground))]/70 hover:text-[hsl(var(--project-sidebar-foreground))] transition-colors text-sm',
              sidebarCollapsed && 'justify-center'
            )}
          >
            <ArrowLeft className="h-4 w-4 flex-shrink-0" />
            {!sidebarCollapsed && 'All projects'}
          </Link>
        </div>

        {/* Project switcher */}
        <div className="relative px-3 py-3 border-b border-[hsl(var(--project-sidebar-muted))]">
          <button
            onClick={() => setSwitcherOpen(!switcherOpen)}
            className={cn(
              'w-full flex items-center gap-3 px-3 py-2 rounded-md bg-[hsl(var(--project-sidebar-muted))] hover:bg-[hsl(var(--project-sidebar-muted))]/80 transition-colors',
              sidebarCollapsed && 'justify-center px-2'
            )}
          >
            <div className="w-8 h-8 rounded bg-[hsl(var(--project-sidebar-accent))] flex items-center justify-center flex-shrink-0">
              <FolderKanban className="h-4 w-4 text-white" />
            </div>
            {!sidebarCollapsed && (
              <>
                <p className="flex-1 text-left text-sm font-medium text-[hsl(var(--project-sidebar-foreground))] truncate">
                  {projectName}
                </p>
                <ChevronsUpDown className="h-4 w-4 text-[hsl(var(--project-sidebar-foreground))]/50" />
              </>
            )}
          </button>

          {switcherOpen && !sidebarCollapsed && (
            <div className="absolute left-3 right-3 top-full mt-1 z-50 rounded-md border shadow-lg bg-white text-gray-900">
              <div className="p-2">
                <p className="px-2 py-1 text-xs font-medium text-gray-500">Switch project</p>
                {userProjects.map((p) => (
                  <Link
                    key={p.id}
                    href={`/projects/${p.id}/dashboard`}
                    onClick={() => setSwitcherOpen(false)}
                    className={cn(
                      'flex items-center gap-2 px-2 py-2 rounded text-sm hover:bg-gray-100 transition-colors',
                      p.id === projectId && 'bg-gray-100'
                    )}
                  >
                    <FolderKanban className="h-4 w-4 text-gray-400 flex-shrink-0" />
                    <span className="flex-1 truncate">{p.name}</span>
                    {p.id === projectId && <Check className="h-4 w-4 text-primary" />}
                  </Link>
                ))}
                {userProjects.length === 0 && (
                  <p className="px-2 py-2 text-sm text-gray-400">No projects found</p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Collapse toggle — desktop only */}
        <div className="hidden lg:flex justify-end px-2 py-2">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-[hsl(var(--project-sidebar-foreground))]/60 hover:bg-[hsl(var(--project-sidebar-muted))] hover:text-[hsl(var(--project-sidebar-foreground))]"
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          >
            <ChevronLeft
              className={cn('h-4 w-4 transition-transform', sidebarCollapsed && 'rotate-180')}
            />
          </Button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-2 space-y-1 overflow-y-auto">
          {projectNavigation.map((item) => {
            const href = `/projects/${projectId}/${item.href}`;
            const isActive = pathname === href || pathname.startsWith(href + '/');
            return (
              <Link
                key={item.name}
                href={href}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-md transition-colors',
                  isActive
                    ? 'bg-[hsl(var(--project-sidebar-accent))] text-white'
                    : 'text-[hsl(var(--project-sidebar-foreground))]/70 hover:bg-[hsl(var(--project-sidebar-muted))] hover:text-[hsl(var(--project-sidebar-foreground))]',
                  sidebarCollapsed && 'justify-center px-2'
                )}
                title={sidebarCollapsed ? item.name : undefined}
              >
                <item.icon className="h-5 w-5 flex-shrink-0" />
                {!sidebarCollapsed && item.name}
              </Link>
            );
          })}
        </nav>

        <Separator className="bg-[hsl(var(--project-sidebar-muted))]" />

        {/* User */}
        <div className="p-3">
          <div
            className={cn(
              'flex items-center gap-3 px-3 py-2',
              sidebarCollapsed && 'justify-center px-0'
            )}
          >
            <Avatar className="h-8 w-8">
              {userImage && <AvatarImage src={userImage} alt={userName} />}
              <AvatarFallback className="bg-[hsl(var(--project-sidebar-accent))] text-white text-xs">
                {userInitials}
              </AvatarFallback>
            </Avatar>
            {!sidebarCollapsed && (
              <p className="flex-1 text-sm font-medium text-[hsl(var(--project-sidebar-foreground))] truncate">
                {userName}
              </p>
            )}
          </div>
        </div>
      </aside>

      {/* Content area */}
      <div className={cn('transition-all duration-200', sidebarCollapsed ? 'lg:pl-[4.5rem]' : 'lg:pl-64')}>
        {/* Header */}
        <header className="sticky top-0 z-30 h-16 bg-card border-b">
          <div className="flex items-center justify-between h-full px-4 lg:px-6">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                className="lg:hidden"
                onClick={() => setSidebarOpen(true)}
              >
                <Menu className="h-5 w-5" />
              </Button>
              <p className="lg:hidden text-sm font-medium truncate max-w-[200px]">{projectName}</p>
            </div>

            <div className="flex items-center gap-3 pl-3 border-l">
              <Link href="/profile" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
                <Avatar className="h-8 w-8">
                  {userImage && <AvatarImage src={userImage} alt={userName} />}
                  <AvatarFallback>{userInitials}</AvatarFallback>
                </Avatar>
                <span className="hidden xl:block text-sm font-medium">{userName}</span>
              </Link>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => signOut({ callbackUrl: '/login' })}
                title="Sign out"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </header>

        <main className="p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
}
