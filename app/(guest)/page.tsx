import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { BarChart3, FileText, Map, Users } from 'lucide-react';

export default function HomePage() {
  return (
    <div className="container mx-auto px-4 py-16">
      {/* Hero */}
      <section className="max-w-4xl mx-auto text-center py-20">
        <h1 className="text-5xl font-bold mb-6 text-slate-800">
          MSE Retaining Wall{' '}
          <span className="text-blue-600">Design Tool</span>
        </h1>
        <p className="text-xl text-slate-500 mb-8 max-w-2xl mx-auto">
          Streamline your Mechanically Stabilized Earth retaining wall design workflow.
          Manage projects, run stability analyses, and generate reports in one place.
        </p>
        <div className="flex gap-4 justify-center">
          <Button size="lg" asChild>
            <Link href="/register">Get Started</Link>
          </Button>
          <Button size="lg" variant="outline" asChild>
            <Link href="/login">Sign In</Link>
          </Button>
        </div>
      </section>

      {/* Features */}
      <section className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mt-12 max-w-5xl mx-auto">
        <div className="bg-white rounded-xl border border-slate-200 p-6 text-center">
          <div className="bg-blue-50 w-12 h-12 rounded-lg mx-auto mb-4 flex items-center justify-center">
            <Map className="w-6 h-6 text-blue-600" />
          </div>
          <h3 className="text-base font-semibold text-slate-800 mb-2">Project Management</h3>
          <p className="text-sm text-slate-500">
            Organize projects by location. View all project sites on an interactive map.
          </p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-6 text-center">
          <div className="bg-blue-50 w-12 h-12 rounded-lg mx-auto mb-4 flex items-center justify-center">
            <BarChart3 className="w-6 h-6 text-blue-600" />
          </div>
          <h3 className="text-base font-semibold text-slate-800 mb-2">Stability Analysis</h3>
          <p className="text-sm text-slate-500">
            Run external and internal stability checks for abutments and wing walls instantly.
          </p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-6 text-center">
          <div className="bg-blue-50 w-12 h-12 rounded-lg mx-auto mb-4 flex items-center justify-center">
            <FileText className="w-6 h-6 text-blue-600" />
          </div>
          <h3 className="text-base font-semibold text-slate-800 mb-2">Report Generation</h3>
          <p className="text-sm text-slate-500">
            Export analysis results as Word or Excel reports ready for review and submission.
          </p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-6 text-center">
          <div className="bg-blue-50 w-12 h-12 rounded-lg mx-auto mb-4 flex items-center justify-center">
            <Users className="w-6 h-6 text-blue-600" />
          </div>
          <h3 className="text-base font-semibold text-slate-800 mb-2">Team Collaboration</h3>
          <p className="text-sm text-slate-500">
            Invite team members to projects with defined roles for access control.
          </p>
        </div>
      </section>
    </div>
  );
}
