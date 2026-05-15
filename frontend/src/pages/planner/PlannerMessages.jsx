import React, { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { chatAPI, uploadAPI } from "../../api/api";
import io from "socket.io-client";

const API_BASE = process.env.REACT_APP_API_BASE_URL || "http://localhost:5000";

const normalizeId = (value) => {
  if (!value) return "";
  if (typeof value === "string") return value;
  return value._id || value.id || String(value);
};

const isOwnMessage = (message, currentUserId) =>
  normalizeId(message?.sender) === normalizeId(currentUserId);

const getParticipantDisplayName = (participant) => {
  if (!participant) return "Unknown";

  const emailName = participant.email?.split("@")?.[0]?.trim();

  if (participant.role === "couple") {
    return (
      participant.weddingProfile?.partnerName2?.trim() ||
      participant.weddingProfile?.partnerName1?.trim() ||
      participant.fullName?.trim() ||
      emailName ||
      "Couple"
    );
  }

  return (
    participant.company_name?.trim() ||
    participant.fullName?.trim() ||
    emailName ||
    "Unknown"
  );
};

const isImageMessage = (message) =>
  message?.type === "image" ||
  message?.mimeType?.startsWith("image/") ||
  /\.(jpg|jpeg|png|gif|webp)$/i.test(message?.fileUrl || "");

const renderAttachment = (message) => {
  if (!message?.fileUrl) return null;

  if (isImageMessage(message)) {
    return (
      <a href={message.fileUrl} target="_blank" rel="noreferrer">
        <img
          src={message.fileUrl}
          alt={message.fileName || "Shared image"}
          className="max-h-72 w-full rounded-2xl object-cover"
        />
      </a>
    );
  }

  return (
    <a
      href={message.fileUrl}
      target="_blank"
      rel="noreferrer"
      className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black/10 px-4 py-3 text-sm text-white/90"
    >
      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-lg">
        📎
      </span>
      <span className="min-w-0 flex-1 truncate">
        {message.fileName || "Attachment"}
      </span>
    </a>
  );
};

export default function PlannerMessages() {
  const { currentUser } = useAuth();
  const currentUserId = currentUser?.id || currentUser?._id;
  const [rooms, setRooms] = useState([]);
  const [activeRoom, setActiveRoom] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMsg, setNewMsg] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [msgLoading, setMsgLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);
  const socketRef = useRef(null);
  const fileInputRef = useRef(null);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    const socket = io(API_BASE, { transports: ["websocket", "polling"] });
    socketRef.current = socket;
    if (currentUserId) socket.emit("join", currentUserId);

    socket.on("quote_update", ({ status, roomId }) => {
      if (status === "accepted" || roomId) {
        chatAPI
          .getRooms()
          .then((res) => {
            if (res.success) setRooms(res.rooms || []);
          })
          .catch(() => {});
      }
    });

    socket.on("new_message", ({ roomId, message }) => {
      if (activeRoom?._id === roomId) {
        setMessages((prev) =>
          prev.some((item) => item._id === message._id)
            ? prev
            : [...prev, message],
        );
      }

      setRooms((prev) =>
        prev.map((room) =>
          room._id === roomId
            ? {
                ...room,
                lastMessage: {
                  content:
                    message.content ||
                    message.fileName ||
                    (isImageMessage(message) ? "Photo" : "Attachment"),
                  timestamp: message.createdAt,
                },
                updatedAt: message.createdAt,
              }
            : room,
        ),
      );
    });

    return () => socket.disconnect();
  }, [activeRoom, currentUserId]);

  useEffect(() => {
    chatAPI
      .getRooms()
      .then((res) => {
        if (res.success) setRooms(res.rooms || []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!activeRoom) return;
    setMsgLoading(true);
    setSelectedFile(null);
    if (socketRef.current) socketRef.current.emit("join_chat", activeRoom._id);
    chatAPI
      .getMessages(activeRoom._id)
      .then((res) => {
        if (res.success) setMessages(res.messages || []);
      })
      .catch(() => {})
      .finally(() => setMsgLoading(false));
  }, [activeRoom]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = useCallback(async () => {
    if ((!newMsg.trim() && !selectedFile) || !activeRoom || sending) return;

    setSending(true);

    try {
      let payload = {
        content: newMsg.trim(),
      };

      if (selectedFile) {
        const isImage = selectedFile.type.startsWith("image/");
        const uploadResult = isImage
          ? await uploadAPI.uploadImage(selectedFile, "chat-files")
          : await uploadAPI.uploadFile(selectedFile, "chat-files");

        if (!uploadResult || !uploadResult.url) {
          throw new Error("File upload failed");
        }

        payload = {
          ...payload,
          type: isImage ? "image" : "file",
          fileUrl: uploadResult.url,
          fileName: uploadResult.originalName || selectedFile.name,
          mimeType: uploadResult.mimeType || selectedFile.type,
        };
      }

      const res = await chatAPI.sendMessage(activeRoom._id, payload);
      if (res.success) {
        setMessages((prev) =>
          prev.some((item) => item._id === res.message._id)
            ? prev
            : [...prev, res.message],
        );
        setNewMsg("");
        setSelectedFile(null);
        setError(null);
      } else {
        throw new Error(res.error || "Failed to send message");
      }
    } catch (e) {
      console.error("Send message error:", e);
      setError(e.message || "Failed to send message");
    } finally {
      setSending(false);
    }
  }, [activeRoom, newMsg, selectedFile, sending]);

  const getOtherParticipant = (room) => {
    if (!room?.participants || !currentUserId)
      return { fullName: "Unknown", role: "" };

    const normalizedCurrentUserId = normalizeId(currentUserId);

    return (
      room.participants.find(
        (participant) => normalizeId(participant) !== normalizedCurrentUserId,
      ) ||
      room.participants[0] || { fullName: "Unknown", role: "" }
    );
  };

  const formatTime = (ts) => {
    if (!ts) return "";
    const date = new Date(ts);
    return date.toLocaleTimeString("en-IN", {
      hour: "numeric",
      minute: "2-digit",
    });
  };

  const filteredRooms = rooms.filter((room) => {
    const other = getOtherParticipant(room);
    const query = search.trim().toLowerCase();
    if (!query) return true;
    return (
      getParticipantDisplayName(other).toLowerCase().includes(query) ||
      room.lastMessage?.content?.toLowerCase().includes(query)
    );
  });

  return (
    <div className="animate-fadeInUp">
      <h1 className="font-heading text-2xl text-white mb-4">Messages</h1>
      <div className="flex h-[calc(100vh-10rem)] glass-card rounded-2xl overflow-hidden">
        <div
          className={`${activeRoom ? "hidden md:flex" : "flex"} flex-col w-full md:w-80 border-r border-white/5`}
        >
          <div className="p-3 border-b border-white/5">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search chats..."
              className="w-full glass-input rounded-xl px-4 py-2 text-sm"
            />
          </div>
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="p-8 text-center text-white/30">
                Loading chats...
              </div>
            ) : filteredRooms.length === 0 ? (
              <div className="p-8 text-center text-white/30 text-sm">
                No conversations yet. Accepted bids will appear here.
              </div>
            ) : (
              filteredRooms.map((room) => {
                const other = getOtherParticipant(room);
                const isActive = activeRoom?._id === room._id;
                return (
                  <button
                    key={room._id}
                    onClick={() => setActiveRoom(room)}
                    className={`w-full text-left p-4 border-b border-white/5 transition-colors ${
                      isActive
                        ? "bg-loverai-gold/5 border-l-2 border-l-loverai-gold"
                        : "hover:bg-white/[0.02]"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-loverai-gold/30 to-amber-800/30 flex items-center justify-center text-loverai-gold font-heading text-sm shrink-0">
                        {getParticipantDisplayName(other)?.charAt(0) || "?"}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium text-white truncate">
                            {getParticipantDisplayName(other)}
                          </span>
                          <span className="text-[10px] text-white/20 shrink-0">
                            {formatTime(
                              room.lastMessage?.timestamp || room.updatedAt,
                            )}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="text-[10px] px-1.5 py-0 rounded glass-card-subtle text-white/25 capitalize">
                            {other.role}
                          </span>
                          <p className="text-xs text-white/30 truncate">
                            {room.lastMessage?.content || "No messages yet"}
                          </p>
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {activeRoom ? (
          <div className="flex-1 flex flex-col bg-[linear-gradient(180deg,rgba(255,255,255,0.02),rgba(0,0,0,0.02))]">
            <div className="p-4 border-b border-white/5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button
                  className="md:hidden text-white/30 hover:text-white mr-1"
                  onClick={() => setActiveRoom(null)}
                >
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 19l-7-7 7-7"
                    />
                  </svg>
                </button>
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-loverai-gold/30 to-amber-800/30 flex items-center justify-center text-loverai-gold font-heading text-sm">
                  {getParticipantDisplayName(
                    getOtherParticipant(activeRoom),
                  )?.charAt(0) || "?"}
                </div>
                <div>
                  <p className="text-sm font-medium text-white">
                    {getParticipantDisplayName(getOtherParticipant(activeRoom))}
                  </p>
                  <p className="text-[10px] text-white/25 capitalize">
                    {getOtherParticipant(activeRoom).role}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-3">
              {msgLoading ? (
                <div className="text-center text-white/30 py-8">
                  Loading messages...
                </div>
              ) : messages.length === 0 ? (
                <div className="text-center text-white/20 py-8 text-sm">
                  No messages yet. Say hello!
                </div>
              ) : (
                messages.map((message, index) => {
                  const isMine = isOwnMessage(message, currentUserId);

                  return (
                    <div
                      key={message._id || index}
                      className={`flex ${isMine ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[78%] ${isMine ? "items-end" : "items-start"} flex flex-col`}
                      >
                        <div
                          className={`rounded-[18px] px-3 py-2 shadow-sm ${
                            isMine
                              ? "bg-[#8f6d49] text-white rounded-br-[6px]"
                              : "bg-[#2b2118] text-[#f7e7c7] rounded-bl-[6px]"
                          }`}
                        >
                          {message.fileUrl ? renderAttachment(message) : null}
                          {message.content ? (
                            <p
                              className={`${message.fileUrl ? "mt-2" : ""} whitespace-pre-wrap break-words text-sm leading-6`}
                            >
                              {message.content}
                            </p>
                          ) : null}
                        </div>
                        <p className="mt-1 px-1 text-[10px] text-white/25">
                          {formatTime(message.createdAt)}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            <div className="border-t border-white/5 p-3">
              {selectedFile ? (
                <div className="mb-3 flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white/80">
                  <span className="truncate">{selectedFile.name}</span>
                  <button
                    type="button"
                    onClick={() => setSelectedFile(null)}
                    className="text-white/40 hover:text-white"
                  >
                    Remove
                  </button>
                </div>
              ) : null}
              {error ? (
                <div className="mb-3 text-sm text-red-400">{error}</div>
              ) : null}

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex h-12 w-12 items-center justify-center rounded-full border border-white/10 bg-white/[0.03] text-white/70 transition hover:bg-white/[0.06]"
                >
                  +
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.zip,.rar"
                  className="hidden"
                  onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                />
                <input
                  value={newMsg}
                  onChange={(e) => setNewMsg(e.target.value)}
                  onKeyDown={(e) =>
                    e.key === "Enter" && !e.shiftKey && handleSend()
                  }
                  placeholder="Type a message"
                  className="flex-1 glass-input rounded-full px-5 py-3 text-sm"
                />
                <button
                  onClick={handleSend}
                  disabled={sending || (!newMsg.trim() && !selectedFile)}
                  className="flex h-12 min-w-[56px] items-center justify-center rounded-full bg-[#8f6d49] px-4 text-white disabled:opacity-40"
                >
                  {sending ? "..." : "➤"}
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 hidden md:flex items-center justify-center text-white/20 text-sm">
            Select a conversation to start chatting
          </div>
        )}
      </div>
    </div>
  );
}
