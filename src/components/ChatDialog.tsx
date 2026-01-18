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
  
  const isRequester = connection?.requester_id === myProfile?.id;
  const myLinkedInRequested = isRequester 
    ? connection?.requester_linkedin_requested 
    : connection?.recipient_linkedin_requested;
  const theirLinkedInRequested = isRequester 
    ? connection?.recipient_linkedin_requested 
    : connection?.requester_linkedin_requested;
  
  const isMutualLinkedIn = myLinkedInRequested && theirLinkedInRequested;

  const initials = otherProfile.full_name
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
            <div className="flex-1">
              {isMutualLinkedIn ? (
                <>
                  <p className="font-semibold">{otherProfile.full_name || 'Anonymous'}</p>
                  <p className="text-xs text-muted-foreground font-normal">{otherProfile.headline}</p>
                </>
              ) : (
                <>
                  <p className="font-semibold">{initials}</p>
                  <p className="text-xs text-muted-foreground font-normal">{otherProfile.headline}</p>
                </>
              )}
            </div>
            {isMutualLinkedIn && otherProfile.linkedin_url && (
              <Button asChild variant="outline" size="sm" className="gap-1">
                <a href={otherProfile.linkedin_url} target="_blank" rel="noopener noreferrer">
                  <Linkedin className="h-4 w-4" />
                  Connect
                </a>
              </Button>
            )}
          </DialogTitle>
        </DialogHeader>

        {/* Status indicators */}
        <div className="px-4 py-2 bg-muted/50 space-y-1">
          <div className="flex items-center justify-between text-sm">
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
            
            {/* LinkedIn request button */}
            {!myLinkedInRequested ? (
              <Button 
                variant="outline" 
                size="sm" 
                className="gap-1 h-7 text-xs"
                onClick={handleRequestLinkedIn}
                disabled={requestLinkedIn.isPending}
              >
                <Linkedin className="h-3 w-3" />
                Request LinkedIn
              </Button>
            ) : !isMutualLinkedIn ? (
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Check className="h-3 w-3 text-green-500" />
                LinkedIn requested
              </span>
            ) : null}
          </div>
          
          {/* Mutual LinkedIn notification */}
          {isMutualLinkedIn && (
            <div className="text-xs text-green-600 bg-green-50 dark:bg-green-950/30 rounded px-2 py-1 text-center">
              🎉 Mutual LinkedIn connection! You can now see each other's full profiles.
            </div>
          )}
          
          {/* Waiting for them notification */}
          {myLinkedInRequested && !theirLinkedInRequested && (
            <div className="text-xs text-muted-foreground text-center">
              Waiting for them to also request LinkedIn connection...
            </div>
          )}
          
          {/* They requested notification */}
          {!myLinkedInRequested && theirLinkedInRequested && (
            <div className="text-xs text-primary bg-primary/10 rounded px-2 py-1 text-center">
              They want to connect on LinkedIn! Request to reveal profiles.
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
                const isMe = msg.sender_id === myProfile?.id;
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
                          : "bg-muted rounded-bl-md"
                      )}
                    >
                      <p className="text-sm">{msg.content}</p>
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