"use client"

import React from 'react';
import { TestTube } from 'lucide-react';
import { BaseWidget } from './BaseWidget';

export function TestWidget() {
  return (
    <BaseWidget
      title="Test Box"
      icon={TestTube}
      href="/dashboard/test"
      color="text-green-600 dark:text-green-400"
      bgColor="bg-green-100 dark:bg-green-900/30"
    >
      <div className="space-y-4">
        <div className="text-center py-8">
          <h3 className="text-2xl font-bold">Test Content</h3>
          <p className="text-muted-foreground mt-2">This is a test widget</p>
        </div>

        <div className="flex justify-around">
          <div className="text-center">
            <p className="text-2xl font-bold">42</p>
            <p className="text-xs text-muted-foreground">Tests</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold">98%</p>
            <p className="text-xs text-muted-foreground">Success</p>
          </div>
        </div>
      </div>
    </BaseWidget>
  );
}