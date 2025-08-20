import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Edit } from 'lucide-react';

interface RenameNoteModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  note: { id: string; title: string } | null;
  onRenameNote: (id: string, newTitle: string) => void;
}

export function RenameNoteModal({
  open,
  onOpenChange,
  note,
  onRenameNote
}: RenameNoteModalProps) {
  const [title, setTitle] = useState(note?.title || '');

  useEffect(() => {
    setTitle(note?.title || '');
  }, [note]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (note && title.trim() && title !== note.title) {
      onRenameNote(note.id, title.trim());
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Rename Note</DialogTitle>
            <DialogDescription>
              Enter a new title for your note
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="title">Note Title</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter note title"
                autoFocus
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={!title.trim() || title === note?.title}
            >
              <Edit className="mr-2 h-4 w-4" />
              Rename
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}