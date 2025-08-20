import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { DashboardWrapper } from '@/components/dashboard/DashboardWrapper'
import DashboardOverview from '@/components/dashboard/DashboardOverview'

export default async function DashboardPage() {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  // TODO: Fetch user stats from database
  const stats = {
    userName: user.user_metadata?.name || user.email?.split('@')[0] || 'User',
    totalNotes: 0,
    totalStudyNodes: 0,
    subscriptionTier: 'free'
  }

  const userData = {
    id: user.id,
    name: user.user_metadata?.name || user.email?.split('@')[0] || 'User',
    email: user.email || '',
    avatar: user.user_metadata?.avatar_url,
    plan: 'free' as const
  }

  return (
    <DashboardWrapper user={userData} showSearch={false}>
      <DashboardOverview 
        userName={stats.userName}
        totalNotes={stats.totalNotes}
        totalStudyNodes={stats.totalStudyNodes}
        subscriptionTier={stats.subscriptionTier}
      />
    </DashboardWrapper>
  )
}