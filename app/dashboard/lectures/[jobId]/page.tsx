import { Metadata } from 'next'
import { DashboardWrapper } from '@/components/dashboard/DashboardWrapper'
import StructuredStudyDesk from '@/components/notes/StructuredStudyDesk'

interface LectureDetailPageProps {
  params: Promise<{
    jobId: string
  }>
}

export async function generateMetadata({ params }: LectureDetailPageProps): Promise<Metadata> {
  const { jobId } = await params
  
  return {
    title: `Lecture Details | Mindsy`,
    description: `View detailed Cornell notes for lecture ${jobId}`,
  }
}

export default async function LectureDetailPage({ params }: LectureDetailPageProps) {
  const { jobId } = await params

  return (
    <DashboardWrapper>
      <StructuredStudyDesk jobId={jobId} />
    </DashboardWrapper>
  )
}