"use client";

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';

type HierarchyType = 'course' | 'year' | 'subject' | 'semester' | 'custom';

interface StudyNode {
  id: string;
  user_id: string;
  parent_id: string | null;
  name: string;
  type: HierarchyType;
  description: string | null;
  color: string | null;
  icon: string | null;
  sort_order: number;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  children?: StudyNode[];
  note_count?: number;
}

interface FlattenedFolder {
  id: string;
  name: string;
  path: string; // Full path like "Computer Science / 2024 / Data Structures"
  type: HierarchyType;
  level: number;
}

export function useStudyFolders() {
  const [folders, setFolders] = useState<FlattenedFolder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Build hierarchy from flat array
  const buildHierarchy = (nodes: StudyNode[]): StudyNode[] => {
    const nodeMap = new Map(nodes.map(node => [node.id, { ...node, children: [] }]));
    const rootNodes: StudyNode[] = [];

    for (const node of nodeMap.values()) {
      if (node.parent_id && nodeMap.has(node.parent_id)) {
        nodeMap.get(node.parent_id)!.children!.push(node);
      } else {
        rootNodes.push(node);
      }
    }

    // Sort each level
    const sortNodes = (nodes: StudyNode[]) => {
      nodes.sort((a, b) => a.sort_order - b.sort_order);
      nodes.forEach(node => {
        if (node.children) sortNodes(node.children);
      });
    };
    sortNodes(rootNodes);

    return rootNodes;
  };

  // Flatten hierarchy for dropdown
  const flattenNodes = (nodes: StudyNode[], parentPath = '', level = 0): FlattenedFolder[] => {
    const result: FlattenedFolder[] = [];
    
    for (const node of nodes) {
      const currentPath = parentPath ? `${parentPath} / ${node.name}` : node.name;
      
      result.push({
        id: node.id,
        name: node.name,
        path: currentPath,
        type: node.type,
        level
      });
      
      if (node.children && node.children.length > 0) {
        result.push(...flattenNodes(node.children, currentPath, level + 1));
      }
    }
    
    return result;
  };

  const fetchStudyFolders = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setError('User not authenticated');
        return;
      }

      const { data: studyNodes, error: fetchError } = await supabase
        .from('study_nodes')
        .select('*')
        .eq('user_id', user.id)
        .order('sort_order', { ascending: true });

      if (fetchError) {
        setError(fetchError.message);
        return;
      }

      const hierarchicalNodes = buildHierarchy(studyNodes || []);
      const flattenedFolders = flattenNodes(hierarchicalNodes);
      
      setFolders(flattenedFolders);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load study folders');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudyFolders();
  }, []);

  return { folders, loading, error, refetch: fetchStudyFolders };
}