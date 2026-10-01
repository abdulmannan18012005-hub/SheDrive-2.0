import { useState, useEffect, useCallback, useRef } from 'react';

export const useRideChat = (rideId: string, authToken: string, isVisible: boolean = false) => {
  const [messages, setMessages] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const lastFetched = useRef<string | null>(null);

  const fetchMessages = useCallback(async () => {
    try {
      let url = `http://localhost:3000/api/v1/rides/${rideId}/chat/messages`;
      if (lastFetched.current) {
        url += `?after=${lastFetched.current}`;
      }
      
      const res = await fetch(url, {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });
      
      if (res.ok) {
        const data = await res.json();
        if (data.messages && data.messages.length > 0) {
          setMessages(prev => {
            const newMsgs = data.messages.filter((m: any) => !prev.some(p => p.id === m.id));
            return [...prev, ...newMsgs].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
          });
          lastFetched.current = new Date().toISOString();
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [rideId, authToken]);

  const fetchUnreadCount = useCallback(async () => {
    try {
      const res = await fetch(`http://localhost:3000/api/v1/rides/${rideId}/chat/unread-count`, {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });
      if (res.ok) {
        const data = await res.json();
        setUnreadCount(data.unread_count);
      }
    } catch (err) {
      console.error(err);
    }
  }, [rideId, authToken]);

  const sendMessage = async (text: string) => {
    try {
      const res = await fetch(`http://localhost:3000/api/v1/rides/${rideId}/chat/messages`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ message_text: text })
      });
      
      if (res.ok) {
        const newMessage = await res.json();
        setMessages(prev => [...prev, newMessage]);
        lastFetched.current = new Date().toISOString();
        return true;
      } else {
        const errData = await res.json();
        console.error("Failed to send:", errData.error);
        return false;
      }
    } catch (err) {
      console.error("Send error:", err);
      return false;
    }
  };

  // Setup polling
  useEffect(() => {
    fetchMessages();
    fetchUnreadCount();

    const interval = setInterval(() => {
      fetchMessages();
      if (!isVisible) {
        fetchUnreadCount();
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [fetchMessages, fetchUnreadCount, isVisible]);

  return {
    messages,
    unreadCount,
    loading,
    sendMessage
  };
};
