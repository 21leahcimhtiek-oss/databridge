'use client'

import { useState, useEffect } from 'react'
import { createClientComponent } from '@/lib/supabase/client'
import type { AppUser, Org, UserRole } from '@/types'

type Tab = 'profile' | 'organization' | 'team' | 'danger'

const TABS: { id: Tab; label: string }[] = [
  { id: 'profile', label: 'Profile' },
  { id: 'organization', label: 'Organization' },
  { id: 'team', label: 'Team' },
  { id: 'danger', label: 'Danger Zone' },
]

interface TeamMember extends AppUser {}

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<Tab>('profile')
  const [userData, setUserData] = useState<(AppUser & { orgs: Org }) | null>(null)
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
  const [loading, setLoading] = useState(true)

  // Profile
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [pwError, setPwError] = useState<string | null>(null)
  const [pwSuccess, setPwSuccess] = useState(false)
  const [pwLoading, setPwLoading] = useState(false)

  // Org
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<UserRole>('engineer')
  const [inviteLoading, setInviteLoading] = useState(false)
  const [inviteMsg, setInviteMsg] = useState<string | null>(null)

  // Danger
  const [deleteConfirm, setDeleteConfirm] = useState('')
  const [deleteLoading, setDeleteLoading] = useState(false)

  useEffect(() => {
    const supabase = createClientComponent()
    ;(async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: ud } = await supabase.from('users').select('*, orgs(*)').eq('id', user.id).single<AppUser & { orgs: Org }>()
      if (!ud) return
      setUserData(ud)
      const { data: members } = await supabase.from('users').select('*').eq('org_id', ud.org_id)
      setTeamMembers((members ?? []) as TeamMember[])
      setLoading(false)
    })()
  }, [])

  async function handlePasswordChange(e: React.FormEvent) {
    e.preventDefault()
    setPwError(null)
    setPwSuccess(false)
    if (newPassword !== confirmPassword) { setPwError('Passwords do not match.'); return }
    if (newPassword.length < 8) { setPwError('Password must be at least 8 characters.'); return }
    setPwLoading(true)
    const supabase = createClientComponent()
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    if (error) { setPwError(error.message) } else { setPwSuccess(true); setNewPassword(''); setConfirmPassword('') }
    setPwLoading(false)
  }

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault()
    setInviteMsg(null)
    setInviteLoading(true)
    const res = await fetch('/api/auth/invite', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: inviteEmail, role: inviteRole }),
    })
    const json = await res.json()
    setInviteMsg(res.ok ? `Invite sent to ${inviteEmail}` : json.error ?? 'Failed to invite.')
    if (res.ok) setInviteEmail('')
    setInviteLoading(false)
  }

  async function handleRoleChange(memberId: string, role: UserRole) {
    const supabase = createClientComponent()
    await supabase.from('users').update({ role }).eq('id', memberId)
    setTeamMembers((prev) => prev.map((m) => m.id === memberId ? { ...m, role } : m))
  }

  async function handleDeleteAccount() {
    if (deleteConfirm !== 'DELETE') return
    setDeleteLoading(true)
    const res = await fetch('/api/auth/delete-account', { method: 'DELETE' })
    if (res.ok) {
      const supabase = createClientComponent()
      await supabase.auth.signOut()
      window.location.href = '/'
    }
    setDeleteLoading(false)
  }

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-indigo-600 border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-8">Settings</h1>

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700 mb-8">
        <nav className="flex gap-1">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2.5 text-sm font-medium rounded-t-lg border-b-2 transition-all ${activeTab === tab.id ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Profile Tab */}
      {activeTab === 'profile' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="font-semibold mb-4">Account Info</h2>
            <dl className="space-y-3 text-sm">
              <div className="flex justify-between">
                <dt className="text-gray-500">Email</dt>
                <dd className="font-medium">{userData?.email}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">Role</dt>
                <dd className="capitalize font-medium">{userData?.role}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">Member since</dt>
                <dd className="font-medium">{userData ? new Date(userData.created_at).toLocaleDateString() : '—'}</dd>
              </div>
            </dl>
          </div>

          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="font-semibold mb-4">Change Password</h2>
            <form onSubmit={handlePasswordChange} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">New password</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Min. 8 characters"
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Confirm password</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              {pwError && <p className="text-sm text-red-600">{pwError}</p>}
              {pwSuccess && <p className="text-sm text-green-600">Password updated successfully.</p>}
              <button
                type="submit"
                disabled={pwLoading}
                className="rounded-lg bg-indigo-600 px-5 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50 transition-colors"
              >
                {pwLoading ? 'Updating…' : 'Update Password'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Organization Tab */}
      {activeTab === 'organization' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="font-semibold mb-4">Organization Details</h2>
            <dl className="space-y-3 text-sm">
              <div className="flex justify-between">
                <dt className="text-gray-500">Name</dt>
                <dd className="font-medium">{userData?.orgs?.name}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">Slug</dt>
                <dd className="font-mono text-xs bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">{userData?.orgs?.slug}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">Plan</dt>
                <dd className="capitalize font-medium">{userData?.orgs?.plan}</dd>
              </div>
            </dl>
          </div>

          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="font-semibold mb-4">Invite Team Member</h2>
            <form onSubmit={handleInvite} className="space-y-4">
              <div className="flex gap-3">
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="colleague@company.com"
                  required
                  className="flex-1 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as UserRole)}
                  className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="engineer">Engineer</option>
                  <option value="viewer">Viewer</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              {inviteMsg && <p className={`text-sm ${inviteMsg.startsWith('Invite') ? 'text-green-600' : 'text-red-600'}`}>{inviteMsg}</p>}
              <button
                type="submit"
                disabled={inviteLoading}
                className="rounded-lg bg-indigo-600 px-5 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50 transition-colors"
              >
                {inviteLoading ? 'Sending…' : 'Send Invite'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Team Tab */}
      {activeTab === 'team' && (
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-800/60">
              <tr>
                {['Email', 'Role', 'Joined', 'Actions'].map((h) => (
                  <th key={h} className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {teamMembers.map((member) => (
                <tr key={member.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/40">
                  <td className="px-6 py-4 font-medium text-gray-900 dark:text-gray-100">{member.email}</td>
                  <td className="px-6 py-4">
                    {userData?.role === 'admin' && member.id !== userData.id ? (
                      <select
                        value={member.role}
                        onChange={(e) => handleRoleChange(member.id, e.target.value as UserRole)}
                        className="rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-2 py-1 text-sm"
                      >
                        <option value="admin">Admin</option>
                        <option value="engineer">Engineer</option>
                        <option value="viewer">Viewer</option>
                      </select>
                    ) : (
                      <span className="capitalize text-gray-600 dark:text-gray-400">{member.role}</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-gray-500">{new Date(member.created_at).toLocaleDateString()}</td>
                  <td className="px-6 py-4">
                    {member.id === userData?.id && <span className="text-xs text-gray-400">You</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Danger Zone Tab */}
      {activeTab === 'danger' && (
        <div className="bg-white dark:bg-gray-900 rounded-2xl border-2 border-red-200 dark:border-red-800 p-6">
          <h2 className="font-semibold text-red-600 mb-2">Danger Zone</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
            Permanently delete your account and all associated data. This action cannot be undone.
          </p>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                Type <span className="font-mono font-bold">DELETE</span> to confirm
              </label>
              <input
                type="text"
                value={deleteConfirm}
                onChange={(e) => setDeleteConfirm(e.target.value)}
                placeholder="DELETE"
                className="w-full rounded-lg border border-red-300 dark:border-red-700 bg-white dark:bg-gray-800 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>
            <button
              onClick={handleDeleteAccount}
              disabled={deleteConfirm !== 'DELETE' || deleteLoading}
              className="rounded-lg bg-red-600 px-5 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50 transition-colors"
            >
              {deleteLoading ? 'Deleting…' : 'Delete My Account'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}