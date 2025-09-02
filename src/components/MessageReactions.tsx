import React, { useState, useEffect } from 'react';
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from '@/components/AuthGuard';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';

interface Reaction {
  id: string;
  reaction_type: string;
  user_id: string;
  created_at: string;
  profiles?: {
    display_name?: string;
    email: string;
    avatar_url?: string;
  };
}

interface MessageReactionsProps {
  messageId: string;
  className?: string;
}

const REACTION_TYPES = ['👍', '🔥', '💡', '❓'];

export const MessageReactions: React.FC<MessageReactionsProps> = ({ messageId, className }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [reactions, setReactions] = useState<Reaction[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchReactions();
    
    // Set up real-time subscription for reactions
    const channel = supabase
      .channel(`message_reactions_${messageId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'group_message_reactions',
        filter: `message_id=eq.${messageId}`
      }, () => {
        fetchReactions();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [messageId]);

  const fetchReactions = async () => {
    try {
      const { data, error } = await supabase
        .from('group_message_reactions')
        .select(`
          id,
          reaction_type,
          user_id,
          created_at
        `)
        .eq('message_id', messageId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      // Get profile information for each reaction
      const reactionsWithProfiles = await Promise.all(
        (data || []).map(async (reaction) => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('display_name, email, avatar_url')
            .eq('user_id', reaction.user_id)
            .single();

          return {
            ...reaction,
            profiles: profile || { email: 'Unknown', display_name: null, avatar_url: null }
          };
        })
      );

      setReactions(reactionsWithProfiles);
    } catch (error) {
      console.error('Error fetching reactions:', error);
    }
  };

  const toggleReaction = async (reactionType: string) => {
    if (!user) return;

    setLoading(true);
    try {
      const existingReaction = reactions.find(
        r => r.user_id === user.id && r.reaction_type === reactionType
      );

      if (existingReaction) {
        // Remove reaction
        const { error } = await supabase
          .from('group_message_reactions')
          .delete()
          .eq('id', existingReaction.id);

        if (error) throw error;
      } else {
        // Add reaction
        const { error } = await supabase
          .from('group_message_reactions')
          .insert({
            message_id: messageId,
            user_id: user.id,
            reaction_type: reactionType
          });

        if (error) throw error;
      }
    } catch (error) {
      console.error('Error toggling reaction:', error);
      toast({
        title: 'Error',
        description: 'Failed to update reaction',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const getReactionCounts = () => {
    const counts: Record<string, { count: number; users: Reaction[] }> = {};
    
    reactions.forEach(reaction => {
      if (!counts[reaction.reaction_type]) {
        counts[reaction.reaction_type] = { count: 0, users: [] };
      }
      counts[reaction.reaction_type].count++;
      counts[reaction.reaction_type].users.push(reaction);
    });

    return counts;
  };

  const getUserReactions = () => {
    if (!user) return [];
    return reactions
      .filter(r => r.user_id === user.id)
      .map(r => r.reaction_type);
  };

  const reactionCounts = getReactionCounts();
  const userReactions = getUserReactions();

  return (
    <div className={`flex items-center gap-1 mt-2 ${className}`}>
      {/* Reaction buttons */}
      <div className="flex gap-1">
        {REACTION_TYPES.map(reactionType => {
          const hasReacted = userReactions.includes(reactionType);
          const count = reactionCounts[reactionType]?.count || 0;
          
          return (
            <Button
              key={reactionType}
              size="sm"
              variant={hasReacted ? "default" : "ghost"}
              className="h-7 px-2 text-sm hover:bg-accent"
              onClick={() => toggleReaction(reactionType)}
              disabled={loading}
            >
              {reactionType}
              {count > 0 && <span className="ml-1 text-xs">{count}</span>}
            </Button>
          );
        })}
      </div>

      {/* Show reaction counts with user details */}
      {Object.entries(reactionCounts).length > 0 && (
        <div className="flex gap-1 ml-2">
          {Object.entries(reactionCounts).map(([reactionType, { count, users }]) => (
            <Popover key={reactionType}>
              <PopoverTrigger asChild>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-6 px-2 text-xs cursor-pointer hover:bg-accent"
                >
                  {reactionType} {count}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-64 p-3">
                <div className="space-y-2">
                  <h4 className="font-medium text-sm">
                    {reactionType} {count} {count === 1 ? 'reaction' : 'reactions'}
                  </h4>
                  <div className="space-y-2">
                    {users.map(user => (
                      <div key={user.id} className="flex items-center gap-2">
                        <Avatar className="h-6 w-6">
                          <AvatarFallback className="text-xs">
                            {user.profiles?.email?.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm">
                          {user.profiles?.display_name || user.profiles?.email?.split('@')[0] || 'Unknown'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          ))}
        </div>
      )}
    </div>
  );
};

export default MessageReactions;