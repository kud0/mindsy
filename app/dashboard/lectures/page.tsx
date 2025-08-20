import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { DashboardWrapper } from '@/components/dashboard/DashboardWrapper'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default async function LecturesPage() {
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
      <div className="p-8">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl font-bold mb-8">
            Lectures
          </h1>
          
          <Card>
            <CardHeader>
              <CardTitle>Your Lectures & Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-500">
                This is where your lectures and notes will be displayed.
                <br />
                <span className="text-sm">TODO: Migrate StudiesWithLectures component</span>
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardWrapper>
  )
}