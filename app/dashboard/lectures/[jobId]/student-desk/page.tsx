import StudentDesk from '@/components/student-desk-v2/StudentDesk';

interface StudentDeskPageProps {
  params: Promise<{ jobId: string }>;
}

export default async function StudentDeskPage({ params }: StudentDeskPageProps) {
  const { jobId } = await params;

  return <StudentDesk jobId={jobId} />;
}