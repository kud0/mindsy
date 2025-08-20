import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Folder, FolderPlus, Search } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

interface Folder {
  id: string;
  name: string;
  parentId?: string;
}

interface CreateFolderModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreateFolder: (name: string, description?: string, parentId?: string) => void;
  folders?: Folder[];
  currentFolderId?: string;
}

// Helper to flatten folders with indentation
function flattenFoldersWithIndent(folders: Folder[], level = 0): { folder: Folder; level: number }[] {
  const result: { folder: Folder; level: number }[] = [];
  
  folders.forEach(folder => {
    result.push({ folder, level });
    // Recursively add subfolders if they exist
    const subfolders = folders.filter(f => f.parentId === folder.id);
    if (subfolders.length > 0) {
      result.push(...flattenFoldersWithIndent(subfolders, level + 1));
    }
  });
  
  return result;
}

export function CreateFolderModal({
  open,
  onOpenChange,
  onCreateFolder,
  folders = [],
  currentFolderId
}: CreateFolderModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [parentId, setParentId] = useState<string>('');
  
  // Update parentId when currentFolderId changes
  React.useEffect(() => {
    const cleanCurrentFolderId = typeof currentFolderId === 'string' ? currentFolderId : '';
    console.log('Setting parentId from currentFolderId:', cleanCurrentFolderId);
    setParentId(cleanCurrentFolderId);
  }, [currentFolderId]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      console.log('Form submit with:', { 
        name: name.trim(), 
        description: description.trim(), 
        parentId,
        parentIdType: typeof parentId,
        parentIdValue: parentId
      });
      
      // Ensure parentId is a string or undefined, not an event object
      const cleanParentId = typeof parentId === 'string' ? (parentId || undefined) : undefined;
      console.log('Clean parentId:', cleanParentId);
      
      onCreateFolder(name.trim(), description.trim() || undefined, cleanParentId);
      setName('');
      setDescription('');
      setParentId('');
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Create New Folder</DialogTitle>
            <DialogDescription>
              Organize your notes by creating folders. You can nest folders for better organization.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Folder Name</Label>
              <Input
                id="name"
                placeholder="e.g., Math Notes, Project Ideas"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoFocus
              />
            </div>
            
            {folders.length > 0 && (
              <div className="grid gap-2">
                <Label htmlFor="parent">Parent Folder (Optional)</Label>
                <select
                  id="parent"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  value={parentId}
                  onChange={(e) => {
                    const value = e.target.value;
                    console.log('Select onChange:', value, typeof value);
                    if (typeof value === 'string') {
                      setParentId(value);
                    }
                  }}
                >
                  <option value="">Root (No parent)</option>
                  {(() => {
                    // Get root folders and build hierarchy
                    const rootFolders = folders.filter(f => !f.parentId);
                    const flattened = flattenFoldersWithIndent(rootFolders);
                    
                    return flattened.map(({ folder, level }) => (
                      <option key={folder.id} value={folder.id}>
                        {'  '.repeat(level) + (level > 0 ? '└─ ' : '') + folder.name}
                      </option>
                    ));
                  })()}
                </select>
              </div>
            )}
            
            <div className="grid gap-2">
              <Label htmlFor="description">Description (Optional)</Label>
              <Textarea
                id="description"
                placeholder="Add a description for this folder..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={!name.trim()}>
              <FolderPlus className="mr-2 h-4 w-4" />
              Create Folder
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

interface RenameFolderModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  folder: { id: string; name: string } | null;
  onRenameFolder: (id: string, newName: string) => void;
}

export function RenameFolderModal({
  open,
  onOpenChange,
  folder,
  onRenameFolder
}: RenameFolderModalProps) {
  const [name, setName] = useState(folder?.name || '');

  React.useEffect(() => {
    setName(folder?.name || '');
  }, [folder]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (folder && name.trim() && name !== folder.name) {
      onRenameFolder(folder.id, name.trim());
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Rename Folder</DialogTitle>
            <DialogDescription>
              Enter a new name for "{folder?.name}"
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="rename">Folder Name</Label>
              <Input
                id="rename"
                value={name}
                onChange={(e) => setName(e.target.value)}
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
              disabled={!name.trim() || name === folder?.name}
            >
              Rename
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

interface MoveToFolderModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  folders: Folder[];
  currentFolderId?: string;
  itemName: string;
  itemType: 'note' | 'folder';
  onMove: (targetFolderId: string) => void;
}

export function MoveToFolderModal({
  open,
  onOpenChange,
  folders,
  currentFolderId,
  itemName,
  itemType,
  onMove
}: MoveToFolderModalProps) {
  const [selectedFolder, setSelectedFolder] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredFolders = folders.filter(folder => {
    if (folder.id === currentFolderId) return false;
    return folder.name.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const handleMove = () => {
    if (selectedFolder) {
      onMove(selectedFolder);
      setSelectedFolder('');
      setSearchQuery('');
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Move {itemType === 'note' ? 'Note' : 'Folder'}</DialogTitle>
          <DialogDescription>
            Select a folder to move "{itemName}" into
          </DialogDescription>
        </DialogHeader>
        
        <Command className="rounded-lg border">
          <CommandInput 
            placeholder="Search folders..." 
            value={searchQuery}
            onValueChange={setSearchQuery}
          />
          <CommandList>
            <CommandEmpty>No folders found.</CommandEmpty>
            <CommandGroup>
              <ScrollArea className="h-[300px]">
                <CommandItem
                  value="root"
                  onSelect={() => setSelectedFolder('')}
                  className={selectedFolder === '' ? 'bg-accent' : ''}
                >
                  <Folder className="mr-2 h-4 w-4" />
                  <span>Root (No Folder)</span>
                </CommandItem>
                {filteredFolders.map((folder) => (
                  <CommandItem
                    key={folder.id}
                    value={folder.id}
                    onSelect={() => setSelectedFolder(folder.id)}
                    className={selectedFolder === folder.id ? 'bg-accent' : ''}
                  >
                    <Folder className="mr-2 h-4 w-4" />
                    <span>{folder.name}</span>
                  </CommandItem>
                ))}
              </ScrollArea>
            </CommandGroup>
          </CommandList>
        </Command>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleMove} disabled={selectedFolder === currentFolderId}>
            Move {itemType === 'note' ? 'Note' : 'Folder'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface DeleteConfirmationProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  itemName: string;
  itemType: 'note' | 'folder';
  onConfirm: () => void;
}

export function DeleteConfirmation({
  open,
  onOpenChange,
  itemName,
  itemType,
  onConfirm
}: DeleteConfirmationProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete {itemType === 'note' ? 'Note' : 'Folder'}?</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete "{itemName}"? 
            {itemType === 'folder' && ' This will also delete all notes inside this folder.'}
            This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm} className="bg-destructive text-destructive-foreground">
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}