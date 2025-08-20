import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { DashboardWrapper } from '@/components/dashboard/DashboardWrapper'
import ExamDashboard from '@/components/exams/ExamDashboard'

export default async function ExamsPage() {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  const userData = {
    id: user.id,
    name: user.user_metadata?.name || user.email?.split('@')[0] || 'User',
    email: user.email || '',
    avatar: user.user_metadata?.avatar_url,
    plan: 'free' as const
  }

  return (
    <DashboardWrapper user={userData}>
      <ExamDashboard user={userData} />
    </DashboardWrapper>
  )
}