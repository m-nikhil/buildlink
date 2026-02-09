import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useMyReferralCode, useInviteStats } from '@/hooks/useInvites';
import { Copy, Check, Share2, Users, Gift, Sparkles, Linkedin, Loader2, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface InviteFriendsCardProps {
  compact?: boolean;
}

export function InviteFriendsCard({ compact = false }: InviteFriendsCardProps) {
  const { data: referralCode, isLoading: codeLoading } = useMyReferralCode();
  const { data: stats } = useInviteStats();
  const { signOut } = useAuth();
  const [copied, setCopied] = useState(false);
  const [postContent, setPostContent] = useState<string | null>(null);
  const [isPosting, setIsPosting] = useState(false);
  const [postSuccess, setPostSuccess] = useState(false);

  const inviteUrl = referralCode 
    ? `${window.location.origin}/auth?ref=${referralCode}`
    : '';

  // Initialize post content when referralCode is available
  const defaultShareText = `Some of my best career moments started with a single conversation I almost didn't have.

That's why I'm building my network differently now — with BuildLink.

Think of it as intentional networking: You swipe through professionals who match your goals. When there's a mutual match, you have a real conversation first. If it's meaningful, you take it to LinkedIn.

No blind connection requests. No cold DMs. No hoping someone replies.

If you're tired of growing your network the old way, try this:
${inviteUrl}`;

  // Get the current share text (user-edited or default)
  const getShareText = () => postContent ?? defaultShareText;

  const handleCopyLink = async () => {
    if (!inviteUrl) return;
    
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      toast.success('Invite link copied to clipboard!');
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast.error('Failed to copy link');
    }
  };

  const handleShare = async () => {
    if (!inviteUrl) return;

    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Join BuildLink',
          text: 'Connect with professionals who share your goals. Join me on BuildLink!',
          url: inviteUrl,
        });
      } catch (error) {
        // User cancelled or share failed, fallback to copy
        handleCopyLink();
      }
    } else {
      handleCopyLink();
    }
  };

  const handlePostToLinkedIn = async () => {
    if (!inviteUrl) return;
    
    setIsPosting(true);
    const shareText = getShareText();
    
    try {
      const { data, error } = await supabase.functions.invoke('linkedin-share', {
        body: { text: shareText },
      });

      // Check data first - even on error status, data may contain useful info
      if (data?.requiresReauth) {
        toast.error(data.message || 'Please log out and log back in to connect LinkedIn.', {
          action: {
            label: 'Log out',
            onClick: () => signOut(),
          },
          duration: 10000,
        });
        return;
      }

      if (error) {
        throw new Error(error.message);
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      setPostSuccess(true);
      toast.success('Posted to LinkedIn! 🎉', { duration: 5000 });
    } catch (error) {
      console.error('LinkedIn post error:', error);
      toast.error('Failed to post to LinkedIn. Please try again.');
    } finally {
      setIsPosting(false);
    }
  };

  if (compact) {
    return (
      <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-accent/5">
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-primary/10 rounded-full">
              <Gift className="h-6 w-6 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold">Invite Friends</h3>
              <p className="text-sm text-muted-foreground">
                Grow the network, find more matches
              </p>
            </div>
            <Button onClick={handleShare} className="gap-2 shrink-0">
              <Share2 className="h-4 w-4" />
              Share
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-primary/20">
      <CardHeader className="text-center pb-4">
        <div className="mx-auto p-4 bg-gradient-to-br from-primary/20 to-accent/20 rounded-full w-fit mb-4">
          <Users className="h-10 w-10 text-primary" />
        </div>
        <CardTitle className="text-2xl">Invite Friends to BuildLink</CardTitle>
        <CardDescription className="max-w-md mx-auto">
          The more people join, the better your chances of finding great matches!
          Share your personal invite link.
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Stats */}
        {stats && stats.accepted > 0 && (
          <div className="flex justify-center">
            <Badge variant="secondary" className="gap-2 px-4 py-2">
              <Sparkles className="h-4 w-4" />
              {stats.accepted} friend{stats.accepted !== 1 ? 's' : ''} joined via your link!
            </Badge>
          </div>
        )}

        {/* Invite Link */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Your invite link</label>
          <div className="flex gap-2">
            {codeLoading ? (
              <Skeleton className="h-10 flex-1" />
            ) : (
              <div className="flex-1 font-mono text-sm bg-muted/50 rounded-md border px-3 py-2 truncate">
                {inviteUrl}
              </div>
            )}
            <Button 
              variant="outline" 
              size="icon"
              onClick={handleCopyLink}
              disabled={!referralCode}
            >
              {copied ? (
                <Check className="h-4 w-4 text-primary" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>

        {/* Success State */}
        {postSuccess ? (
          <div className="space-y-4">
            <div className="flex flex-col items-center gap-3 py-6 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-900">
              <div className="p-3 bg-green-100 dark:bg-green-900/50 rounded-full">
                <CheckCircle2 className="h-8 w-8 text-green-600 dark:text-green-400" />
              </div>
              <div className="text-center">
                <p className="font-semibold text-green-700 dark:text-green-300">Posted to LinkedIn!</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Your post is now live on your LinkedIn feed
                </p>
              </div>
            </div>
            <Button 
              variant="outline"
              onClick={() => setPostSuccess(false)} 
              className="w-full"
            >
              Post again
            </Button>
          </div>
        ) : (
          <>
            {/* Editable Post */}
            {referralCode && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Your LinkedIn post</label>
                <Textarea
                  value={postContent ?? defaultShareText}
                  onChange={(e) => setPostContent(e.target.value)}
                  className="min-h-[200px] text-sm resize-none"
                  placeholder="Write your LinkedIn post..."
                />
              </div>
            )}

            {/* Action Buttons */}
            <div className="space-y-3">
              <Button 
                onClick={handlePostToLinkedIn} 
                className="w-full gap-2"
                size="lg"
                disabled={!referralCode || isPosting}
                style={{ backgroundColor: 'hsl(201, 100%, 35%)' }}
              >
                {isPosting ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Linkedin className="h-5 w-5" />
                )}
                {isPosting ? 'Posting...' : 'Post on LinkedIn'}
              </Button>

              <Button 
                onClick={handleShare} 
                variant="outline"
                className="w-full gap-2"
                size="lg"
                disabled={!referralCode}
              >
                <Share2 className="h-5 w-5" />
                Share via other apps
              </Button>
            </div>
          </>
        )}

      </CardContent>
    </Card>
  );
}
