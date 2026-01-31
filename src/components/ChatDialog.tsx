import { useState, useRef, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

import { Send, Linkedin, AlertCircle, Check } from 'lucide-react';
import { useMessages, useSendMessage, useMessageCount } from '@/hooks/useMessages';
import { useProfile } from '@/hooks/useProfile';
import { useConnections, useRequestLinkedIn } from '@/hooks/useConnections';
import { Profile, Connection } from '@/types/profile';
import { cn } from '@/lib/utils';

const MAX_MESSAGES = 50;

interface ChatDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  connectionId: string;
  otherProfile: Profile;
}

export function ChatDialog({ open, onOpenChange, connectionId, otherProfile }: ChatDialogProps) {
  const [message, setMessage] = useState('');
  const { data: messages, isLoading } = useMessages(connectionId);
  const { data: myProfile } = useProfile();
  const { data: connections } = useConnections();
  const sendMessage = useSendMessage();
  const requestLinkedIn = useRequestLinkedIn();
  const messageCount = useMessageCount(connectionId);
  const scrollRef = useRef<HTMLDivElement>(null);
  
  const remainingMessages = MAX_MESSAGES - messageCount;
  const isLimitReached = remainingMessages <= 0;

  // Find the connection to check LinkedIn request status
  const connection = connections?.find(c => c.id === connectionId) as Connection | undefined;
  
  const isRequester = connection?.requester_id === myProfile?.user_id;
  const myLinkedInRequested = isRequester 
    ? connection?.requester_linkedin_requested 
    : connection?.recipient_linkedin_requested;
  const theirLinkedInRequested = isRequester 
    ? connection?.recipient_linkedin_requested 
    : connection?.requester_linkedin_requested;
  
  const isMutualLinkedIn = myLinkedInRequested && theirLinkedInRequested;

  // Use stored initials, fallback to computing
  const initials = otherProfile.initials || otherProfile.full_name
    ?.split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase() || '?';

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!message.trim() || isLimitReached) return;
    
    await sendMessage.mutateAsync({ connectionId, content: message.trim() });
    setMessage('');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleRequestLinkedIn = () => {
    requestLinkedIn.mutate(connectionId);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md h-[600px] flex flex-col p-0">
        <DialogHeader className="p-4 border-b">
          <DialogTitle className="flex items-center gap-3">
            <Avatar className="h-10 w-10">
              <AvatarImage src={otherProfile.avatar_url ?? undefined} />
              <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              {isMutualLinkedIn ? (
                <>
                  <p className="font-semibold truncate">{otherProfile.full_name || 'Anonymous'}</p>
                  <p className="text-xs text-muted-foreground font-normal truncate">{otherProfile.headline}</p>
                </>
              ) : (
                <>
                  <p className="font-semibold">{initials}</p>
                  <p className="text-xs text-muted-foreground font-normal truncate">{otherProfile.headline}</p>
                </>
              )}
            </div>
          </DialogTitle>
        </DialogHeader>

        {/* Chat View - Status indicators */}
        <div className="px-4 py-3 bg-muted/50 space-y-2">
          {/* Message count */}
          <div className="flex items-center justify-center text-sm">
            {isLimitReached ? (
              <span className="text-destructive flex items-center gap-1">
                <AlertCircle className="h-4 w-4" />
                Message limit reached
              </span>
            ) : (
              <span className="text-muted-foreground">
                {remainingMessages} messages remaining
              </span>
            )}
          </div>
          
          {/* LinkedIn request flow */}
          {!isMutualLinkedIn && (
            <>
              {/* They requested, I haven't - show Accept button */}
              {!myLinkedInRequested && theirLinkedInRequested && (
                <div className="flex flex-col items-center gap-3 py-4 px-4 rounded-xl bg-gradient-to-br from-[#0A66C2]/10 to-[#0A66C2]/5 border border-[#0A66C2]/20">
                  <div className="flex items-center gap-2 text-[#0A66C2]">
                    <Linkedin className="h-5 w-5" />
                    <span className="font-semibold">They want to connect on LinkedIn!</span>
                  </div>
                  <p className="text-sm text-muted-foreground text-center">
                    Accept to reveal both profiles
                  </p>
                  <Button 
                    className="w-full gap-2 bg-[#0A66C2] hover:bg-[#004182] text-white"
                    onClick={handleRequestLinkedIn}
                    disabled={requestLinkedIn.isPending}
                  >
                    <Check className="h-5 w-5" />
                    Accept LinkedIn Request
                  </Button>
                </div>
              )}

              {/* I haven't requested, they haven't either - show Request button */}
              {!myLinkedInRequested && !theirLinkedInRequested && (
                <Button 
                  variant="default"
                  className="w-full gap-2 bg-[#0A66C2] hover:bg-[#004182] text-white"
                  onClick={handleRequestLinkedIn}
                  disabled={requestLinkedIn.isPending}
                >
                  <Linkedin className="h-5 w-5" />
                  Request LinkedIn Connection
                </Button>
              )}

              {/* I requested, they haven't - show waiting state */}
              {myLinkedInRequested && !theirLinkedInRequested && (
                <div className="flex flex-col items-center gap-3 py-4 px-4 rounded-xl bg-gradient-to-br from-[#0A66C2]/10 to-[#0A66C2]/5 border border-[#0A66C2]/20">
                  <div className="flex items-center gap-2 text-[#0A66C2]">
                    <div className="h-8 w-8 rounded-full bg-[#0A66C2]/20 flex items-center justify-center">
                      <Check className="h-5 w-5" />
                    </div>
                    <span className="font-semibold">LinkedIn Request Sent!</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <div className="flex gap-1">
                      <span className="h-2 w-2 rounded-full bg-[#0A66C2] animate-pulse" />
                      <span className="h-2 w-2 rounded-full bg-[#0A66C2]/60 animate-pulse [animation-delay:150ms]" />
                      <span className="h-2 w-2 rounded-full bg-[#0A66C2]/30 animate-pulse [animation-delay:300ms]" />
                    </div>
                    <span>Waiting for their response</span>
                  </div>
                </div>
              )}
            </>
          )}
          
          {/* Mutual LinkedIn - show profile details */}
          {isMutualLinkedIn && (
            <div className="flex items-center justify-between gap-3 px-4 py-3 bg-green-50 dark:bg-green-950/30 rounded-lg border border-green-200 dark:border-green-800">
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={otherProfile.avatar_url ?? undefined} />
                  <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-semibold">{otherProfile.full_name}</p>
                  <p className="text-xs text-muted-foreground">{otherProfile.headline}</p>
                </div>
              </div>
              {otherProfile.linkedin_url && (
                <Button asChild size="sm" className="gap-2 bg-[#0A66C2] hover:bg-[#004182] text-white">
                  <a href={otherProfile.linkedin_url} target="_blank" rel="noopener noreferrer">
                    <Linkedin className="h-4 w-4" />
                    View Profile
                  </a>
                </Button>
              )}
            </div>
          )}
        </div>

        <ScrollArea className="flex-1 p-4" ref={scrollRef}>
          <div className="space-y-4">
            {isLoading ? (
              <div className="text-center text-muted-foreground">Loading messages...</div>
            ) : messages?.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">
                <p>Start the conversation!</p>
                <p className="text-xs mt-1">You have {MAX_MESSAGES} messages to get to know each other.</p>
                <p className="text-xs mt-1">Request LinkedIn connection anytime to reveal full profiles.</p>
              </div>
            ) : (
              messages?.map((msg) => {
                const isMe = msg.sender_id === myProfile?.user_id;
                const messageTime = new Date(msg.created_at).toLocaleTimeString([], { 
                  hour: '2-digit', 
                  minute: '2-digit' 
                });
                return (
                  <div
                    key={msg.id}
                    className={cn(
                      "flex",
                      isMe ? "justify-end" : "justify-start"
                    )}
                  >
                    <div
                      className={cn(
                        "max-w-[80%] px-4 py-2 rounded-2xl",
                        isMe
                          ? "bg-primary text-primary-foreground rounded-br-md"
                          : "bg-secondary text-secondary-foreground rounded-bl-md"
                      )}
                    >
                      <p className="text-sm">{msg.content}</p>
                      <p className={cn(
                        "text-[10px] mt-1",
                        isMe ? "text-primary-foreground/70" : "text-muted-foreground"
                      )}>
                        {messageTime}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </ScrollArea>

        {/* Limit reached CTA */}
        {isLimitReached && !isMutualLinkedIn && (
          <div className="p-4 border-t bg-muted/50">
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-3">
                Message limit reached. Request LinkedIn to continue!
              </p>
              {!myLinkedInRequested && (
                <Button 
                  className="gap-2"
                  onClick={handleRequestLinkedIn}
                  disabled={requestLinkedIn.isPending}
                >
                  <Linkedin className="h-4 w-4" />
                  Request LinkedIn Connection
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Message input */}
        {!isLimitReached && (
          <div className="p-4 border-t">
            <div className="flex gap-2">
              <Input
                placeholder="Type a message..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                disabled={sendMessage.isPending}
              />
              <Button 
                onClick={handleSend} 
                disabled={!message.trim() || sendMessage.isPending}
                size="icon"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}