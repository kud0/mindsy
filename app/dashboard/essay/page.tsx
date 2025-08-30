'use client';

import React, { useState } from 'react';
import EssayDashboard from '@/components/essay/EssayDashboard';
import EssayWriter from '@/components/essay/EssayWriter';
import NewEssayModal from '@/components/essay/NewEssayModal';

type ViewMode = 'dashboard' | 'writer';

export default function EssayPage() {
  const [viewMode, setViewMode] = useState<ViewMode>('dashboard');
  const [currentEssayId, setCurrentEssayId] = useState<string | null>(null);
  const [newEssayModalOpen, setNewEssayModalOpen] = useState(false);

  const handleNewEssay = () => {
    setNewEssayModalOpen(true);
  };

  const handleCreateEssay = (essayData: any) => {
    // TODO: Save essay to database
    console.log('Creating essay:', essayData);
    
    // For now, just open the writer with mock data
    setCurrentEssayId('new');
    setViewMode('writer');
  };

  const handleOpenEssay = (essayId: string) => {
    setCurrentEssayId(essayId);
    setViewMode('writer');
  };

  const handleBackToDashboard = () => {
    setViewMode('dashboard');
    setCurrentEssayId(null);
  };

  if (viewMode === 'writer') {
    return (
      <div className="h-screen">
        <EssayWriter 
          essayId={currentEssayId || undefined}
          initialTitle="Climate Change Essay"
          initialType="Argumentative"
          initialWordGoal={800}
        />
      </div>
    );
  }

  return (
    <>
      <EssayDashboard 
        onNewEssay={handleNewEssay}
        onOpenEssay={handleOpenEssay}
      />
      
      <NewEssayModal
        open={newEssayModalOpen}
        onOpenChange={setNewEssayModalOpen}
        onCreateEssay={handleCreateEssay}
      />
    </>
  );
}