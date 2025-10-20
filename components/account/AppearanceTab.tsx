"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Sun, Moon, Monitor, Check } from 'lucide-react';
import { useTheme } from 'next-themes';

export function AppearanceTab() {
  const { theme, setTheme } = useTheme();
  const [selectedTheme, setSelectedTheme] = useState(theme || 'system');

  const themes = [
    {
      value: 'light',
      label: 'Light',
      description: 'Light mode theme',
      icon: Sun,
    },
    {
      value: 'dark',
      label: 'Dark',
      description: 'Dark mode theme',
      icon: Moon,
    },
    {
      value: 'system',
      label: 'System',
      description: 'Follow system preference',
      icon: Monitor,
    },
  ];

  const handleThemeChange = (newTheme: string) => {
    setSelectedTheme(newTheme);
    setTheme(newTheme);
    toast.success(`Theme changed to ${newTheme}`);
  };

  return (
    <div className="space-y-6">
      {/* Theme Selector */}
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-semibold text-foreground">Theme</h3>
          <p className="text-sm text-muted-foreground">
            Choose your preferred theme
          </p>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-3 md:gap-4">
          {themes.map((themeOption) => {
            const Icon = themeOption.icon;
            const isSelected = selectedTheme === themeOption.value;

            return (
              <button
                key={themeOption.value}
                onClick={() => handleThemeChange(themeOption.value)}
                className={`relative flex flex-col items-center gap-3 p-6 rounded-lg border-2 transition-all min-h-[120px] active:scale-98 ${
                  isSelected
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/50 bg-card'
                }`}
              >
                {isSelected && (
                  <div className="absolute top-3 right-3">
                    <Check className="w-5 h-5 text-primary" />
                  </div>
                )}

                <Icon className={`w-10 h-10 md:w-8 md:h-8 ${isSelected ? 'text-primary' : 'text-muted-foreground'}`} />

                <div className="text-center">
                  <div className={`font-semibold text-base ${isSelected ? 'text-primary' : 'text-foreground'}`}>
                    {themeOption.label}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {themeOption.description}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Theme Preview */}
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-semibold text-foreground">Preview</h3>
          <p className="text-sm text-muted-foreground">
            See how your theme looks
          </p>
        </div>

        <div className="border rounded-lg p-4 md:p-6 bg-card">
          <div className="space-y-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <h4 className="font-semibold text-foreground text-base">Sample Card</h4>
              <Button className="h-10 min-h-[44px] md:h-9">Action</Button>
            </div>
            <p className="text-sm text-muted-foreground">
              This is how text will appear in your selected theme. UI elements will adapt to match your preference.
            </p>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button variant="default" className="h-10 min-h-[44px]">Primary</Button>
              <Button variant="secondary" className="h-10 min-h-[44px]">Secondary</Button>
              <Button variant="outline" className="h-10 min-h-[44px]">Outline</Button>
            </div>
          </div>
        </div>
      </div>

      {/* Additional Settings (Coming Soon) */}
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-semibold text-foreground">Additional Options</h3>
          <p className="text-sm text-muted-foreground">
            More customization options coming soon
          </p>
        </div>

        <div className="border rounded-lg p-4 md:p-6 bg-muted/50">
          <div className="space-y-4">
            <div className="flex items-center justify-between py-2">
              <div className="flex-1">
                <Label className="text-muted-foreground text-base">Font Size</Label>
                <p className="text-xs text-muted-foreground mt-1">Adjust text size</p>
              </div>
              <span className="text-xs bg-primary/10 text-primary px-3 py-1.5 rounded-full font-medium">Coming Soon</span>
            </div>
            <div className="flex items-center justify-between py-2">
              <div className="flex-1">
                <Label className="text-muted-foreground text-base">Accent Color</Label>
                <p className="text-xs text-muted-foreground mt-1">Choose accent color</p>
              </div>
              <span className="text-xs bg-primary/10 text-primary px-3 py-1.5 rounded-full font-medium">Coming Soon</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
