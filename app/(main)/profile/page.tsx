import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/app/actions/profile';
import ProfileInfoForm from './profile-info-form';
import ChangePasswordForm from './change-password-form';

export default async function ProfilePage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-slate-800 mb-1">Profile</h1>
        <p className="text-slate-500 text-sm">Manage your account details and password.</p>
      </div>

      <div className="space-y-6">
        {/* Account info */}
        <div className="rounded-xl border bg-card p-6">
          <h2 className="text-base font-semibold text-slate-700 mb-5">Account Information</h2>
          <ProfileInfoForm user={user} />
        </div>

        {/* Password */}
        <div className="rounded-xl border bg-card p-6">
          <h2 className="text-base font-semibold text-slate-700 mb-1">Change Password</h2>
          <p className="text-sm text-slate-400 mb-5">
            Leave blank if you don&apos;t want to change your password.
          </p>
          <ChangePasswordForm />
        </div>
      </div>
    </div>
  );
}
