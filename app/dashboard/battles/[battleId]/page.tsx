import { BattleArena } from '@/components/battles/BattleArena';

interface BattlePageProps {
  params: Promise<{ battleId: string }>;
}

export default async function BattlePage({ params }: BattlePageProps) {
  const { battleId } = await params;

  return (
    <div className="min-h-screen bg-gray-50">
      <BattleArena battleId={battleId} />
    </div>
  );
}
