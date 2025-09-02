import FlexibleStudentDesk from '@/components/notes/FlexibleStudentDesk';

interface PageProps {
  params: Promise<{
    jsonFile: string;
  }>;
}

export default async function DynamicStudentDeskPage({ params }: PageProps) {
  const { jsonFile } = await params;
  
  return <FlexibleStudentDesk jsonFile={jsonFile} />;
}

export async function generateMetadata({ params }: PageProps) {
  const { jsonFile } = await params;
  
  return {
    title: `Student Desk Demo - ${jsonFile}`,
    description: `Demo of the flexible StudentDesk using ${jsonFile} with adaptive JSON structure mapping`
  };
}