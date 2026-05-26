'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import {
  LayoutDashboard,
  FolderKanban,
  User,
  HardHat,
  LogOut,
  Menu,
  X,
  ChevronLeft,
} from 'lucide-react';
import { useState } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { cn } from '@/lib/utils/cn';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Projects',  href: '/projects',  icon: FolderKanban },
  { name: 'Profile',   href: '/profile',    icon: User },
];

export default function MainLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const userName = session?.user?.name || 'User';
  const userInitials = userName
    .split(' ')
    .map((n: string) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const renderNavItem = (item: { name: string; href: string; icon: React.ElementType }) => {
    const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
    return (
      <Link
        key={item.name}
        href={item.href}
        className={cn(
          'flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-md transition-colors',
          isActive
            ? 'bg-[hsl(var(--sidebar-accent))] text-white'
            : 'text-[hsl(var(--sidebar-foreground))]/70 hover:bg-[hsl(var(--sidebar-muted))] hover:text-[hsl(var(--sidebar-foreground))]',
          sidebarCollapsed && 'justify-center px-2'
        )}
        title={sidebarCollapsed ? item.name : undefined}
      >
        <item.icon className="h-5 w-5 flex-shrink-0" />
        {!sidebarCollapsed && item.name}
      </Link>
    );
  };

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Mobile backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex flex-col bg-[hsl(var(--sidebar-bg))] border-r border-[hsl(var(--sidebar-muted))] transform transition-all duration-200 ease-in-out lg:translate-x-0',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full',
          sidebarCollapsed ? 'w-[4.5rem]' : 'w-64'
        )}
      >
        {/* Logo */}
        <div className="flex items-center justify-between h-16 px-4 border-b border-[hsl(var(--sidebar-muted))]">
          {sidebarCollapsed ? (
            <Link href="/dashboard" className="mx-auto">
              <div className="w-8 h-8 rounded bg-[hsl(var(--sidebar-accent))] flex items-center justify-center">
                <HardHat className="h-5 w-5 text-white" />
              </div>
            </Link>
          ) : (
            <Link href="/dashboard" className="flex items-center gap-2">
              <div className="w-8 h-8 rounded bg-[hsl(var(--sidebar-accent))] flex items-center justify-center">
                <HardHat className="h-5 w-5 text-white" />
              </div>
              <span className="text-base font-bold text-[hsl(var(--sidebar-foreground))] leading-tight">
                CDOT MSE
              </span>
            </Link>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden text-[hsl(var(--sidebar-foreground))] hover:bg-[hsl(var(--sidebar-muted))]"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Collapse toggle — desktop only */}
        <div className="hidden lg:flex justify-end px-2 py-2">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-[hsl(var(--sidebar-foreground))]/60 hover:bg-[hsl(var(--sidebar-muted))] hover:text-[hsl(var(--sidebar-foreground))]"
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          >
            <ChevronLeft
              className={cn('h-4 w-4 transition-transform', sidebarCollapsed && 'rotate-180')}
            />
          </Button>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-2 space-y-1 overflow-y-auto">
          {navigation.map(renderNavItem)}
        </nav>

        <Separator className="bg-[hsl(var(--sidebar-muted))]" />

        {/* User area */}
        <div className="p-3">
          <div
            className={cn(
              'flex items-center gap-3 px-3 py-2 rounded-md hover:bg-[hsl(var(--sidebar-muted))] transition-colors',
              sidebarCollapsed && 'justify-center px-0'
            )}
          >
            <Avatar className="h-8 w-8">
              <AvatarFallback className="bg-[hsl(var(--sidebar-accent))] text-white text-xs">
                {userInitials}
              </AvatarFallback>
            </Avatar>
            {!sidebarCollapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-[hsl(var(--sidebar-foreground))] truncate">
                  {userName}
                </p>
                <p className="text-xs text-[hsl(var(--sidebar-foreground))]/50 truncate">
                  {session?.user?.email}
                </p>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Content area */}
      <div className={cn('transition-all duration-200', sidebarCollapsed ? 'lg:pl-[4.5rem]' : 'lg:pl-64')}>
        {/* Top header */}
        <header className="sticky top-0 z-30 h-16 bg-card border-b">
          <div className="flex items-center justify-between h-full px-4 lg:px-6">
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="h-5 w-5" />
            </Button>

            <div className="hidden lg:block" />

            <div className="flex items-center gap-3 pl-3 border-l">
              <Avatar className="h-8 w-8">
                <AvatarFallback>{userInitials}</AvatarFallback>
              </Avatar>
              <span className="hidden xl:block text-sm font-medium">{userName}</span>
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
