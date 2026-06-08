import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { io } from "socket.io-client";
import { chatAPI, quoteAPI, uploadAPI } from "../../api/api";
import { useAuth } from "../../context/AuthContext";

const apiBaseUrl =
  process.env.REACT_APP_API_BASE_URL || "http://localhost:5000";

const normalizeId = (value) => {
  if (!value) return "";
  if (typeof value === "string") return value;
  return value._id || value.id || String(value);
};

const isOwnMessage = (message, currentUserId) =>
  normalizeId(message?.sender) === normalizeId(currentUserId);

const stepsMap = [
  {
    label: "Bid Placed",
    key: "pending",
    description: "Finding the perfect planners for your vision.",
  },
  {
    label: "Vendor Review",
    key: "viewed",
    description: "Planners are reviewing your request and moodboard.",
  },
  {
    label: "Quotation Received",
    key: "quoted",
    description: "Quotes are ready for you to compare and accept.",
  },
  {
    label: "Booking Complete",
    key: "accepted",
    description: "Your planner is confirmed and booking is complete.",
  },
];

const statusOrder = [
  "pending",
  "viewed",
  "quoted",
  "accepted",
  "rejected",
  "expired",
];

const getStepStatus = (currentStatus, stepKey) => {
  const currentIndex = statusOrder.indexOf(currentStatus);
  const stepIndex = statusOrder.indexOf(stepKey);

  if (currentStatus === "rejected" || currentStatus === "expired") {
    if (stepIndex > 1) return "pending";
    return stepIndex <= currentIndex ? "done" : "pending";
  }

  if (currentIndex > stepIndex) return "done";
  if (currentIndex === stepIndex) return "active";
  return "pending";
};

const formatDate = (value) => {
  if (!value) return "TBD";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

const formatTime = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleTimeString("en-IN", {
    hour: "numeric",
    minute: "2-digit",
  });
};

const formatCurrency = (value) => {
  if (!value) return "Flexible";
  return `Rs ${Number(value).toLocaleString("en-IN")}`;
};

const plannerLabel = (planner) =>
  planner?.company_name || planner?.fullName || "Planner";

const plannerInitial = (planner) =>
  plannerLabel(planner).charAt(0).toUpperCase();

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
          className="max-h-80 w-full rounded-[18px] object-cover"
        />
      </a>
    );
  }

  return (
    <a
      href={message.fileUrl}
      target="_blank"
      rel="noreferrer"
      className="flex items-center gap-3 rounded-[18px] border border-white/10 bg-black/10 px-4 py-3 text-sm text-white"
    >
      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10">
        📎
      </span>
      <span className="truncate">{message.fileName || "Attachment"}</span>
    </a>
  );
};

const getDefaultPanel = (quote, requestedPanel) => {
  if (requestedPanel) return requestedPanel;
  if (quote?.status === "accepted") return "messages";
  if ((quote?.responses || []).length > 0) return "proposals";
  return "overview";
};

const metricCardClass =
  "rounded-[20px] border border-white/10 bg-white/5 px-6 py-5 shadow-lg backdrop-blur-md";

export default function CoupleBidProgress() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser } = useAuth();
  const currentUserId = currentUser?.id || currentUser?._id;

  const [quote, setQuote] = useState(null);
  const [rooms, setRooms] = useState([]);
  const [activeRoomId, setActiveRoomId] = useState(
    location.state?.roomId || "",
  );
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [chatLoading, setChatLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [actionLoading, setActionLoading] = useState("");
  const [activePanel, setActivePanel] = useState(
    location.state?.activePanel || "overview",
  );

  const socketRef = useRef(null);
  const messageEndRef = useRef(null);
  const fileInputRef = useRef(null);

  const fetchQuote = useCallback(async () => {
    const data = await quoteAPI.getById(id);
    if (data.success) {
      setQuote(data.quote);
      return data.quote;
    }
    throw new Error("Failed to load bid details.");
  }, [id]);

  const fetchRooms = useCallback(async () => {
    const data = await chatAPI.getRooms();
    if (data.success) {
      setRooms(data.rooms || []);
      return data.rooms || [];
    }
    return [];
  }, []);

  const loadRoomMessages = useCallback(async (roomId) => {
    if (!roomId) return;
    setChatLoading(true);
    try {
      const data = await chatAPI.getMessages(roomId);
      if (data.success) {
        setMessages(data.messages || []);
      }
    } catch (err) {
      setError(err.response?.data?.error || "Failed to load chat messages.");
    } finally {
      setChatLoading(false);
    }
  }, []);

  useEffect(() => {
    const initialize = async () => {
      try {
        setLoading(true);
        setError("");
        const [quoteData, roomData] = await Promise.all([
          fetchQuote(),
          fetchRooms(),
        ]);
        setActivePanel((current) =>
          getDefaultPanel(quoteData, location.state?.activePanel || current),
        );

        const matchingRoom =
          location.state?.roomId ||
          roomData.find((room) => room.relatedQuote?._id === id)?._id ||
          "";

        if (matchingRoom) {
          setActiveRoomId(matchingRoom);
        }
      } catch (err) {
        setError(
          err.response?.data?.error ||
            err.message ||
            "An error occurred while fetching the bid.",
        );
      } finally {
        setLoading(false);
      }
    };

    initialize();
  }, [
    fetchQuote,
    fetchRooms,
    id,
    location.state?.activePanel,
    location.state?.roomId,
  ]);

  useEffect(() => {
    if (!activeRoomId) {
      setMessages([]);
      return;
    }
    loadRoomMessages(activeRoomId);
  }, [activeRoomId, loadRoomMessages]);

  useEffect(() => {
    if (!chatLoading) {
      messageEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, chatLoading]);

  useEffect(() => {
    if (!currentUserId) return undefined;

    const socket = io(apiBaseUrl, { transports: ["polling", "websocket"] });
    socketRef.current = socket;
    socket.emit("join", currentUserId);

    socket.on("quote_update", (data) => {
      if (data.quoteId === id) {
        fetchQuote().catch((err) => {
          console.error(
            `CoupleBidProgress.jsx: fetchQuote failed for quote ${id}:`,
            err,
          );
        });
      }
    });

    socket.on("new_message", (payload) => {
      if (!payload?.roomId || !payload?.message) return;

      setRooms((prevRooms) => {
        const existing = prevRooms.find((room) => room._id === payload.roomId);
        if (!existing) return prevRooms;

        // Avoid updating if lastMessage is identical
        const existingLast = existing.lastMessage || {};
        const newLast = {
          content: payload.message.content,
          sender: payload.message.sender,
          timestamp: payload.message.createdAt || new Date().toISOString(),
        };
        if (
          existingLast.timestamp === newLast.timestamp &&
          existingLast.content === newLast.content
        ) {
          return prevRooms;
        }

        const updated = {
          ...existing,
          lastMessage: newLast,
          updatedAt: newLast.timestamp,
        };

        return [
          updated,
          ...prevRooms.filter((room) => room._id !== payload.roomId),
        ];
      });

      if (payload.roomId === activeRoomId) {
        setMessages((prev) => {
          const exists = prev.some((m) => {
            if (m._id && payload.message._id)
              return m._id === payload.message._id;
            // fallback composite key
            return (
              m.createdAt === payload.message.createdAt &&
              normalizeId(m.sender) === normalizeId(payload.message.sender) &&
              m.content === payload.message.content
            );
          });
          if (exists) return prev;
          return [...prev, payload.message];
        });
      }
    });

    return () => {
      socket.off("quote_update");
      socket.off("new_message");
      socket.disconnect();
    };
  }, [currentUserId, fetchQuote, id]);

  useEffect(() => {
    if (!socketRef.current || !activeRoomId) return undefined;
    socketRef.current.emit("join_chat", activeRoomId);

    return () => {
      socketRef.current?.emit("leave_chat", activeRoomId);
    };
  }, [activeRoomId]);

  const acceptedResponse = useMemo(
    () => (quote?.responses || []).find((resp) => resp.status === "accepted"),
    [quote],
  );

  const rejectedResponses = useMemo(
    () => (quote?.responses || []).filter((resp) => resp.status === "rejected"),
    [quote],
  );

  const bestBidAmount = useMemo(() => {
    const amounts = (quote?.responses || [])
      .map((resp) => resp.quotedPrice)
      .filter((value) => typeof value === "number");

    if (!amounts.length) return null;
    return Math.min(...amounts);
  }, [quote]);

  const quoteRooms = useMemo(() => {
    if (!quote) return [];

    const plannerIds = new Set(
      (quote.responses || []).map((resp) => resp.planner?._id).filter(Boolean),
    );

    if (quote.hiredPlanner?._id) {
      plannerIds.add(quote.hiredPlanner._id);
    }

    return rooms.filter((room) => {
      if (room.relatedQuote?._id === quote._id) return true;
      return room.participants?.some((participant) =>
        plannerIds.has(participant._id),
      );
    });
  }, [quote, rooms]);

  useEffect(() => {
    if (!quoteRooms.length || activeRoomId) return;
    setActiveRoomId(quoteRooms[0]._id);
  }, [activeRoomId, quoteRooms]);

  const activeRoom =
    quoteRooms.find((room) => room._id === activeRoomId) || null;

  const progressMeta = useMemo(() => {
    if (!quote) return { completed: 0 };
    return {
      completed: stepsMap.filter(
        (step) => getStepStatus(quote.status, step.key) === "done",
      ).length,
    };
  }, [quote]);

  const handleAccept = async (plannerId) => {
    setActionLoading(`accept_${plannerId}`);
    setError("");

    try {
      const data = await quoteAPI.accept(id, { plannerId });
      if (data.success) {
        await fetchQuote();
        setActivePanel("messages");
        if (data.roomId) {
          await fetchRooms();
          setActiveRoomId(data.roomId);
        } else {
          await openChatForPlanner(plannerId, "messages");
        }
      }
    } catch (err) {
      setError(err.response?.data?.error || "Failed to accept quote.");
    } finally {
      setActionLoading("");
    }
  };

  const handleReject = async (plannerId) => {
    setActionLoading(`reject_${plannerId}`);
    setError("");

    try {
      const data = await quoteAPI.reject(id, { plannerId });
      if (data.success) {
        await fetchQuote();
      }
    } catch (err) {
      setError(err.response?.data?.error || "Failed to reject quote.");
    } finally {
      setActionLoading("");
    }
  };

  const openChatForPlanner = async (plannerId, panel = "messages") => {
    if (!plannerId || !quote?._id) return;

    const canChat =
      quote.status === "accepted" && quote.hiredPlanner?._id === plannerId;

    if (!canChat) {
      setError("Chat unlocks after you accept a planner proposal.");
      return;
    }

    try {
      const data = await chatAPI.createRoom({
        participantId: plannerId,
        quoteId: quote._id,
      });

      if (data.success && data.room) {
        const refreshedRooms = await fetchRooms();
        setActiveRoomId(data.room._id);
        setActivePanel(panel);

        const roomExists = refreshedRooms.some(
          (room) => room._id === data.room._id,
        );
        if (!roomExists) {
          setRooms((prev) => [data.room, ...prev]);
        }
      }
    } catch (err) {
      setError(err.response?.data?.error || "Failed to open chat.");
    }
  };

  const handleSendMessage = async () => {
    if ((!draft.trim() && !selectedFile) || !activeRoomId) {
      if (!activeRoomId) {
        setError("No chat room selected. Please open a planner chat first.");
      }
      return;
    }

    setSending(true);
    setError("");

    try {
      let payload = {
        content: draft.trim(),
      };

      if (selectedFile) {
        const isImage = selectedFile.type.startsWith("image/");
        const uploadResult = isImage
          ? await uploadAPI.uploadImage(selectedFile, "chat-files")
          : await uploadAPI.uploadFile(selectedFile, "chat-files");

        payload = {
          ...payload,
          type: isImage ? "image" : "file",
          fileUrl: uploadResult.url,
          fileName: uploadResult.originalName || selectedFile.name,
          mimeType: uploadResult.mimeType || selectedFile.type,
        };
      }

      const data = await chatAPI.sendMessage(activeRoomId, {
        ...payload,
      });
      if (data.success) {
        setMessages((prev) => [...prev, data.message]);
        setRooms((prevRooms) =>
          prevRooms.map((room) =>
            room._id === activeRoomId
              ? {
                  ...room,
                  lastMessage: {
                    content: data.message.content,
                    sender: data.message.sender,
                    timestamp: data.message.createdAt,
                  },
                  updatedAt: data.message.createdAt,
                }
              : room,
          ),
        );
        setDraft("");
        setSelectedFile(null);
      }
    } catch (err) {
      console.error("Send message error:", err.response?.data || err.message || err);
      setError(err.response?.data?.error || err.message || "Failed to send message.");
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0a0604] text-[#e6c6b2]">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#e6c6b2]/20 border-t-[#e6c6b2]" />
      </div>
    );
  }

  if (error && !quote) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#0a0604] px-4 text-center text-white">
        <h1 className="mb-3 text-3xl font-semibold font-['Cormorant_Garamond']">
          Bid Dashboard Unavailable
        </h1>
        <p className="mb-6 max-w-md text-white/50">{error}</p>
        <button
          type="button"
          onClick={() => navigate("/couple/profile")}
          className="rounded-xl bg-gradient-to-r from-[#e6c6b2] to-[#d4a878] px-6 py-3 text-sm font-bold text-[#3D1B2D] hover:brightness-105 active:scale-95 transition"
        >
          Back to Couple Dashboard
        </button>
      </div>
    );
  }

  const currentStatus = quote?.status || "pending";
  const titleMap = {
    overview: "Bid dashboard",
    proposals: "Proposals received",
    messages: "Messages",
  };

  const menuItems = [
    { id: "overview", label: "Bid dashboard", badge: null },
    {
      id: "proposals",
      label: "Proposals",
      badge: quote?.responses?.length || 0,
    },
    { id: "messages", label: "Messages", badge: quoteRooms.length || 0 },
  ];

  return (
    <main className="h-screen w-screen relative px-3 pb-3 pt-3 md:px-4 md:pb-4 md:pt-5 text-white overflow-hidden flex flex-col animate-fadeIn">
      {/* Background Image Setup matching the Dashboard exactly */}
      <div
        className="absolute inset-0 bg-cover bg-center -z-20"
        style={{
          backgroundImage: 'url("/images/signup.png")',
          filter: "brightness(0.75) contrast(1.05)",
        }}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-black/25 via-black/45 to-[#0a0604] -z-10" />

      <div className="mx-auto w-full max-w-[1380px] relative z-10 flex flex-col flex-1 min-h-0">
        
        {/* Enclosing Glassmorphic main panel layout */}
        <section className="flex-1 min-h-0 flex flex-col rounded-[24px] border border-white/15 bg-white/5 backdrop-blur-2xl shadow-[0_30px_70px_rgba(0,0,0,0.45)] overflow-hidden">
          <div className="flex flex-1 min-h-0 flex-col lg:flex-row overflow-hidden">
            <aside className="w-full border-b border-white/10 bg-black/20 lg:min-h-0 lg:w-[280px] lg:border-b-0 lg:border-r flex flex-col flex-shrink-0">
              <div className="border-b border-white/10 px-7 py-6">
                <button
                  type="button"
                  onClick={() =>
                    navigate("/couple/profile", { state: { activeTab: "bids" } })
                  }
                  className="text-left"
                >
                  <p className="text-[34px] font-semibold leading-none text-white font-['Cormorant_Garamond']">
                    LoversAI
                  </p>
                  <p className="mt-2 text-sm text-[#b89f79] tracking-widest uppercase">Wedding CRM</p>
                </button>
              </div>

              <div className="px-5 py-6">
                <p className="mb-4 text-xs uppercase tracking-[0.22em] text-[#b89f79] font-semibold">
                  Couple Menu
                </p>

                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={() => navigate("/couple/cart")}
                    className="flex w-full items-center justify-between rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-left text-white/90 transition hover:bg-white/10"
                  >
                    <span className="font-semibold text-xs uppercase tracking-wider">+ New Bid</span>
                  </button>

                  {menuItems.map((item) => {
                    const isActive = activePanel === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setActivePanel(item.id)}
                        className={`flex w-full items-center justify-between rounded-xl px-4 py-3 text-left transition duration-200 ${
                          isActive
                            ? "bg-white/10 border border-white/15 text-[#e6c6b2] shadow-sm font-semibold"
                            : "text-white/70 hover:bg-white/5 hover:text-white"
                        }`}
                      >
                        <span className="font-medium text-sm">{item.label}</span>
                        {item.badge ? (
                          <span className="rounded-full bg-[#e6c6b2] px-2.5 py-0.5 text-[11px] font-bold text-[#3D1B2D]">
                            {item.badge}
                          </span>
                        ) : null}
                      </button>
                    );
                  })}
                </div>

                <div className="mt-8 rounded-[20px] border border-white/10 bg-white/5 p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-[#b89f79] font-semibold">
                    Request Id
                  </p>
                  <p className="mt-2 text-lg font-semibold text-white">
                    {quote._id.slice(-6).toUpperCase()}
                  </p>
                  <p className="mt-3 text-xs leading-relaxed text-white/60">
                    Submitted on {formatDate(quote.createdAt)} for{" "}
                    {quote.eventDetails?.city || "your wedding"}.
                  </p>
                </div>
              </div>
            </aside>

            <section className="min-w-0 flex-1 flex flex-col overflow-hidden">
              <header className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 bg-black/20 px-8 py-5 flex-shrink-0">
                <h1 className="text-[22px] font-semibold text-white font-['Cormorant_Garamond'] tracking-wide">
                  {titleMap[activePanel]}
                </h1>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => navigate("/couple/profile")}
                    className="rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-xs font-bold uppercase tracking-wider text-white transition hover:bg-white/10 active:scale-95 duration-200"
                  >
                    Profile
                  </button>
                </div>
              </header>

          <div className="flex-1 overflow-y-auto px-8 py-8 custom-scrollbar">
            {error ? (
              <div className="mb-6 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
                {error}
              </div>
            ) : null}

            {activePanel === "overview" ? (
              <div className="space-y-7">
                <div className="grid gap-4 xl:grid-cols-3">
                  <div className={metricCardClass}>
                    <p className="text-[42px] font-semibold leading-none text-white">
                      {quote.responses?.length || 0}
                    </p>
                    <p className="mt-2 text-sm uppercase tracking-[0.14em] text-[#b89f79]">
                      Proposals received
                    </p>
                  </div>
                  <div className={metricCardClass}>
                    <p className="text-[42px] font-semibold leading-none text-white">
                      {acceptedResponse ? 1 : 0}
                    </p>
                    <p className="mt-2 text-sm uppercase tracking-[0.14em] text-[#b89f79]">
                      Accepted
                    </p>
                  </div>
                  <div className={metricCardClass}>
                    <p className="text-[42px] font-semibold leading-none text-white">
                      {bestBidAmount
                        ? formatCurrency(bestBidAmount)
                        : "Awaiting"}
                    </p>
                    <p className="mt-2 text-sm uppercase tracking-[0.14em] text-[#b89f79]">
                      Best bid
                    </p>
                  </div>
                </div>

                <div className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_380px]">
                  <div className="rounded-[20px] border border-white/10 bg-white/5 p-6 shadow-xl backdrop-blur-md">
                    <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="text-xs uppercase tracking-[0.18em] text-[#b89f79] font-semibold">
                          Track your booking
                        </p>
                        <h2 style={{ fontFamily: "'Cormorant Garamond', serif" }} className="mt-1 text-3xl font-bold text-white tracking-wide">
                          Bid Progress
                        </h2>
                      </div>
                      <div className="rounded-xl border border-white/10 bg-white/5 px-3.5 py-1.5 text-xs text-white/70">
                        {progressMeta.completed}/{stepsMap.length} complete
                      </div>
                    </div>

                    <div className="relative pl-3">
                      <div className="absolute bottom-8 left-[22px] top-5 w-px bg-white/10" />
                      <div className="space-y-8">
                        {stepsMap.map((step) => {
                          const stepStatus = getStepStatus(
                            currentStatus,
                            step.key,
                          );
                          const isActive = stepStatus === "active";
                          const isDone = stepStatus === "done";
                          const isPrimaryAction = step.key === "pending";

                          return (
                            <button
                              key={step.key}
                              type="button"
                              onClick={() => {
                                if (
                                  step.key === "quoted" &&
                                  (quote.responses?.length || 0) > 0
                                ) {
                                  setActivePanel("proposals");
                                  return;
                                }
                                if (
                                  step.key === "accepted" &&
                                  quote.hiredPlanner
                                ) {
                                  setActivePanel("messages");
                                  return;
                                }
                                if (isPrimaryAction) {
                                  setActivePanel("overview");
                                }
                              }}
                              className="flex w-full items-start gap-5 text-left group outline-none"
                            >
                              <div className="relative z-10 flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-white/5 backdrop-blur-md">
                                <div
                                  className={`h-4 w-4 rounded-full transition-all duration-300 ${
                                    isActive
                                      ? "bg-[#e6c6b2] shadow-[0_0_10px_rgba(230,198,178,0.6)]"
                                      : isDone
                                        ? "bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.6)]"
                                        : "bg-white/20"
                                  }`}
                                />
                              </div>

                              <div className="min-w-0 flex-1 pt-1">
                                <div className="flex flex-wrap items-center gap-3">
                                  <h3
                                    className={`text-[18px] font-semibold transition-colors duration-200 ${
                                      isActive 
                                        ? "text-[#e6c6b2]" 
                                        : isDone 
                                          ? "text-white" 
                                          : "text-white/40"
                                    }`}
                                  >
                                    {step.label}
                                  </h3>
                                  {isActive ? (
                                    <span className="rounded-full bg-[#e6c6b2]/10 border border-[#e6c6b2]/20 px-2.5 py-0.5 text-[10px] font-bold text-[#e6c6b2]">
                                      Active
                                    </span>
                                  ) : null}
                                </div>
                                <p className={`mt-2 text-sm leading-relaxed transition-colors duration-200 ${isActive || isDone ? "text-white/60" : "text-white/30"}`}>
                                  {step.description}
                                </p>

                                {step.key === "pending" && isActive ? (
                                  <div className="mt-4 rounded-2xl border border-[#e6c6b2]/20 bg-[#e6c6b2]/5 px-4 py-3 text-sm text-[#e6c6b2] backdrop-blur-sm">
                                    Your request is live and planners are being
                                    matched now.
                                  </div>
                                ) : null}

                                {step.key === "quoted" &&
                                (quote.responses?.length || 0) > 0 ? (
                                  <div className="mt-4 rounded-2xl border border-[#e6c6b2]/20 bg-[#e6c6b2]/5 px-4 py-3 text-sm text-[#e6c6b2] backdrop-blur-sm">
                                    {quote.responses.length} proposal
                                    {quote.responses.length > 1
                                      ? "s are"
                                      : " is"}{" "}
                                    available for review. Open the proposals tab
                                    to compare prices and planners.
                                  </div>
                                ) : null}

                                {step.key === "accepted" &&
                                quote.hiredPlanner ? (
                                  <div className="mt-4 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 px-4 py-3 text-sm text-emerald-400 backdrop-blur-sm">
                                    Booking confirmed with{" "}
                                    {plannerLabel(quote.hiredPlanner)}. Continue
                                    the conversation in Messages.
                                  </div>
                                ) : null}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div className="rounded-[20px] border border-white/10 bg-white/5 p-6 shadow-xl backdrop-blur-md">
                      <p className="mb-4 text-xs uppercase tracking-[0.18em] text-[#b89f79] font-semibold">
                        Request overview
                      </p>
                      <div className="overflow-hidden rounded-[16px] border border-white/10 bg-black/40 p-2.5">
                        {quote.images?.[0] ? (
                          <img
                            src={quote.images[0].url}
                            alt={quote.images[0].label || "Wedding vision"}
                            className="aspect-[4/3] w-full rounded-[10px] object-cover"
                          />
                        ) : (
                          <div className="aspect-[4/3] w-full rounded-[10px] bg-white/[0.02] border border-dashed border-white/15 flex items-center justify-center text-white/20 text-xs font-bold uppercase tracking-wider">
                            No Image Provided
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="rounded-[20px] border border-white/10 bg-white/5 px-7 py-6 shadow-xl backdrop-blur-md">
                      <div className="space-y-6">
                        <div className="flex items-center justify-between border-b border-white/10 pb-4">
                          <span className="text-sm uppercase tracking-[0.16em] text-white/50">
                            Budget
                          </span>
                          <span className="text-[18px] font-semibold text-white">
                            {quote.eventDetails?.budget || "Flexible"}
                          </span>
                        </div>
                        <div className="flex items-center justify-between border-b border-white/10 pb-4">
                          <span className="text-sm uppercase tracking-[0.16em] text-white/50">
                            Location
                          </span>
                          <span className="text-[18px] font-semibold text-white">
                            {quote.eventDetails?.city || "TBD"}
                          </span>
                        </div>
                        <div className="flex items-center justify-between border-b border-white/10 pb-4">
                          <span className="text-sm uppercase tracking-[0.16em] text-white/50">
                            Guests
                          </span>
                          <span className="text-[18px] font-semibold text-white">
                            {quote.eventDetails?.guestCount || "TBD"}
                          </span>
                        </div>
                        <div className="flex items-center justify-between border-b border-white/10 pb-4">
                          <span className="text-sm uppercase tracking-[0.16em] text-white/50">
                            Wedding date
                          </span>
                          <span className="text-[18px] font-semibold text-white">
                            {formatDate(quote.eventDetails?.weddingDate)}
                          </span>
                        </div>
                        <div>
                          <span className="text-sm uppercase tracking-[0.16em] text-white/50">
                            Notes
                          </span>
                          <p className="mt-3 text-[15px] leading-relaxed text-white/70">
                            {quote.eventDetails?.notes ||
                              "No special notes added yet."}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : null}

            {activePanel === "proposals" ? (
              <div className="space-y-7">
                <div className="grid gap-4 xl:grid-cols-3">
                  <div className={metricCardClass}>
                    <p className="text-[42px] font-semibold leading-none text-white">
                      {quote.responses?.length || 0}
                    </p>
                    <p className="mt-2 text-sm uppercase tracking-[0.14em] text-[#b89f79] font-semibold">
                      Proposals received
                    </p>
                  </div>
                  <div className={metricCardClass}>
                    <p className="text-[42px] font-semibold leading-none text-white">
                      {acceptedResponse ? 1 : 0}
                    </p>
                    <p className="mt-2 text-sm uppercase tracking-[0.14em] text-[#b89f79] font-semibold">
                      Accepted
                    </p>
                  </div>
                  <div className={metricCardClass}>
                    <p className="text-[42px] font-semibold leading-none text-white">
                      {bestBidAmount
                        ? formatCurrency(bestBidAmount)
                        : "Awaiting"}
                    </p>
                    <p className="mt-2 text-sm uppercase tracking-[0.14em] text-[#b89f79] font-semibold">
                      Best bid
                    </p>
                  </div>
                </div>

                <div className="space-y-5">
                  {quote.responses?.length ? (
                    quote.responses.map((resp, index) => {
                      const planner = resp.planner;
                      const isAccepted = resp.status === "accepted";
                      const isRejected = resp.status === "rejected";
                      const canOpenChat =
                        quote.status === "accepted" &&
                        quote.hiredPlanner?._id === planner?._id &&
                        isAccepted;

                      return (
                        <div
                          key={resp._id || index}
                          className="rounded-[20px] border border-white/10 bg-white/5 p-6 shadow-xl backdrop-blur-md"
                        >
                          <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-4">
                                <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-full bg-white/10 text-lg font-semibold text-white">
                                  {planner?.avatar ? (
                                    <img
                                      src={planner.avatar}
                                      alt=""
                                      className="h-full w-full object-cover"
                                    />
                                  ) : (
                                    plannerInitial(planner)
                                  )}
                                </div>
                                <div className="min-w-0">
                                  <p className="truncate text-[18px] font-semibold text-white">
                                    {plannerLabel(planner)}
                                  </p>
                                  <p className="mt-1 text-sm text-white/40">
                                    Submitted {formatDate(resp.createdAt)}
                                  </p>
                                </div>
                              </div>

                              <p className="mt-5 text-[17px] leading-relaxed text-white/80">
                                {resp.quotedMessage ||
                                  "Planner shared a quotation for your celebration requirements."}
                              </p>

                              <div className="mt-5 flex flex-wrap gap-3">
                                <button
                                  type="button"
                                  onClick={() =>
                                    openChatForPlanner(planner?._id)
                                  }
                                  disabled={!canOpenChat}
                                  className="rounded-xl border border-white/15 bg-white/5 px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
                                >
                                  {canOpenChat ? "Open chat" : "Accept to chat"}
                                </button>
                                {!isAccepted && quote.status !== "accepted" ? (
                                  <button
                                    type="button"
                                    onClick={() => handleAccept(planner?._id)}
                                    disabled={
                                      actionLoading === `accept_${planner?._id}`
                                    }
                                    className="rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-white transition-all duration-200 hover:brightness-105 disabled:opacity-50"
                                  >
                                    {actionLoading === `accept_${planner?._id}`
                                      ? "Accepting..."
                                      : "Accept proposal"}
                                  </button>
                                ) : null}
                                {!isRejected &&
                                !isAccepted &&
                                quote.status !== "accepted" ? (
                                  <button
                                    type="button"
                                    onClick={() => handleReject(planner?._id)}
                                    disabled={
                                      actionLoading === `reject_${planner?._id}`
                                    }
                                    className="rounded-xl border border-red-500/20 bg-red-500/10 px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-red-400 transition hover:bg-red-500 hover:text-white disabled:opacity-50"
                                  >
                                    {actionLoading === `reject_${planner?._id}`
                                      ? "Declining..."
                                      : "Decline"}
                                  </button>
                                ) : null}
                                <button
                                  type="button"
                                  onClick={() =>
                                    navigate(`/planner/profile/${planner?._id}`)
                                  }
                                  className="rounded-xl border border-white/15 bg-white/5 px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-white transition hover:bg-white/10"
                                >
                                  View profile
                                </button>
                              </div>
                            </div>

                            <div className="xl:text-right">
                              <p className="text-[30px] font-bold text-white">
                                {formatCurrency(resp.quotedPrice)}
                              </p>
                              <span
                                className={`mt-3 inline-flex rounded-full px-4 py-1.5 text-xs font-bold border ${
                                  isAccepted
                                    ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                                    : isRejected
                                      ? "bg-red-500/10 border-red-500/20 text-red-400"
                                      : "bg-[#e6c6b2]/10 border-[#e6c6b2]/20 text-[#e6c6b2]"
                                }`}
                              >
                                {isAccepted
                                  ? "Accepted"
                                  : isRejected
                                    ? "Rejected"
                                    : "Pending"}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="rounded-[20px] border border-dashed border-white/15 bg-white/[0.02] p-8 text-center text-sm text-white/40">
                      Proposals will appear here as soon as planners respond to
                      your request.
                    </div>
                  )}

                  {rejectedResponses.length > 0 ? (
                    <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
                      {rejectedResponses.length} proposal
                      {rejectedResponses.length > 1 ? "s were" : " was"}{" "}
                      declined. You can still wait for better planner responses.
                    </div>
                  ) : null}
                </div>
              </div>
            ) : null}

            {activePanel === "messages" ? (
              <div className="space-y-6">
                <div className="rounded-[20px] border border-white/10 bg-white/5 shadow-xl backdrop-blur-md overflow-hidden">
                  <div className="grid min-h-[640px] lg:grid-cols-[320px_minmax(0,1fr)]">
                    <div className="border-b border-white/10 p-5 lg:border-b-0 lg:border-r">
                      <div className="mb-5">
                        <h2 className="text-[18px] font-semibold text-white">
                          Messages
                        </h2>
                        <p className="mt-1 text-sm text-white/40">
                          Continue planner conversations for this bid.
                        </p>
                      </div>

                      <div className="space-y-3">
                        {quoteRooms.length > 0 ? (
                          quoteRooms.map((room) => {
                            const other = room.participants?.find(
                              (participant) =>
                                normalizeId(participant) !==
                                normalizeId(currentUserId),
                            );

                            return (
                              <button
                                key={room._id}
                                type="button"
                                onClick={() => setActiveRoomId(room._id)}
                                className={`flex w-full items-center gap-3 rounded-xl px-4 py-3.5 text-left transition duration-200 ${
                                  activeRoomId === room._id
                                    ? "bg-white/10 border border-white/15 text-[#e6c6b2] shadow-sm font-semibold"
                                    : "hover:bg-white/5 text-white/70"
                                }`}
                              >
                                <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-full bg-white/10 text-sm font-semibold text-white">
                                  {other?.avatar ? (
                                    <img
                                      src={other.avatar}
                                      alt=""
                                      className="h-full w-full object-cover"
                                    />
                                  ) : (
                                    plannerInitial(other)
                                  )}
                                </div>
                                <div className="min-w-0 flex-1">
                                  <p className="truncate text-[16px] font-semibold text-white">
                                    {plannerLabel(other)}
                                  </p>
                                  <p className="truncate text-sm text-white/40">
                                    {room.lastMessage?.content ||
                                      "Start the conversation"}
                                  </p>
                                </div>
                              </button>
                            );
                          })
                        ) : (
                          <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-4 text-sm text-white/40 text-center">
                            No planner chats yet. Open one from a proposal card
                            first.
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex h-[640px] flex-col">
                      {activeRoom ? (
                        <>
                          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 px-6 py-5">
                            <div>
                              <p className="text-[18px] font-semibold text-white">
                                {plannerLabel(
                                  activeRoom.participants?.find(
                                    (participant) =>
                                      normalizeId(participant) !==
                                      normalizeId(currentUserId),
                                  ),
                                )}
                              </p>
                              <p className="mt-1 text-sm text-white/40">
                                {quote.status === "accepted"
                                  ? "Accepted planner"
                                  : "Planner conversation"}
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() =>
                                navigate(
                                  `/planner/profile/${
                                    activeRoom.participants?.find(
                                      (participant) =>
                                        normalizeId(participant) !==
                                        normalizeId(currentUserId),
                                    )?._id
                                  }`,
                                )
                              }
                              className="rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-xs font-bold uppercase tracking-wider text-white transition hover:bg-white/10"
                            >
                              View profile
                            </button>
                          </div>

                          <div className="flex-1 overflow-y-auto px-6 py-6">
                            {chatLoading ? (
                              <div className="flex h-full items-center justify-center text-sm text-white/40">
                                Loading messages...
                              </div>
                            ) : messages.length > 0 ? (
                              <div className="space-y-4">
                                {messages.map((message) => {
                                  const isMine = isOwnMessage(
                                    message,
                                    currentUserId,
                                  );
                                  return (
                                    <div
                                      key={message._id}
                                      className={`flex ${isMine ? "justify-end" : "justify-start"}`}
                                    >
                                      <div
                                        className={`max-w-[78%] ${isMine ? "text-right" : "text-left"}`}
                                      >
                                        <div
                                          className={`inline-block rounded-[18px] px-4 py-3 text-[15px] leading-relaxed ${
                                            isMine
                                              ? "bg-gradient-to-r from-[#e6c6b2] to-[#d4a878] text-[#3D1B2D] font-medium rounded-br-[4px]"
                                              : "bg-white/5 border border-white/10 text-white rounded-bl-[4px]"
                                          }`}
                                        >
                                          {message.fileUrl
                                            ? renderAttachment(message)
                                            : null}
                                          {message.content ? (
                                            <p
                                              className={`${message.fileUrl ? "mt-2" : ""} whitespace-pre-wrap break-words`}
                                            >
                                              {message.content}
                                            </p>
                                          ) : null}
                                        </div>
                                        <p className="mt-2 text-xs text-white/30">
                                          {formatTime(message.createdAt)}
                                        </p>
                                      </div>
                                    </div>
                                  );
                                })}
                                <div ref={messageEndRef} />
                              </div>
                            ) : (
                              <div className="flex h-full items-center justify-center text-center text-sm text-white/40">
                                Start discussing your requirements with the
                                planner here.
                              </div>
                            )}
                          </div>

                          <div className="border-t border-white/10 p-5">
                            {error ? (
                              <div className="mb-3 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
                                {error}
                              </div>
                            ) : null}
                            {selectedFile ? (
                              <div className="mb-3 flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/40">
                                <span className="truncate">
                                  {selectedFile.name}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => setSelectedFile(null)}
                                  className="text-white/40 transition hover:text-white"
                                >
                                  Remove
                                </button>
                              </div>
                            ) : null}

                            <div className="flex gap-3">
                              <button
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                className="flex h-12 w-12 items-center justify-center rounded-full border border-white/15 bg-white/5 text-xl text-white transition hover:bg-white/10"
                              >
                                +
                              </button>
                              <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.zip,.rar"
                                className="hidden"
                                onChange={(event) =>
                                  setSelectedFile(
                                    event.target.files?.[0] || null,
                                  )
                                }
                              />
                              <input
                                value={draft}
                                onChange={(event) =>
                                  setDraft(event.target.value)
                                }
                                onKeyDown={(event) => {
                                  if (
                                    event.key === "Enter" &&
                                    !event.shiftKey
                                  ) {
                                    event.preventDefault();
                                    handleSendMessage();
                                  }
                                }}
                                placeholder="Type a message..."
                                className="flex-1 rounded-full border border-white/10 bg-black/30 px-5 py-3 text-sm placeholder:text-white/30 text-white focus:border-white/20 transition outline-none"
                              />
                              <button
                                type="button"
                                onClick={handleSendMessage}
                                disabled={
                                  sending || (!draft.trim() && !selectedFile)
                                }
                                className="rounded-full bg-[#8f6d49] px-6 py-3 text-sm font-semibold text-white disabled:opacity-60"
                              >
                                {sending ? "Sending..." : "Send"}
                              </button>
                            </div>
                          </div>
                        </>
                      ) : (
                        <div className="flex h-full min-h-[640px] items-center justify-center px-6 text-center text-sm text-[#8d8174]">
                          Open a planner chat from the proposals section to
                          continue everything here inside the bid CRM.
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ) : null}
            </div>
          </section>
        </div>
      </section>
    </div>
  </main>
  );
}
