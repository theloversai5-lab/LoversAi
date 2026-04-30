import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { chatAPI } from '../../api/api';
import io from 'socket.io-client';

const API_BASE = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000';

export default function VendorMessages() {
  const { currentUser } = useAuth();
  const [rooms, setRooms] = useState([]);
  const [activeRoom, setActiveRoom] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMsg, setNewMsg] = useState('');
  const [loading, setLoading] = useState(true);
  const [msgLoading, setMsgLoading] = useState(false);
  const socketRef = useRef(null);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    const socket = io(API_BASE, { transports: ['websocket', 'polling'] });
    socketRef.current = socket;
    if (currentUser?._id) socket.emit('join', currentUser._id);
    socket.on('new_message', ({ roomId, message }) => {
      if (activeRoom?._id === roomId) setMessages(prev => [...prev, message]);
      setRooms(prev => prev.map(r => r._id === roomId ? { ...r, lastMessage: { content: message.content, timestamp: new Date() } } : r));
    });
    return () => socket.disconnect();
  }, [currentUser, activeRoom]);

  useEffect(() => {
    chatAPI.getRooms().then(res => { if (res.success) setRooms(res.rooms || []); }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!activeRoom) return;
    setMsgLoading(true);
    if (socketRef.current) socketRef.current.emit('join_chat', activeRoom._id);
    chatAPI.getMessages(activeRoom._id).then(res => { if (res.success) setMessages(res.messages || []); }).catch(() => {}).finally(() => setMsgLoading(false));
  }, [activeRoom]);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const handleSend = useCallback(async () => {
    if (!newMsg.trim() || !activeRoom) return;
    const content = newMsg.trim();
    setNewMsg('');
    try {
      const res = await chatAPI.sendMessage(activeRoom._id, { content });
      if (res.success) setMessages(prev => [...prev, res.message]);
    } catch (e) { console.error('Send error:', e); }
  }, [newMsg, activeRoom]);

  const getOtherParticipant = (room) => {
    if (!room?.participants || !currentUser?._id) return { fullName: 'Unknown', role: '' };
    return room.participants.find(p => p._id !== currentUser._id) || room.participants[0] || { fullName: 'Unknown', role: '' };
  };

  const formatTime = (ts) => {
    if (!ts) return '';
    const d = new Date(ts);
    const diff = Date.now() - d;
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return d.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
  };

  return (
    <div className="animate-fadeInUp">
      <h1 className="font-heading text-2xl text-white mb-4">Messages</h1>
      <div className="flex h-[calc(100vh-10rem)] glass-card rounded-2xl overflow-hidden">
        {/* Thread List */}
        <div className={`${activeRoom ? 'hidden md:flex' : 'flex'} flex-col w-full md:w-80 border-r border-white/5`}>
          <div className="p-3 border-b border-white/5">
            <input placeholder="Search chats..." className="w-full glass-input rounded-xl px-4 py-2 text-sm" />
          </div>
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="p-8 text-center text-white/30">Loading...</div>
            ) : rooms.length === 0 ? (
              <div className="p-8 text-center text-white/30 text-sm">
                <svg className="w-10 h-10 mx-auto mb-3 text-white/10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
                No conversations yet. Planners will contact you via requests.
              </div>
            ) : rooms.map(room => {
              const other = getOtherParticipant(room);
              const isActive = activeRoom?._id === room._id;
              return (
                <button key={room._id} onClick={() => setActiveRoom(room)}
                  className={`w-full text-left p-4 border-b border-white/5 transition-colors ${isActive ? 'bg-loverai-gold/5 border-l-2 border-l-loverai-gold' : 'hover:bg-white/[0.02]'}`}>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-loverai-gold/30 to-amber-800/30 flex items-center justify-center text-loverai-gold font-heading text-sm shrink-0">
                      {other.fullName?.charAt(0) || '?'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium text-white truncate">{other.fullName}</span>
                        <span className="text-[10px] text-white/20 shrink-0">{formatTime(room.lastMessage?.timestamp || room.updatedAt)}</span>
                      </div>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="text-[10px] px-1.5 py-0 rounded glass-card-subtle text-white/25 capitalize">{other.role}</span>
                        <p className="text-xs text-white/30 truncate">{room.lastMessage?.content || 'No messages yet'}</p>
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Chat Area */}
        {activeRoom ? (
          <div className="flex-1 flex flex-col">
            <div className="p-4 border-b border-white/5 flex items-center gap-3">
              <button className="md:hidden text-white/30 hover:text-white mr-1" onClick={() => setActiveRoom(null)}>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
              </button>
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-loverai-gold/30 to-amber-800/30 flex items-center justify-center text-loverai-gold font-heading text-sm">
                {getOtherParticipant(activeRoom).fullName?.charAt(0) || '?'}
              </div>
              <div>
                <p className="text-sm font-medium text-white">{getOtherParticipant(activeRoom).fullName}</p>
                <p className="text-[10px] text-white/25 capitalize">{getOtherParticipant(activeRoom).role}</p>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {msgLoading ? (
                <div className="text-center text-white/30 py-8">Loading...</div>
              ) : messages.length === 0 ? (
                <div className="text-center text-white/20 py-8 text-sm">No messages yet. Say hello!</div>
              ) : messages.map((m, i) => {
                const isMine = m.sender?._id === currentUser?._id || m.sender === currentUser?._id;
                return (
                  <div key={m._id || i} className={`max-w-[80%] ${isMine ? 'ml-auto' : 'mr-auto'}`}>
                    <div className={`p-3 rounded-2xl text-sm ${isMine ? 'bg-loverai-gold/10 rounded-br-md border border-loverai-gold/15' : 'glass-card-subtle rounded-bl-md'}`}>
                      <p className="text-white/80">{m.content}</p>
                    </div>
                    <p className={`text-[9px] text-white/15 mt-1 ${isMine ? 'text-right' : 'text-left'}`}>{formatTime(m.createdAt)}</p>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>
            <div className="p-3 border-t border-white/5 flex gap-2">
              <input value={newMsg} onChange={e => setNewMsg(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSend()}
                placeholder="Type a message..." className="flex-1 glass-input rounded-xl px-4 py-2.5 text-sm" />
              <button onClick={handleSend} disabled={!newMsg.trim()} className="loverai-btn-primary px-4 py-2.5 rounded-xl disabled:opacity-30">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
              </button>
            </div>
          </div>
        ) : (
          <div className="flex-1 hidden md:flex items-center justify-center text-white/20 text-sm">
            <div className="text-center">
              <svg className="w-16 h-16 mx-auto mb-4 text-white/5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
              Select a conversation to start chatting
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
