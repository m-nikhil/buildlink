import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useMyReferralCode, useInviteStats } from '@/hooks/useInvites';
import { Copy, Check, Share2, Users, Gift, Sparkles, Linkedin } from 'lucide-react';
import { toast } from 'sonner';

interface InviteFriendsCardProps {
  compact?: boolean;
}

export function InviteFriendsCard({ compact = false }: InviteFriendsCardProps) {
  const { data: referralCode, isLoading: codeLoading } = useMyReferralCode();
  const { data: stats } = useInviteStats();
  const [copied, setCopied] = useState(false);

  const inviteUrl = referralCode 
    ? `${window.location.origin}/auth?ref=${referralCode}`
    : '';

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

  const handleShareToLinkedIn = async () => {
    if (!inviteUrl) return;
    
    // Emotional, compelling message with the invite link included
    const shareText = `Some of my best career moments started with a single conversation I almost didn't have.

That's why I'm building my network differently now — with BuildLink.

Think of it as intentional networking: You swipe through professionals who match your goals. When there's a mutual match, you have a real conversation first. If it's meaningful, you take it to LinkedIn.

No blind connection requests. No cold DMs. No hoping someone replies.

Just real conversations with people who actually get what you're after — before you ever hit "connect."

If you're tired of growing your network the old way, try this:
${inviteUrl}

Your next opportunity might be one swipe away. 🤝`;
    
    // Copy text to clipboard first
    try {
      await navigator.clipboard.writeText(shareText);
      toast.success('Post copied! Paste it in LinkedIn (Cmd+V)', { duration: 5000 });
    } catch (error) {
      console.log('Clipboard failed, opening LinkedIn anyway');
    }
    
    // Open LinkedIn - just to create a new post (not using share URL since we have the full text)
    window.open('https://www.linkedin.com/feed/?shareActive=true', '_blank', 'width=700,height=700');
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
        <div className="space-y-3">
          <label className="text-sm font-medium">Your invite link</label>
          <div className="flex gap-2">
            {codeLoading ? (
              <Skeleton className="h-10 flex-1" />
            ) : (
              <Input 
                readOnly 
                value={inviteUrl}
                className="font-mono text-sm bg-muted/50"
              />
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

        {/* Share Buttons */}
        <div className="flex gap-2">
          <Button 
            onClick={handleShareToLinkedIn} 
            className="flex-1 gap-2"
            size="lg"
            disabled={!referralCode}
            style={{ backgroundColor: 'hsl(201, 100%, 35%)' }}
          >
            <Linkedin className="h-5 w-5" />
            Share on LinkedIn
          </Button>
          <Button 
            onClick={handleShare} 
            variant="outline"
            size="lg"
            disabled={!referralCode}
          >
            <Share2 className="h-5 w-5" />
          </Button>
        </div>

        {/* Benefits */}
        <div className="bg-muted/50 rounded-lg p-4 space-y-3">
          <p className="text-sm font-medium text-center">Why invite friends?</p>
          <div className="grid gap-2 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 bg-primary rounded-full" />
              More users means more Weekly Intro matches
            </div>
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 bg-primary rounded-full" />
              Connect with people in your network
            </div>
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 bg-primary rounded-full" />
              Help your friends find meaningful connections
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
