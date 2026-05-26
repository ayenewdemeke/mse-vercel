import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { HardHat } from 'lucide-react';

export default function GuestLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <header className="bg-white border-b border-slate-200/60">
        <nav className="container mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <HardHat className="w-7 h-7 text-blue-600" />
            <span className="text-lg font-semibold text-slate-800">CDOT MSE Design</span>
          </Link>
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/login">Sign In</Link>
            </Button>
            <Button size="sm" asChild>
              <Link href="/register">Register</Link>
            </Button>
          </div>
        </nav>
      </header>

      <main className="flex-1 flex">{children}</main>

      <footer className="bg-white border-t border-slate-200/60 py-6">
        <div className="container mx-auto px-6 flex items-center justify-between text-sm text-slate-500">
          <span>&copy; {new Date().getFullYear()} CDOT MSE Design</span>
          <Link href="/about" className="hover:text-slate-700 transition-colors">
            About
          </Link>
        </div>
      </footer>
    </div>
  );
}
