import { useState, useRef, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Send, Linkedin, AlertCircle } from 'lucide-react';
import { useMessages, useSendMessage, useMessageCount } from '@/hooks/useMessages';
import { useProfile } from '@/hooks/useProfile';
import { Profile } from '@/types/profile';
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
  const sendMessage = useSendMessage();
  const messageCount = useMessageCount(connectionId);
  const scrollRef = useRef<HTMLDivElement>(null);
  
  const remainingMessages = MAX_MESSAGES - messageCount;
  const isLimitReached = remainingMessages <= 0;

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
            <div>
              <p className="font-semibold">{otherProfile.full_name || 'Anonymous'}</p>
              <p className="text-xs text-muted-foreground font-normal">{otherProfile.headline}</p>
            </div>
          </DialogTitle>
        </DialogHeader>

        {/* Message count indicator */}
        <div className="px-4 py-2 bg-muted/50 text-center text-sm">
          {isLimitReached ? (
            <span className="text-destructive flex items-center justify-center gap-1">
              <AlertCircle className="h-4 w-4" />
              Message limit reached
            </span>
          ) : (
            <span className="text-muted-foreground">
              {remainingMessages} messages remaining
            </span>
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

        {/* LinkedIn CTA when limit reached */}
        {isLimitReached && otherProfile.linkedin_url && (
          <div className="p-4 border-t bg-muted/50">
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-3">
                Continue the conversation on LinkedIn!
              </p>
              <Button asChild className="gap-2">
                <a href={otherProfile.linkedin_url} target="_blank" rel="noopener noreferrer">
                  <Linkedin className="h-4 w-4" />
                  View LinkedIn Profile
                </a>
              </Button>
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
