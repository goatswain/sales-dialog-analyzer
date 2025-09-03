import React, { useState, useEffect } from 'react';
import { useAuth } from '@/components/AuthGuard';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Plus, Users, Crown } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import TopBar from '@/components/TopBar';
import BottomNavigation from '@/components/BottomNavigation';
import { useSubscription } from '@/hooks/useSubscription';

interface Group {
  id: string;
  name: string;
  creator_id: string;
  created_at: string;
  member_count: number;
  user_role: string;
}

const Groups = () => {
  const { user } = useAuth();
  const { subscriptionData } = useSubscription();
  const navigate = useNavigate();
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [creating, setCreating] = useState(false);

  const isProUser = subscriptionData?.subscribed || false;

  useEffect(() => {
    if (user) {
      fetchGroups();
    }
  }, [user]);

  const fetchGroups = async () => {
    try {
      console.log('Starting fetchGroups with user:', user?.id);
      
      // First get the user's group memberships
      const { data: membershipData, error: membershipError } = await supabase
        .from('group_members')
        .select('group_id, role')
        .eq('user_id', user?.id);

      console.log('Membership query result:', { membershipData, membershipError });

      if (membershipError) throw membershipError;

      if (!membershipData || membershipData.length === 0) {
        console.log('No memberships found, setting empty groups array');
        setGroups([]);
        return;
      }

      // Get the group IDs the user belongs to
      const groupIds = membershipData.map(m => m.group_id);
      console.log('Group IDs found:', groupIds);

      // Get the group details for those IDs
      const { data: groupsData, error: groupsError } = await supabase
        .from('groups')
        .select('id, name, creator_id, created_at')
        .in('id', groupIds);

      console.log('Groups query result:', { groupsData, groupsError });

      if (groupsError) throw groupsError;

      // Get member counts for each group
      const groupsWithCounts = await Promise.all(
        groupsData.map(async (group) => {
          const { count } = await supabase
            .from('group_members')
            .select('*', { count: 'exact', head: true })
            .eq('group_id', group.id);

          // Find the user's role in this group
          const userMembership = membershipData.find(m => m.group_id === group.id);

          return {
            id: group.id,
            name: group.name,
            creator_id: group.creator_id,
            created_at: group.created_at,
            member_count: count || 0,
            user_role: userMembership?.role || 'member'
          };
        })
      );

      console.log('Final groups with counts:', groupsWithCounts);
      setGroups(groupsWithCounts);
    } catch (error) {
      console.error('Error fetching groups:', error);
      toast({
        title: 'Error',
        description: 'Failed to load groups',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const createGroup = async () => {
    if (!newGroupName.trim()) return;

    setCreating(true);
    try {
      console.log('Creating group with user ID:', user?.id);
      console.log('User object:', user);
      console.log('Group name:', newGroupName.trim());
      
      // First, let's verify the current session  
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      console.log('Current session:', sessionData);
      console.log('Session error:', sessionError);
      
      if (sessionError || !sessionData.session) {
        throw new Error('No valid session found');
      }

      // Test auth context
      try {
        const { data: authTest } = await supabase.rpc('test_auth_context');
        console.log('Auth context test:', authTest);
      } catch (error) {
        console.error('Auth context test failed:', error);
      }

      console.log('About to insert with data:', {
        name: newGroupName.trim(),
        creator_id: user?.id
      });

      // Create group using the safe function that bypasses RLS issues
      const { data: group, error: groupError } = await supabase
        .rpc('create_group_safe', {
          group_name: newGroupName.trim(),
          creator_user_id: user?.id
        });

      console.log('Function result:', { group, groupError });

      if (groupError) {
        console.error('Group creation failed:', groupError);
        throw groupError;
      }

      console.log('Group created successfully:', group);
      
      // The function returns an array, so get the first item
      const createdGroup = Array.isArray(group) ? group[0] : group;
      
      if (!createdGroup) {
        throw new Error('No group returned from function');
      }
      
      console.log('Group and member creation completed successfully');

      toast({
        title: 'Success',
        description: 'Group created successfully'
      });

      setNewGroupName('');
      setIsCreateDialogOpen(false);
      
      // Add a small delay to ensure the database transaction is committed
      setTimeout(() => {
        fetchGroups();
      }, 100);
    } catch (error) {
      console.error('Error creating group:', error);
      toast({
        title: 'Error',
        description: 'Failed to create group',
        variant: 'destructive'
      });
    } finally {
      setCreating(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background font-roboto pb-16">
      <TopBar isProUser={isProUser} />
      
      <div className="container mx-auto p-4 max-w-2xl">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Groups</h1>
            <p className="text-muted-foreground text-sm mt-1">
              Collaborate with your team
            </p>
          </div>
        
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Create Group
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Group</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">
                  Group Name
                </label>
                <Input
                  placeholder="e.g., Roofing Team Edmonton"
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && createGroup()}
                />
              </div>
              <div className="flex gap-2 justify-end">
                <Button
                  variant="outline"
                  onClick={() => setIsCreateDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={createGroup}
                  disabled={!newGroupName.trim() || creating}
                >
                  {creating ? 'Creating...' : 'Create Group'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

        <div className="space-y-3">
          {groups.map((group) => (
            <Card 
              key={group.id} 
              className="hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => navigate(`/groups/${group.id}`)}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-medium text-foreground">{group.name}</h3>
                  {group.user_role === 'creator' && (
                    <Crown className="h-4 w-4 text-primary" />
                  )}
                </div>
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    {group.member_count} members
                  </div>
                  <Badge variant="secondary" className="text-xs">
                    {group.user_role}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Created {new Date(group.created_at).toLocaleDateString()}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        {groups.length === 0 && (
          <div className="text-center py-12">
            <Users className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">
              No groups yet
            </h3>
            <p className="text-muted-foreground mb-4 text-sm">
              Create your first team group to start collaborating
            </p>
            <Button onClick={() => setIsCreateDialogOpen(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              Create Your First Group
            </Button>
          </div>
        )}
      </div>

      <BottomNavigation />
    </div>
  );
};

export default Groups;