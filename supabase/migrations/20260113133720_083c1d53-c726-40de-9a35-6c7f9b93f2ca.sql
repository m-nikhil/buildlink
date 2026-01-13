-- Create messages table
CREATE TABLE public.messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  connection_id UUID NOT NULL REFERENCES public.connections(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for faster queries
CREATE INDEX idx_messages_connection_id ON public.messages(connection_id);
CREATE INDEX idx_messages_created_at ON public.messages(created_at);

-- Enable RLS
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Users can view messages from their connections
CREATE POLICY "Users can view messages from their connections"
ON public.messages
FOR SELECT
USING (
  connection_id IN (
    SELECT c.id FROM public.connections c
    JOIN public.profiles p ON p.user_id = auth.uid()
    WHERE (c.requester_id = p.id OR c.recipient_id = p.id)
    AND c.status = 'accepted'
  )
);

-- Users can send messages to their connections
CREATE POLICY "Users can send messages to their connections"
ON public.messages
FOR INSERT
WITH CHECK (
  sender_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
  AND connection_id IN (
    SELECT c.id FROM public.connections c
    JOIN public.profiles p ON p.user_id = auth.uid()
    WHERE (c.requester_id = p.id OR c.recipient_id = p.id)
    AND c.status = 'accepted'
  )
);

-- Enable realtime for messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;