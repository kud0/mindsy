"use client";

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Users, Swords, Share2, Plus, ChevronRight, Loader2, Trophy, Clock, FileText } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { motion, AnimatePresence, Variants } from 'framer-motion';

interface SocialModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialTab?: 'friends' | 'battles' | 'shared';
}

interface Friend {
  id: string;
  user_id: string;
  friend_id: string;
  status: string;
  created_at: string;
  user: {
    id: string;
    full_name: string;
    email: string;
    avatar_url: string | null;
  };
}

interface PendingRequest {
  id: string;
  requester_id: string;
  addressee_id: string;
  status: string;
  created_at: string;
  user: {
    id: string;
    full_name: string;
    email: string;
    avatar_url: string | null;
  };
}

interface Battle {
  id: string;
  challenger_id: string;
  opponent_id: string;
  folder_id: string;
  status: 'pending' | 'active' | 'completed' | 'cancelled';
  current_round: number;
  total_rounds: number;
  created_at: string;
  folder_name: string;
  opponent_name: string;
  challenger_name: string;
  result?: 'won' | 'lost' | 'draw';
  your_turn?: boolean;
}

interface SharedContent {
  id: string;
  lecture_id: string;
  sender_id: string;
  recipient_id: string;
  shared_at: string;
  lecture_title: string;
  sender_name: string;
  recipient_name: string;
}

// Animation variants
const modalVariants: Variants = {
  hidden: {
    opacity: 0,
    scale: 0.95,
    y: 10,
  },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: {
      type: "spring",
      damping: 25,
      stiffness: 300,
      duration: 0.3,
    }
  },
  exit: {
    opacity: 0,
    scale: 0.95,
    y: 10,
    transition: {
      duration: 0.2,
    }
  }
};

const backdropVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { duration: 0.2 }
  },
  exit: {
    opacity: 0,
    transition: { duration: 0.2 }
  }
};

const tabContentVariants: Variants = {
  hidden: (direction: number) => ({
    opacity: 0,
    x: direction > 0 ? 20 : -20,
  }),
  visible: {
    opacity: 1,
    x: 0,
    transition: {
      type: "spring",
      damping: 30,
      stiffness: 300,
      staggerChildren: 0.05,
    }
  },
  exit: (direction: number) => ({
    opacity: 0,
    x: direction > 0 ? -20 : 20,
    transition: {
      duration: 0.2,
    }
  })
};

const listContainerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.05,
    }
  }
};

const listItemVariants: Variants = {
  hidden: {
    opacity: 0,
    y: 20,
    scale: 0.95,
  },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      type: "spring",
      damping: 25,
      stiffness: 300,
    }
  }
};

const emptyStateVariants: Variants = {
  hidden: {
    opacity: 0,
    scale: 0.9,
  },
  visible: {
    opacity: 1,
    scale: 1,
    transition: {
      type: "spring",
      damping: 20,
      stiffness: 200,
      staggerChildren: 0.1,
      delayChildren: 0.1,
    }
  }
};

const emptyIconVariants: Variants = {
  hidden: { scale: 0, rotate: -180 },
  visible: {
    scale: 1,
    rotate: 0,
    transition: {
      type: "spring",
      damping: 15,
      stiffness: 200,
    }
  }
};

const emptyTextVariants: Variants = {
  hidden: { opacity: 0, y: 10 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.3,
    }
  }
};

const loadingSpinnerVariants: Variants = {
  hidden: { opacity: 0, scale: 0.8 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: {
      type: "spring",
      damping: 20,
      stiffness: 200,
    }
  },
  exit: {
    opacity: 0,
    scale: 0.8,
    transition: {
      duration: 0.2,
    }
  }
};

export function SocialModal({ open, onOpenChange, initialTab = 'friends' }: SocialModalProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState(initialTab);
  const [previousTab, setPreviousTab] = useState(initialTab);

  // State for each tab
  const [friends, setFriends] = useState<Friend[]>([]);
  const [pendingRequests, setPendingRequests] = useState<PendingRequest[]>([]);
  const [battles, setBattles] = useState<{
    pending: Battle[];
    active: Battle[];
    completed: Battle[];
  }>({ pending: [], active: [], completed: [] });
  const [sharedContent, setSharedContent] = useState<{
    received: SharedContent[];
    sent: SharedContent[];
  }>({ received: [], sent: [] });

  const [loading, setLoading] = useState(false);
  const [showAddFriendDialog, setShowAddFriendDialog] = useState(false);
  const [friendEmail, setFriendEmail] = useState('');
  const [addingFriend, setAddingFriend] = useState(false);

  // Battle creation state
  const [showBattleDialog, setShowBattleDialog] = useState(false);
  const [selectedFriend, setSelectedFriend] = useState<Friend | null>(null);
  const [userFolders, setUserFolders] = useState<any[]>([]);
  const [selectedFolder, setSelectedFolder] = useState<string>('');
  const [creatingBattle, setCreatingBattle] = useState(false);
  const [loadingFolders, setLoadingFolders] = useState(false);
  const [folderLoadError, setFolderLoadError] = useState<string | null>(null);

  // Calculate tab direction for animations
  const getTabDirection = (fromTab: string, toTab: string) => {
    const tabs = ['friends', 'battles', 'shared'];
    const fromIndex = tabs.indexOf(fromTab);
    const toIndex = tabs.indexOf(toTab);
    return toIndex > fromIndex ? 1 : -1;
  };

  const handleTabChange = (newTab: string) => {
    setPreviousTab(activeTab);
    setActiveTab(newTab as any);
  };

  // Sync activeTab with initialTab prop changes
  useEffect(() => {
    if (open) {
      setActiveTab(initialTab);
      setPreviousTab(initialTab);
    }
  }, [open, initialTab]);

  // Fetch all data when modal opens
  useEffect(() => {
    if (open) {
      fetchAllData();
    }
  }, [open]);

  // Fetch folders when battle dialog opens
  useEffect(() => {
    if (showBattleDialog) {
      setLoadingFolders(true);
      setFolderLoadError(null);
      setUserFolders([]);
      setSelectedFolder('');

      fetch('/api/folders')
        .then(response => {
          if (!response.ok) throw new Error('Failed to fetch folders');
          return response.json();
        })
        .then(data => {
          setUserFolders(data.folders || []);
          setLoadingFolders(false);
        })
        .catch(error => {
          console.error('Failed to fetch folders:', error);
          setFolderLoadError('Failed to load folders. Please try again.');
          setLoadingFolders(false);
        });
    }
  }, [showBattleDialog]);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      const [friendsRes, battlesRes] = await Promise.all([
        fetch('/api/friends'),
        fetch('/api/battles')
      ]);

      const friendsData = friendsRes.ok ? await friendsRes.json() : { success: false };
      const battlesData = battlesRes.ok ? await battlesRes.json() : { success: false };

      // Handle friends data
      if (friendsData.success && friendsData.data) {
        setFriends(friendsData.data.friends || []);
        setPendingRequests(friendsData.data.received_requests || []);
      } else if (friendsData.friends) {
        // Legacy format without success wrapper
        setFriends(friendsData.friends || []);
        setPendingRequests(friendsData.received_requests || []);
      }

      // Handle battles data - filter by status
      if (battlesData.success && battlesData.data) {
        const allBattles = battlesData.data.battles || [];
        setBattles({
          pending: allBattles.filter((b: Battle) => b.status === 'pending'),
          active: allBattles.filter((b: Battle) => b.status === 'active'),
          completed: allBattles.filter((b: Battle) => b.status === 'completed')
        });
      } else if (battlesData.battles) {
        // Legacy format without success wrapper
        const allBattles = battlesData.battles || [];
        setBattles({
          pending: allBattles.filter((b: Battle) => b.status === 'pending'),
          active: allBattles.filter((b: Battle) => b.status === 'active'),
          completed: allBattles.filter((b: Battle) => b.status === 'completed')
        });
      }

      // Note: Shared content API not yet implemented
      // Will be added when /api/shared-content endpoint is created
    } catch (error) {
      console.error('Failed to fetch social data:', error);
      toast.error('Failed to load social data');
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptRequest = async (requestId: string) => {
    try {
      const response = await fetch('/api/friends/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId })
      });

      const data = await response.json();

      if (data.success) {
        toast.success('Friend request accepted!');
        fetchAllData(); // Refresh data
      } else {
        toast.error(data.error || 'Failed to accept request');
      }
    } catch (error) {
      console.error('Error accepting request:', error);
      toast.error('Failed to accept request');
    }
  };

  const handleRejectRequest = async (requestId: string) => {
    try {
      const response = await fetch('/api/friends/reject', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId })
      });

      const data = await response.json();

      if (data.success) {
        toast.success('Friend request rejected');
        fetchAllData(); // Refresh data
      } else {
        toast.error(data.error || 'Failed to reject request');
      }
    } catch (error) {
      console.error('Error rejecting request:', error);
      toast.error('Failed to reject request');
    }
  };

  const handleAddFriend = async () => {
    if (!friendEmail.trim()) {
      toast.error('Please enter an email address');
      return;
    }

    setAddingFriend(true);
    try {
      const response = await fetch('/api/friends/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: friendEmail })
      });

      const data = await response.json();

      if (data.success) {
        toast.success('Friend request sent!');
        setFriendEmail('');
        setShowAddFriendDialog(false);
        fetchAllData(); // Refresh data
      } else {
        toast.error(data.error || 'Failed to send friend request');
      }
    } catch (error) {
      console.error('Error adding friend:', error);
      toast.error('Failed to send friend request');
    } finally {
      setAddingFriend(false);
    }
  };

  const handleChallengeFriend = (friend: Friend) => {
    setSelectedFriend(friend);
    setShowBattleDialog(true); // Open modal immediately for instant feedback
  };

  const handleCreateBattle = async () => {
    if (!selectedFolder || !selectedFriend) return;

    setCreatingBattle(true);
    try {
      const response = await fetch('/api/battles/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          opponentId: selectedFriend.friend_id,
          folderId: selectedFolder
        })
      });

      if (response.ok) {
        toast.success('Battle challenge sent!');
        setShowBattleDialog(false);
        setSelectedFolder('');
        setSelectedFriend(null);
        fetchAllData(); // Refresh data
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to create battle');
      }
    } catch (error) {
      console.error('Failed to create battle:', error);
      toast.error('Failed to create battle');
    } finally {
      setCreatingBattle(false);
    }
  };

  const handleAcceptBattle = async (battleId: string) => {
    try {
      const response = await fetch(`/api/battles/${battleId}/accept`, {
        method: 'POST'
      });

      const data = await response.json();

      if (data.success) {
        toast.success('Battle accepted! Round 1 is ready.');
        router.push(`/dashboard/battles/${battleId}`);
        onOpenChange(false);
      } else {
        toast.error(data.error || 'Failed to accept battle');
      }
    } catch (error) {
      console.error('Error accepting battle:', error);
      toast.error('Failed to accept battle');
    }
  };

  const handleDeclineBattle = async (battleId: string) => {
    try {
      const response = await fetch(`/api/battles/${battleId}`, {
        method: 'DELETE'
      });

      const data = await response.json();

      if (data.success) {
        toast.success('Battle declined');
        fetchAllData(); // Refresh data
      } else {
        toast.error(data.error || 'Failed to decline battle');
      }
    } catch (error) {
      console.error('Error declining battle:', error);
      toast.error('Failed to decline battle');
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));

    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours}h ago`;
    if (diffInHours < 48) return 'Yesterday';
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          className={cn(
            "w-[95vw] max-w-2xl h-[85vh] overflow-hidden p-0 flex flex-col",
            "bg-white/95 dark:bg-background/90 backdrop-blur-xl dark:backdrop-blur-2xl",
            "border border-gray-200/50 dark:border-border",
            "shadow-xl dark:shadow-2xl dark:shadow-black/50"
          )}
        >
          <DialogHeader className="border-b border-gray-200/50 dark:border-gray-700/50 p-4 flex-shrink-0 bg-gray-50/80 dark:bg-gray-800/80 backdrop-blur-sm">
            <DialogTitle className="text-xl font-bold">Social</DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-hidden">
          <Tabs value={activeTab} onValueChange={handleTabChange} className="h-full flex flex-col p-4">
            <TabsList className="grid w-full grid-cols-3 bg-gray-50/80 dark:bg-gray-800/80 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 p-0.5 rounded-lg flex-shrink-0 mb-3">
              <TabsTrigger
                value="friends"
                className="data-[state=active]:bg-white/95 dark:data-[state=active]:bg-gray-900/95 data-[state=active]:backdrop-blur-xl data-[state=active]:shadow-sm rounded-md transition-all text-xs py-2"
              >
                <Users className="w-3.5 h-3.5 mr-1.5" />
                Friends
              </TabsTrigger>
              <TabsTrigger
                value="battles"
                className="data-[state=active]:bg-white/95 dark:data-[state=active]:bg-gray-900/95 data-[state=active]:backdrop-blur-xl data-[state=active]:shadow-sm rounded-md transition-all text-xs py-2"
              >
                <Swords className="w-3.5 h-3.5 mr-1.5" />
                Battles
              </TabsTrigger>
              <TabsTrigger
                value="shared"
                className="data-[state=active]:bg-white/95 dark:data-[state=active]:bg-gray-900/95 data-[state=active]:backdrop-blur-xl data-[state=active]:shadow-sm rounded-md transition-all text-xs py-2"
              >
                <Share2 className="w-3.5 h-3.5 mr-1.5" />
                Shared
              </TabsTrigger>
            </TabsList>

            <AnimatePresence mode="wait">
              {loading ? (
                <motion.div
                  key="loading"
                  variants={loadingSpinnerVariants}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  className="flex items-center justify-center py-12"
                >
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600" />
                </motion.div>
              ) : (
                <>
                  {/* FRIENDS TAB */}
                  <TabsContent value="friends" className="flex-1 overflow-y-auto space-y-4 pr-1" asChild>
                    <motion.div
                      key="friends-tab"
                      custom={getTabDirection(previousTab, activeTab)}
                      variants={tabContentVariants}
                      initial="hidden"
                      animate="visible"
                      exit="exit"
                      className="flex-1 overflow-y-auto space-y-4 pr-1"
                    >
                      {/* Pending Requests Section */}
                      {pendingRequests.length > 0 && (
                        <motion.div
                          variants={listContainerVariants}
                          initial="hidden"
                          animate="visible"
                          className="space-y-2"
                        >
                          <h3 className="text-sm font-semibold text-foreground">
                            Pending Requests ({pendingRequests.length})
                          </h3>
                          {pendingRequests.map(request => (
                            <motion.div
                              key={request.id}
                              variants={listItemVariants}
                              whileHover={{ scale: 1.01, y: -2 }}
                              className="flex items-center justify-between p-3 rounded-xl border border-gray-200/50 dark:border-gray-700/50 bg-white/5 dark:bg-gray-900/5 backdrop-blur-xl"
                            >
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <Avatar className="h-10 w-10 border-2 border-purple-200 dark:border-purple-800">
                              <AvatarFallback className="bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-900/30 dark:to-purple-900/30 text-purple-700 dark:text-purple-300">
                                {request.user.full_name.charAt(0).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{request.user.full_name}</p>
                              <p className="text-xs text-muted-foreground truncate">{request.user.email}</p>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                              <Button size="sm" onClick={() => handleAcceptRequest(request.id)}>
                                Accept
                              </Button>
                            </motion.div>
                            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                              <Button size="sm" variant="ghost" onClick={() => handleRejectRequest(request.id)}>
                                Reject
                              </Button>
                            </motion.div>
                          </div>
                        </motion.div>
                      ))}
                    </motion.div>
                  )}

                  {/* Friends List */}
                  <motion.div
                    variants={listContainerVariants}
                    initial="hidden"
                    animate="visible"
                    className="space-y-2"
                  >
                    <h3 className="text-sm font-semibold text-foreground">
                      Your Friends ({friends.length})
                    </h3>
                    {friends.length > 0 ? (
                      <div className="space-y-2">
                        {friends.map(friend => (
                          <motion.div
                            key={friend.id}
                            variants={listItemVariants}
                            whileHover={{ scale: 1.01, y: -2 }}
                            transition={{ type: "spring", damping: 20, stiffness: 300 }}
                            className="flex items-center justify-between p-3 rounded-xl border border-gray-200/50 dark:border-gray-700/50 bg-white/5 dark:bg-gray-900/5 backdrop-blur-xl hover:bg-gray-50/50 dark:hover:bg-gray-800/50 transition-colors"
                          >
                            <div className="flex items-center gap-3 flex-1 min-w-0">
                              <Avatar className="h-10 w-10 border-2 border-purple-200 dark:border-purple-800">
                                <AvatarFallback className="bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-900/30 dark:to-purple-900/30 text-purple-700 dark:text-purple-300">
                                  {friend.user.full_name.charAt(0).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate">{friend.user.full_name}</p>
                                <p className="text-xs text-muted-foreground truncate">{friend.user.email}</p>
                              </div>
                            </div>
                            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleChallengeFriend(friend)}
                                className="border-purple-200 dark:border-purple-800 hover:bg-purple-50 dark:hover:bg-purple-950/50"
                              >
                                <Swords className="w-3 h-3 mr-1" />
                                Challenge
                              </Button>
                            </motion.div>
                          </motion.div>
                        ))}
                      </div>
                    ) : (
                      <motion.div
                        variants={emptyStateVariants}
                        initial="hidden"
                        animate="visible"
                        className="flex flex-col items-center justify-center py-12 text-center rounded-xl border border-gray-200/50 dark:border-gray-700/50 bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl"
                      >
                        <motion.div variants={emptyIconVariants}>
                          <Users className="w-12 h-12 text-muted-foreground/50 mb-3" />
                        </motion.div>
                        <motion.div variants={emptyTextVariants}>
                          <p className="text-sm font-medium mb-1">No friends yet</p>
                          <p className="text-xs text-muted-foreground mb-4">
                            Add friends to share content and compete in battles
                          </p>
                        </motion.div>
                      </motion.div>
                    )}
                  </motion.div>
                    </motion.div>
                  </TabsContent>

                {/* BATTLES TAB */}
                <TabsContent value="battles" className="flex-1 overflow-y-auto space-y-4 pr-1" asChild>
                  <motion.div
                    key="battles-tab"
                    custom={getTabDirection(previousTab, activeTab)}
                    variants={tabContentVariants}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    className="flex-1 overflow-y-auto space-y-4 pr-1"
                  >
                    {/* Pending Challenges */}
                    {battles.pending.length > 0 && (
                      <motion.div
                        variants={listContainerVariants}
                        initial="hidden"
                        animate="visible"
                        className="space-y-2"
                      >
                        <h3 className="text-sm font-semibold text-foreground">
                          Pending Challenges ({battles.pending.length})
                        </h3>
                        {battles.pending.map(battle => (
                          <motion.div
                            key={battle.id}
                            variants={listItemVariants}
                            whileHover={{ scale: 1.01, y: -2 }}
                            className="p-3 rounded-xl border border-gray-200/50 dark:border-gray-700/50 bg-white/5 dark:bg-gray-900/5 backdrop-blur-xl"
                          >
                          <div className="flex items-center justify-between">
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium">{battle.challenger_name} challenged you!</p>
                              <p className="text-xs text-muted-foreground">{battle.folder_name}</p>
                            </div>
                            <div className="flex gap-2">
                              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                                <Button size="sm" onClick={() => handleAcceptBattle(battle.id)}>
                                  Accept
                                </Button>
                              </motion.div>
                              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                                <Button size="sm" variant="ghost" onClick={() => handleDeclineBattle(battle.id)}>
                                  Decline
                                </Button>
                              </motion.div>
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </motion.div>
                  )}

                  {/* Active Battles */}
                  {battles.active.length > 0 && (
                    <motion.div
                      variants={listContainerVariants}
                      initial="hidden"
                      animate="visible"
                      className="space-y-2"
                    >
                      <h3 className="text-sm font-semibold text-foreground">
                        Active Battles ({battles.active.length})
                      </h3>
                      {battles.active.map(battle => (
                        <motion.div
                          key={battle.id}
                          variants={listItemVariants}
                          whileHover={{ scale: 1.01, y: -2, x: 4 }}
                          whileTap={{ scale: 0.98 }}
                          className="p-3 rounded-xl border border-gray-200/50 dark:border-gray-700/50 bg-white/5 dark:bg-gray-900/5 backdrop-blur-xl hover:bg-gray-50/50 dark:hover:bg-gray-800/50 cursor-pointer transition-colors"
                          onClick={() => {
                            router.push(`/dashboard/battles/${battle.id}`);
                            onOpenChange(false);
                          }}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium">vs {battle.opponent_name}</p>
                              <p className="text-xs text-muted-foreground">
                                Round {battle.current_round}/{battle.total_rounds} • {battle.folder_name}
                              </p>
                            </div>
                            <ChevronRight className="w-4 h-4 text-muted-foreground" />
                          </div>
                        </motion.div>
                      ))}
                    </motion.div>
                  )}

                  {/* Battle History */}
                  {battles.completed.length > 0 && (
                    <motion.div
                      variants={listContainerVariants}
                      initial="hidden"
                      animate="visible"
                      className="space-y-2"
                    >
                      <h3 className="text-sm font-semibold text-foreground">Recent Battles</h3>
                      <div className="space-y-2 max-h-[300px] overflow-y-auto">
                        {battles.completed.map(battle => (
                          <motion.div
                            key={battle.id}
                            variants={listItemVariants}
                            whileHover={{ scale: 1.01, y: -2 }}
                            className="p-3 rounded-xl border border-gray-200/50 dark:border-gray-700/50 bg-white/5 dark:bg-gray-900/5 backdrop-blur-xl"
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium">vs {battle.opponent_name}</p>
                                <p className="text-xs text-muted-foreground truncate">{battle.folder_name}</p>
                              </div>
                              <div className={cn(
                                "text-sm font-semibold flex items-center gap-1",
                                battle.result === 'won' && "text-emerald-600 dark:text-emerald-400",
                                battle.result === 'lost' && "text-red-600 dark:text-red-400",
                                battle.result === 'draw' && "text-gray-600 dark:text-gray-400"
                              )}>
                                {battle.result === 'won' && <><Trophy className="w-3 h-3" /> Won</>}
                                {battle.result === 'lost' && <>Lost</>}
                                {battle.result === 'draw' && <>Draw</>}
                              </div>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    </motion.div>
                  )}

                  {/* Empty State */}
                  {battles.pending.length === 0 && battles.active.length === 0 && battles.completed.length === 0 && (
                    <motion.div
                      variants={emptyStateVariants}
                      initial="hidden"
                      animate="visible"
                      className="flex flex-col items-center justify-center py-12 text-center rounded-xl border border-gray-200/50 dark:border-gray-700/50 bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl"
                    >
                      <motion.div variants={emptyIconVariants}>
                        <Swords className="w-12 h-12 text-muted-foreground/50 mb-3" />
                      </motion.div>
                      <motion.div variants={emptyTextVariants}>
                        <p className="text-sm font-medium mb-1">No battles yet</p>
                        <p className="text-xs text-muted-foreground mb-4">
                          Challenge a friend to your first quiz battle!
                        </p>
                      </motion.div>
                      <motion.div
                        variants={emptyTextVariants}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        <Button
                          variant="outline"
                          onClick={() => handleTabChange('friends')}
                          className="border-purple-200 dark:border-purple-800"
                        >
                          View Friends
                        </Button>
                      </motion.div>
                    </motion.div>
                  )}
                  </motion.div>
                </TabsContent>

                {/* SHARED CONTENT TAB */}
                <TabsContent value="shared" className="flex-1 overflow-y-auto space-y-4 pr-1" asChild>
                  <motion.div
                    key="shared-tab"
                    custom={getTabDirection(previousTab, activeTab)}
                    variants={tabContentVariants}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    className="flex-1 overflow-y-auto space-y-4 pr-1"
                  >
                    {/* Received Shares */}
                    {sharedContent.received.length > 0 && (
                      <motion.div
                        variants={listContainerVariants}
                        initial="hidden"
                        animate="visible"
                        className="space-y-2"
                      >
                        <h3 className="text-sm font-semibold text-foreground">
                          Shared With You ({sharedContent.received.length})
                        </h3>
                        {sharedContent.received.map(share => (
                          <motion.div
                            key={share.id}
                            variants={listItemVariants}
                            whileHover={{ scale: 1.01, y: -2 }}
                            className="p-3 rounded-xl border border-gray-200/50 dark:border-gray-700/50 bg-white/5 dark:bg-gray-900/5 backdrop-blur-xl hover:bg-gray-50/50 dark:hover:bg-gray-800/50 transition-colors"
                          >
                          <div className="flex items-center justify-between">
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{share.lecture_title}</p>
                              <p className="text-xs text-muted-foreground">
                                from {share.sender_name} • {formatDate(share.shared_at)}
                              </p>
                            </div>
                            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  router.push(`/dashboard/lectures/${share.lecture_id}`);
                                  onOpenChange(false);
                                }}
                                className="border-purple-200 dark:border-purple-800"
                              >
                                <FileText className="w-3 h-3 mr-1" />
                                View
                              </Button>
                            </motion.div>
                          </div>
                        </motion.div>
                      ))}
                    </motion.div>
                  )}

                  {/* Your Shares */}
                  {sharedContent.sent.length > 0 && (
                    <motion.div
                      variants={listContainerVariants}
                      initial="hidden"
                      animate="visible"
                      className="space-y-2"
                    >
                      <h3 className="text-sm font-semibold text-foreground">
                        You Shared ({sharedContent.sent.length})
                      </h3>
                      {sharedContent.sent.map(share => (
                        <motion.div
                          key={share.id}
                          variants={listItemVariants}
                          whileHover={{ scale: 1.01, y: -2 }}
                          className="p-3 rounded-xl border border-gray-200/50 dark:border-gray-700/50 bg-white/5 dark:bg-gray-900/5 backdrop-blur-xl"
                        >
                          <div>
                            <p className="text-sm font-medium truncate">{share.lecture_title}</p>
                            <p className="text-xs text-muted-foreground">
                              to {share.recipient_name} • {formatDate(share.shared_at)}
                            </p>
                          </div>
                        </motion.div>
                      ))}
                    </motion.div>
                  )}

                  {/* Empty State */}
                  {sharedContent.received.length === 0 && sharedContent.sent.length === 0 && (
                    <motion.div
                      variants={emptyStateVariants}
                      initial="hidden"
                      animate="visible"
                      className="flex flex-col items-center justify-center py-12 text-center rounded-xl border border-gray-200/50 dark:border-gray-700/50 bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl"
                    >
                      <motion.div variants={emptyIconVariants}>
                        <Share2 className="w-12 h-12 text-muted-foreground/50 mb-3" />
                      </motion.div>
                      <motion.div variants={emptyTextVariants}>
                        <p className="text-sm font-medium mb-1">No shared content yet</p>
                        <p className="text-xs text-muted-foreground">
                          Share lectures with friends to help them study
                        </p>
                      </motion.div>
                    </motion.div>
                  )}
                  </motion.div>
                </TabsContent>
              </>
              )}
            </AnimatePresence>
            </Tabs>
          </div>

          {/* Fixed Footer - Add Friend Button (only visible on friends tab) */}
          <AnimatePresence>
            {activeTab === 'friends' && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                transition={{ type: "spring", damping: 25, stiffness: 300 }}
                className="border-t border-gray-200/50 dark:border-gray-700/50 p-4 flex-shrink-0 bg-gray-50/80 dark:bg-gray-800/80 backdrop-blur-sm"
              >
                <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                  <Button
                    className="w-full bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800"
                    onClick={() => setShowAddFriendDialog(true)}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Friend
                  </Button>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </DialogContent>
      </Dialog>

      {/* Add Friend Dialog */}
      <Dialog open={showAddFriendDialog} onOpenChange={setShowAddFriendDialog}>
        <DialogContent className="sm:max-w-md dark:bg-background/90 dark:backdrop-blur-2xl border-gray-200/50 dark:border-border shadow-xl dark:shadow-2xl dark:shadow-black/50">
          <DialogHeader>
            <DialogTitle>Add Friend</DialogTitle>
            <DialogDescription>
              Enter your friend's email address to send them a friend request.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                placeholder="friend@example.com"
                value={friendEmail}
                onChange={(e) => setFriendEmail(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddFriend()}
              />
            </div>
          </div>
          <DialogFooter>
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Button
                variant="outline"
                onClick={() => {
                  setShowAddFriendDialog(false);
                  setFriendEmail('');
                }}
              >
                Cancel
              </Button>
            </motion.div>
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Button onClick={handleAddFriend} disabled={addingFriend}>
                {addingFriend && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Send Request
              </Button>
            </motion.div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Battle Challenge Dialog */}
      <Dialog open={showBattleDialog} onOpenChange={setShowBattleDialog}>
        <DialogContent className="sm:max-w-md dark:bg-background/90 dark:backdrop-blur-2xl border-gray-200/50 dark:border-border shadow-xl dark:shadow-2xl dark:shadow-black/50">
          <DialogHeader>
            <DialogTitle>Challenge {selectedFriend?.user.full_name}</DialogTitle>
            <DialogDescription>
              Select a folder to create quiz questions from
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {loadingFolders ? (
              // Loading state - show spinner while fetching folders
              <div className="flex flex-col items-center justify-center py-8 space-y-3">
                <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
                <p className="text-sm text-muted-foreground">Loading your folders...</p>
              </div>
            ) : folderLoadError ? (
              // Error state - show error message with retry button
              <div className="flex flex-col items-center justify-center py-8 space-y-3">
                <div className="rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 p-4 w-full">
                  <p className="text-sm text-red-800 dark:text-red-200 text-center mb-3">
                    {folderLoadError}
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setLoadingFolders(true);
                      setFolderLoadError(null);
                      fetch('/api/folders')
                        .then(response => {
                          if (!response.ok) throw new Error('Failed to fetch folders');
                          return response.json();
                        })
                        .then(data => {
                          setUserFolders(data.folders || []);
                          setLoadingFolders(false);
                        })
                        .catch(error => {
                          console.error('Failed to fetch folders:', error);
                          setFolderLoadError('Failed to load folders. Please try again.');
                          setLoadingFolders(false);
                        });
                    }}
                    className="w-full"
                  >
                    <Loader2 className="w-4 h-4 mr-2" />
                    Retry
                  </Button>
                </div>
              </div>
            ) : (
              // Loaded state - show folder selector
              <>
                <div className="space-y-2">
                  <Label htmlFor="folder">Choose Folder</Label>
                  <select
                    id="folder"
                    value={selectedFolder}
                    onChange={(e) => setSelectedFolder(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="">Select a folder...</option>
                    {userFolders.map((folder) => (
                      <option key={folder.id} value={folder.id}>
                        {folder.folder_name} ({folder.lecture_count} lectures)
                      </option>
                    ))}
                  </select>
                </div>
                {userFolders.length === 0 && (
                  <div className="rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 p-4">
                    <p className="text-xs text-amber-800 dark:text-amber-200">
                      You need to create a folder with content first to start a battle.
                    </p>
                  </div>
                )}
              </>
            )}
          </div>
          <DialogFooter>
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Button
                variant="outline"
                onClick={() => {
                  setShowBattleDialog(false);
                  setSelectedFolder('');
                  setSelectedFriend(null);
                }}
              >
                Cancel
              </Button>
            </motion.div>
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Button
                onClick={handleCreateBattle}
                disabled={!selectedFolder || creatingBattle || loadingFolders}
                className="bg-gradient-to-r from-purple-600 to-purple-700"
              >
                {creatingBattle ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Swords className="w-4 h-4 mr-2" />
                    Send Challenge
                  </>
                )}
              </Button>
            </motion.div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
