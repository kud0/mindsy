import { Suspense } from 'react'
import CleanStudyGuide from '@/components/study-guides/CleanStudyGuide'
import { Card, CardContent } from '@/components/ui/card'

interface PageProps {
  params: Promise<{
    id: string
  }>
}

export default async function StudyGuidePage({ params }: PageProps) {
  const { id } = await params

  return (
    <div className="container mx-auto py-6 px-4">
      <Suspense fallback={<LoadingFallback />}>
        <CleanStudyGuide studyGuideId={id} />
      </Suspense>
    </div>
  )
}

function LoadingFallback() {
  return (
    <Card>
      <CardContent className="p-8">
        <div className="flex items-center justify-center">
          <div className="flex items-center space-x-2">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
            <span>Loading study guide...</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export async function generateMetadata({ params }: PageProps) {
  const { id } = await params
  
  return {
    title: 'Study Guide | Mindsy',
    description: 'AI-generated study guide with questions, explanations, and summary',
  }
}