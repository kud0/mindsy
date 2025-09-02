import { Metadata } from 'next'
import StudentDesk from '@/components/student-desk-v2/StudentDesk'

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

  return <StudentDesk jobId={jobId} />
}