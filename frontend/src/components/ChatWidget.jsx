// src/components/ChatWidget.jsx — Shared real-time chat component
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from '../context/AuthContext';
import { chatAPI } from '../api/api';

const apiBaseUrl = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000';

let socket = null;

function getSocket() {
  if (!socket) {
    socket = io(apiBaseUrl, { transports: ['websocket', 'polling'], autoConnect: false });
  }
  return socket;
}

export default function ChatWidget() {
  const { currentUser } = useAuth();
  const [rooms, setRooms] = useState([]);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [typingUser, setTypingUser] = useState(null);
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  // Connect socket on mount
  useEffect(() => {
    if (!currentUser?.id) return;

    const s = getSocket();
    if (!s.connected) s.connect();
    s.emit('join', currentUser.id);

    s.on('new_message', ({ roomId, message }) => {
      if (selectedRoom?._id === roomId) {
        setMessages((prev) => [...prev, message]);
      }
      // Update room's last message
      setRooms((prev) =>
        prev.map((r) =>
          r._id === roomId
            ? { ...r, lastMessage: { content: message.content, sender: message.sender, timestamp: message.createdAt } }
            : r
        ).sort((a, b) => new Date(b.lastMessage?.timestamp || b.updatedAt) - new Date(a.lastMessage?.timestamp || a.updatedAt))
      );
    });

    s.on('user_typing', ({ userId, fullName }) => {
      if (userId !== currentUser.id) setTypingUser(fullName);
    });

    s.on('user_stop_typing', () => setTypingUser(null));

    return () => {
      s.off('new_message');
      s.off('user_typing');
      s.off('user_stop_typing');
    };
  }, [currentUser?.id, selectedRoom?._id]);

  // Fetch rooms on mount
  useEffect(() => {
    const fetchRooms = async () => {
      try {
        const data = await chatAPI.getRooms();
        if (data.success) setRooms(data.rooms || []);
      } catch (err) {
        console.error('Failed to fetch chat rooms:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchRooms();
  }, []);

  // Fetch messages when room is selected
  useEffect(() => {
    if (!selectedRoom) return;
    const fetchMessages = async () => {
      try {
        const data = await chatAPI.getMessages(selectedRoom._id);
        if (data.success) setMessages(data.messages || []);
      } catch (err) {
        console.error('Failed to fetch messages:', err);
      }
    };
    fetchMessages();

    const s = getSocket();
    s.emit('join_chat', selectedRoom._id);

    return () => { s.emit('leave_chat', selectedRoom._id); };
  }, [selectedRoom?._id]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedRoom || sending) return;

    const content = newMessage.trim();
    setNewMessage('');
    setSending(true);

    try {
      const data = await chatAPI.sendMessage(selectedRoom._id, { content });
      if (data.success) {
        setMessages((prev) => [...prev, data.message]);
      }
    } catch (err) {
      console.error('Failed to send message:', err);
      setNewMessage(content); // restore on failure
    } finally {
      setSending(false);
      // Stop typing
      const s = getSocket();
      s.emit('stop_typing', { roomId: selectedRoom._id, userId: currentUser?.id });
    }
  };

  const handleTyping = () => {
    if (!selectedRoom || !currentUser) return;
    const s = getSocket();
    s.emit('typing', { roomId: selectedRoom._id, userId: currentUser.id, fullName: currentUser.fullName });

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      s.emit('stop_typing', { roomId: selectedRoom._id, userId: currentUser.id });
    }, 2000);
  };

  const getOtherParticipant = (room) => {
    if (!room?.participants || !currentUser) return { fullName: 'Unknown', role: '' };
    return room.participants.find((p) => p._id !== currentUser.id) || room.participants[0] || { fullName: 'Unknown' };
  };

  const filteredRooms = rooms.filter((r) => {
    const other = getOtherParticipant(r);
    return other.fullName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
           other.company_name?.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const getUnreadCount = (room) => {
    // Simple visual indicator - room has a recent lastMessage from someone else
    if (!room.lastMessage?.sender) return 0;
    const senderId = typeof room.lastMessage.sender === 'object' ? room.lastMessage.sender._id : room.lastMessage.sender;
    return senderId !== currentUser?.id ? 1 : 0;
  };

  return (
    <div className="max-w-6xl mx-auto animate-fadeInUp">
      <h1 className="text-2xl font-bold text-white font-heading mb-6">Messages</h1>

      <div className="glass-card rounded-xl overflow-hidden flex" style={{ height: 'calc(100vh - 180px)', minHeight: '500px' }}>
        {/* Conversations List */}
        <div className={`w-full sm:w-[320px] flex-shrink-0 flex flex-col border-r border-white/[0.05] ${selectedRoom ? 'hidden sm:flex' : 'flex'}`}>
          <div className="p-3 border-b border-white/[0.05]">
            <div className="relative">
              <svg className="w-4 h-4 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="Search chats..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 py-2 rounded-lg text-sm glass-input w-full"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-10">
                <div className="w-6 h-6 border-2 border-loverai-gold/30 border-t-loverai-gold rounded-full animate-spin"></div>
              </div>
            ) : filteredRooms.length === 0 ? (
              <div className="text-center py-10 text-white/30">
                <svg className="w-10 h-10 mx-auto mb-3 text-white/15" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                <p className="text-xs">No conversations yet</p>
                <p className="text-[10px] text-white/20 mt-1">Chats appear when you interact with bids</p>
              </div>
            ) : (
              filteredRooms.map((room) => {
                const other = getOtherParticipant(room);
                const initial = (other.fullName || other.company_name || 'U')[0].toUpperCase();
                const hasUnread = getUnreadCount(room) > 0;

                return (
                  <div
                    key={room._id}
                    onClick={() => setSelectedRoom(room)}
                    className={`flex items-center gap-3 p-4 cursor-pointer transition hover:bg-white/[0.04] ${selectedRoom?._id === room._id ? 'bg-white/[0.06] border-l-2 border-loverai-gold' : ''}`}
                  >
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-loverai-gold to-amber-700 flex items-center justify-center text-loverai-dark text-sm font-bold shadow-lg flex-shrink-0">
                      {other.avatar ? <img src={other.avatar} alt="" className="w-full h-full rounded-full object-cover" /> : initial}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-white text-[14px] font-medium truncate">
                          {other.fullName || other.company_name || 'User'}
                        </span>
                        <span className="text-gray-600 text-[11px] flex-shrink-0">
                          {room.lastMessage?.timestamp ? new Date(room.lastMessage.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <p className="text-gray-500 text-[12px] truncate mt-0.5 flex-1">{room.lastMessage?.content || 'No messages yet'}</p>
                        <span className="text-[9px] uppercase tracking-wider text-white/20 bg-white/5 px-1.5 py-0.5 rounded flex-shrink-0">{other.role}</span>
                      </div>
                    </div>
                    {hasUnread && (
                      <span className="w-2.5 h-2.5 rounded-full bg-loverai-gold shadow-[0_0_6px_rgba(225,195,135,0.5)] flex-shrink-0"></span>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Chat Area */}
        <div className={`flex-1 flex flex-col ${selectedRoom ? 'flex' : 'hidden sm:flex'}`}>
          {selectedRoom ? (
            <>
              {/* Chat Header */}
              <div className="flex items-center gap-3 p-4 border-b border-white/[0.05]">
                <button onClick={() => setSelectedRoom(null)} className="sm:hidden p-1 text-gray-400 hover:text-amber-400 transition">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                </button>
                {(() => {
                  const other = getOtherParticipant(selectedRoom);
                  const initial = (other.fullName || 'U')[0].toUpperCase();
                  return (
                    <>
                      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-loverai-gold to-amber-700 flex items-center justify-center text-white text-sm font-bold">
                        {other.avatar ? <img src={other.avatar} alt="" className="w-full h-full rounded-full object-cover" /> : initial}
                      </div>
                      <div>
                        <p className="text-white text-[14px] font-medium">{other.fullName || other.company_name}</p>
                        <p className="text-emerald-400 text-[11px]">{typingUser ? `${typingUser} is typing...` : other.role || 'Online'}</p>
                      </div>
                    </>
                  );
                })()}
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {messages.length === 0 && (
                  <div className="text-center py-10 text-white/20 text-xs">
                    <p>No messages yet. Say hello! 👋</p>
                  </div>
                )}
                {messages.map((msg) => {
                  const isMe = (typeof msg.sender === 'object' ? msg.sender._id : msg.sender) === currentUser?.id;
                  return (
                    <div key={msg._id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[75%] rounded-2xl px-4 py-2.5 ${isMe ? 'bg-amber-600/30 text-amber-100 rounded-br-sm' : 'bg-white/[0.06] text-gray-200 rounded-bl-sm'}`}>
                        <p className="text-[13px]">{msg.content}</p>
                        <p className={`text-[10px] mt-1 ${isMe ? 'text-amber-400/50' : 'text-gray-600'}`}>
                          {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              <form onSubmit={handleSend} className="p-4 border-t border-white/[0.05]">
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Type a message..."
                    value={newMessage}
                    onChange={(e) => { setNewMessage(e.target.value); handleTyping(); }}
                    className="flex-1 px-4 py-2.5 rounded-xl text-sm glass-input"
                  />
                  <button
                    type="submit"
                    disabled={sending || !newMessage.trim()}
                    className="px-4 py-2.5 rounded-xl bg-amber-600/80 text-white text-sm font-medium hover:bg-amber-600 transition disabled:opacity-40"
                  >
                    {sending ? '...' : 'Send'}
                  </button>
                </div>
              </form>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-gray-600">
              <svg className="w-16 h-16 mb-4 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              <p className="text-sm">Select a conversation to start chatting</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
