import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { DashboardWrapper } from '@/components/dashboard/DashboardWrapper'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

export default async function DashboardPage() {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  // TODO: Fetch user stats from database
  const stats = {
    userName: user.email?.split('@')[0] || 'User',
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
      <div className="p-8">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl font-bold mb-8">
            Welcome back, {stats.userName}!
          </h1>

          {/* Stats cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-500">Total Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">{stats.totalNotes}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-500">Study Nodes</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">{stats.totalStudyNodes}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-500">Subscription</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold capitalize">{stats.subscriptionTier}</p>
              </CardContent>
            </Card>
          </div>

          {/* Quick actions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-xl">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Link href="/dashboard/lectures">
                  <Button variant="outline" className="p-6 h-auto flex flex-col items-start space-y-2 w-full">
                    <h3 className="font-medium">Upload Recording</h3>
                    <p className="text-sm text-gray-500">Generate notes from audio</p>
                  </Button>
                </Link>
                <Link href="/dashboard/lectures">
                  <Button variant="outline" className="p-6 h-auto flex flex-col items-start space-y-2 w-full">
                    <h3 className="font-medium">View Lectures</h3>
                    <p className="text-sm text-gray-500">Browse your notes</p>
                  </Button>
                </Link>
                <Link href="/dashboard/exams">
                  <Button variant="outline" className="p-6 h-auto flex flex-col items-start space-y-2 w-full">
                    <h3 className="font-medium">Create Exam</h3>
                    <p className="text-sm text-gray-500">Generate practice tests</p>
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardWrapper>
  )
}