import { ClassDetailContent } from './class-detail-content';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ClassDetailPage({ params }: PageProps) {
  const { id } = await params;

  return (
    <div className="space-y-6">
      <ClassDetailContent classId={id} />
    </div>
  );
}
