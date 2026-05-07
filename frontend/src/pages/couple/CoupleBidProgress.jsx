import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { io } from "socket.io-client";
import { chatAPI, quoteAPI } from "../../api/api";
import { useAuth } from "../../context/AuthContext";

const apiBaseUrl =
  process.env.REACT_APP_API_BASE_URL || "http://localhost:5000";

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

const getDefaultPanel = (quote, requestedPanel) => {
  if (requestedPanel) return requestedPanel;
  if (quote?.status === "accepted") return "messages";
  if ((quote?.responses || []).length > 0) return "proposals";
  return "overview";
};

const metricCardClass =
  "rounded-[24px] border border-[#5d4421] bg-[#1b1512] px-6 py-5 shadow-[0_6px_18px_rgba(0,0,0,0.35)]";

export default function CoupleBidProgress() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser } = useAuth();

  const [quote, setQuote] = useState(null);
  const [rooms, setRooms] = useState([]);
  const [activeRoomId, setActiveRoomId] = useState(
    location.state?.roomId || "",
  );
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState("");
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
    messageEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (!currentUser?.id) return undefined;

    const socket = io(apiBaseUrl, { transports: ["websocket", "polling"] });
    socketRef.current = socket;
    socket.emit("join", currentUser.id);

    if (activeRoomId) {
      socket.emit("join_chat", activeRoomId);
    }

    socket.on("quote_update", (data) => {
      if (data.quoteId === id) {
        fetchQuote().catch(() => {});
      }
    });

    socket.on("new_message", (payload) => {
      if (!payload?.roomId || !payload?.message) return;

      setRooms((prevRooms) => {
        const existing = prevRooms.find((room) => room._id === payload.roomId);
        if (!existing) return prevRooms;

        const updated = {
          ...existing,
          lastMessage: {
            content: payload.message.content,
            sender: payload.message.sender,
            timestamp: payload.message.createdAt || new Date().toISOString(),
          },
          updatedAt: payload.message.createdAt || new Date().toISOString(),
        };

        return [
          updated,
          ...prevRooms.filter((room) => room._id !== payload.roomId),
        ];
      });

      if (payload.roomId === activeRoomId) {
        setMessages((prev) => [...prev, payload.message]);
      }
    });

    return () => {
      if (activeRoomId) {
        socket.emit("leave_chat", activeRoomId);
      }
      socket.off("quote_update");
      socket.off("new_message");
      socket.disconnect();
    };
  }, [activeRoomId, currentUser?.id, fetchQuote, id]);

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
        await openChatForPlanner(plannerId, "messages");
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
    if (!draft.trim() || !activeRoomId) return;

    setSending(true);
    setError("");

    try {
      const data = await chatAPI.sendMessage(activeRoomId, {
        content: draft.trim(),
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
      }
    } catch (err) {
      setError(err.response?.data?.error || "Failed to send message.");
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f3efe7]">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#d7c7ae] border-t-[#1b1b1b]" />
      </div>
    );
  }

  if (error && !quote) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#f3efe7] px-4 text-center text-[#1d1d1b]">
        <h1 className="mb-3 text-3xl font-semibold">
          Bid Dashboard Unavailable
        </h1>
        <p className="mb-6 max-w-md text-[#6d655c]">{error}</p>
        <button
          type="button"
          onClick={() => navigate("/couple/profile")}
          className="rounded-xl bg-[#1f1b18] px-6 py-3 text-sm font-semibold text-white"
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
    <main className="min-h-screen bg-[#171311] text-white">
      <div className="flex min-h-screen flex-col lg:flex-row">
        <aside className="w-full border-b border-[#5d4421] bg-[#1b1512] lg:min-h-screen lg:w-[300px] lg:border-b-0 lg:border-r">
          <div className="border-b border-[#5d4421] px-7 py-6">
            <button
              type="button"
              onClick={() =>
                navigate("/couple/profile", { state: { activeTab: "bids" } })
              }
              className="text-left"
            >
              <p className="text-[34px] font-semibold leading-none text-[#f7e7c7]">
                LoversAI
              </p>
              <p className="mt-2 text-lg text-[#c9b38a]">Wedding CRM</p>
            </button>
          </div>

          <div className="px-5 py-6">
            <p className="mb-4 text-xs uppercase tracking-[0.22em] text-[#b89f79]">
              Couple Menu
            </p>

            <div className="space-y-2">
              <button
                type="button"
                onClick={() => navigate("/couple/cart")}
                className="flex w-full items-center justify-between rounded-2xl px-4 py-3 text-left text-white/90 transition hover:bg-white/5"
              >
                <span className="font-medium">+ New bid</span>
              </button>

              {menuItems.map((item) => {
                const isActive = activePanel === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setActivePanel(item.id)}
                    className={`flex w-full items-center justify-between rounded-2xl px-4 py-3 text-left transition ${
                      isActive
                        ? "bg-[#2b2118] text-[#f7e7c7] shadow-sm"
                        : "text-white/80 hover:bg-white/5"
                    }`}
                  >
                    <span className="font-medium">{item.label}</span>
                    {item.badge ? (
                      <span className="rounded-full bg-[#f4ead7] px-2.5 py-1 text-xs font-semibold text-[#8f6d28]">
                        {item.badge}
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>

            <div className="mt-8 rounded-[24px] border border-[#5d4421] bg-[#1b1512] px-4 py-5">
              <p className="text-xs uppercase tracking-[0.2em] text-[#b89f79]">
                Request Id
              </p>
              <p className="mt-2 text-lg font-semibold text-white">
                {quote._id.slice(-6).toUpperCase()}
              </p>
              <p className="mt-3 text-sm leading-6 text-[#c9b38a]">
                Submitted on {formatDate(quote.createdAt)} for{" "}
                {quote.eventDetails?.city || "your wedding"}.
              </p>
            </div>
          </div>
        </aside>

        <section className="min-w-0 flex-1">
          <header className="flex flex-wrap items-center justify-between gap-3 border-b border-[#5d4421] bg-[#1b1512] px-8 py-5">
            <h1 className="text-[22px] font-semibold text-[#f7e7c7]">
              {titleMap[activePanel]}
            </h1>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() =>
                  navigate("/couple/bid-placed", {
                    state: { quoteId: quote._id },
                  })
                }
                className="rounded-full border border-[#5d4421] px-4 py-2 text-sm text-white/80 transition hover:bg-white/5"
              >
                Journey view
              </button>
              <div className="rounded-full bg-[#fae9b8] px-4 py-2 text-sm font-semibold text-[#946d18]">
                Couple
              </div>
            </div>
          </header>

          <div className="px-8 py-8">
            {error ? (
              <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
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
                  <div className="rounded-[28px] border border-[#5d4421] bg-[#1b1512] p-6 shadow-[0_6px_18px_rgba(0,0,0,0.35)]">
                    <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="text-sm uppercase tracking-[0.18em] text-[#b89f79]">
                          Track your booking
                        </p>
                        <h2 className="mt-2 text-3xl font-semibold text-[#f7e7c7]">
                          Bid progress
                        </h2>
                      </div>
                      <div className="rounded-full border border-[#3b2b1f] bg-[#2b2118] px-4 py-2 text-sm text-[#c9b38a]">
                        {progressMeta.completed}/{stepsMap.length} complete
                      </div>
                    </div>

                    <div className="relative pl-3">
                      <div className="absolute bottom-8 left-[28px] top-5 w-px bg-[#342616]" />
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
                              className="flex w-full items-start gap-5 text-left"
                            >
                              <div className="relative z-10 flex h-11 w-11 items-center justify-center rounded-full border border-[#5d4421] bg-[#2b2118]">
                                <div
                                  className={`h-4 w-4 rounded-full ${
                                    isActive
                                      ? "bg-[#171412]"
                                      : isDone
                                        ? "bg-[#27a36a]"
                                        : "bg-[#cabfaf]"
                                  }`}
                                />
                              </div>

                              <div className="min-w-0 flex-1 pt-1">
                                <div className="flex flex-wrap items-center gap-3">
                                  <h3
                                    className={`text-[18px] font-semibold ${isActive ? "text-[#15120f]" : "text-[#5a5147]"}`}
                                  >
                                    {step.label}
                                  </h3>
                                  {isActive ? (
                                    <span className="rounded-full bg-[#fff5df] px-3 py-1 text-xs font-semibold text-[#9f7412]">
                                      Active
                                    </span>
                                  ) : null}
                                </div>
                                <p className="mt-2 text-sm leading-6 text-[#73695e]">
                                  {step.description}
                                </p>

                                {step.key === "pending" && isActive ? (
                                  <div className="mt-4 rounded-2xl bg-[#f7f2ea] px-4 py-3 text-sm text-[#6a6157]">
                                    Your request is live and planners are being
                                    matched now.
                                  </div>
                                ) : null}

                                {step.key === "quoted" &&
                                (quote.responses?.length || 0) > 0 ? (
                                  <div className="mt-4 rounded-2xl bg-[#f7f2ea] px-4 py-3 text-sm text-[#6a6157]">
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
                                  <div className="mt-4 rounded-2xl bg-[#edf8f1] px-4 py-3 text-sm text-[#2f7b51]">
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
                    <div className="rounded-[28px] border border-[#5d4421] bg-[#1b1512] p-6 shadow-[0_6px_18px_rgba(0,0,0,0.35)]">
                      <p className="mb-4 text-sm uppercase tracking-[0.18em] text-[#b0a494]">
                        Request overview
                      </p>
                      <div className="overflow-hidden rounded-[24px] border border-[#3b2b1f] bg-[#2b2118] p-4">
                        {quote.images?.[0] ? (
                          <img
                            src={quote.images[0].url}
                            alt={quote.images[0].label || "Wedding vision"}
                            className="aspect-[4/3] w-full rounded-[20px] object-cover"
                          />
                        ) : (
                          <div className="aspect-[4/3] w-full rounded-[20px] bg-[#2b2118]" />
                        )}
                      </div>
                    </div>

                    <div className="rounded-[28px] border border-[#5d4421] bg-[#1b1512] px-7 py-6 shadow-[0_6px_18px_rgba(0,0,0,0.35)]">
                      <div className="space-y-6">
                        <div className="flex items-center justify-between border-b border-[#eee6da] pb-4">
                          <span className="text-sm uppercase tracking-[0.16em] text-[#b0a494]">
                            Budget
                          </span>
                          <span className="text-[18px] font-semibold">
                            {quote.eventDetails?.budget || "Flexible"}
                          </span>
                        </div>
                        <div className="flex items-center justify-between border-b border-[#eee6da] pb-4">
                          <span className="text-sm uppercase tracking-[0.16em] text-[#b0a494]">
                            Location
                          </span>
                          <span className="text-[18px] font-semibold">
                            {quote.eventDetails?.city || "TBD"}
                          </span>
                        </div>
                        <div className="flex items-center justify-between border-b border-[#eee6da] pb-4">
                          <span className="text-sm uppercase tracking-[0.16em] text-[#b0a494]">
                            Guests
                          </span>
                          <span className="text-[18px] font-semibold">
                            {quote.eventDetails?.guestCount || "TBD"}
                          </span>
                        </div>
                        <div className="flex items-center justify-between border-b border-[#eee6da] pb-4">
                          <span className="text-sm uppercase tracking-[0.16em] text-[#b0a494]">
                            Wedding date
                          </span>
                          <span className="text-[18px] font-semibold">
                            {formatDate(quote.eventDetails?.weddingDate)}
                          </span>
                        </div>
                        <div>
                          <span className="text-sm uppercase tracking-[0.16em] text-[#b0a494]">
                            Notes
                          </span>
                          <p className="mt-3 text-[15px] leading-7 text-[#655c53]">
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
                    <p className="text-[42px] font-semibold leading-none">
                      {quote.responses?.length || 0}
                    </p>
                    <p className="mt-2 text-sm uppercase tracking-[0.14em] text-[#b0a494]">
                      Proposals received
                    </p>
                  </div>
                  <div className={metricCardClass}>
                    <p className="text-[42px] font-semibold leading-none">
                      {acceptedResponse ? 1 : 0}
                    </p>
                    <p className="mt-2 text-sm uppercase tracking-[0.14em] text-[#b0a494]">
                      Accepted
                    </p>
                  </div>
                  <div className={metricCardClass}>
                    <p className="text-[42px] font-semibold leading-none">
                      {bestBidAmount
                        ? formatCurrency(bestBidAmount)
                        : "Awaiting"}
                    </p>
                    <p className="mt-2 text-sm uppercase tracking-[0.14em] text-[#b0a494]">
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

                      return (
                        <div
                          key={resp._id || index}
                          className="rounded-[28px] border border-[#5d4421] bg-[#1b1512] p-6 shadow-[0_6px_18px_rgba(0,0,0,0.35)]"
                        >
                          <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-4">
                                <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-full bg-[#2b2118] text-lg font-semibold text-[#f7e7c7]">
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
                                  <p className="mt-1 text-sm text-[#c9b38a]">
                                    Submitted {formatDate(resp.createdAt)}
                                  </p>
                                </div>
                              </div>

                              <p className="mt-5 text-[17px] leading-8 text-[#c9b38a]">
                                {resp.quotedMessage ||
                                  "Planner shared a quotation for your celebration requirements."}
                              </p>

                              <div className="mt-5 flex flex-wrap gap-3">
                                <button
                                  type="button"
                                  onClick={() =>
                                    openChatForPlanner(planner?._id)
                                  }
                                  className="rounded-2xl border border-[#3b2b1f] px-6 py-3 text-sm font-medium text-[#f7e7c7] transition hover:bg-white/3"
                                >
                                  Open chat
                                </button>
                                {!isAccepted && quote.status !== "accepted" ? (
                                  <button
                                    type="button"
                                    onClick={() => handleAccept(planner?._id)}
                                    disabled={
                                      actionLoading === `accept_${planner?._id}`
                                    }
                                    className="rounded-2xl bg-[#1f9c6d] px-6 py-3 text-sm font-semibold text-white transition hover:brightness-105 disabled:opacity-60"
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
                                    className="rounded-2xl border border-[#5d4421] px-6 py-3 text-sm font-medium text-[#c9b38a] transition hover:bg-white/5 disabled:opacity-60"
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
                                  className="rounded-2xl border border-[#5d4421] px-6 py-3 text-sm font-medium text-[#c9b38a] transition hover:bg-white/5"
                                >
                                  View profile
                                </button>
                              </div>
                            </div>

                            <div className="xl:text-right">
                              <p className="text-[30px] font-semibold text-white">
                                {formatCurrency(resp.quotedPrice)}
                              </p>
                              <span
                                className={`mt-3 inline-flex rounded-full px-4 py-2 text-sm font-semibold ${
                                  isAccepted
                                    ? "bg-[#ddf3e6] text-[#1c8f5e]"
                                    : isRejected
                                      ? "bg-[#f7dede] text-[#bb4444]"
                                      : "bg-[#faedc7] text-[#946d18]"
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
                    <div className="rounded-[28px] border border-[#ddd4c7] bg-white p-8 text-sm text-[#756b60]">
                      Proposals will appear here as soon as planners respond to
                      your request.
                    </div>
                  )}

                  {rejectedResponses.length > 0 ? (
                    <div className="rounded-2xl border border-[#e5ddd0] bg-[#fbf8f4] px-4 py-3 text-sm text-[#756b60]">
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
                <div className="rounded-[28px] border border-[#5d4421] bg-[#1b1512] shadow-[0_6px_18px_rgba(0,0,0,0.35)]">
                  <div className="grid min-h-[640px] lg:grid-cols-[320px_minmax(0,1fr)]">
                    <div className="border-b border-[#e9dfd2] p-5 lg:border-b-0 lg:border-r">
                      <div className="mb-5">
                        <h2 className="text-[18px] font-semibold text-white">
                          Messages
                        </h2>
                        <p className="mt-1 text-sm text-[#c9b38a]">
                          Continue planner conversations for this bid.
                        </p>
                      </div>

                      <div className="space-y-3">
                        {quoteRooms.length > 0 ? (
                          quoteRooms.map((room) => {
                            const other = room.participants?.find(
                              (participant) =>
                                participant._id !== currentUser?.id,
                            );

                            return (
                              <button
                                key={room._id}
                                type="button"
                                onClick={() => setActiveRoomId(room._id)}
                                className={`flex w-full items-center gap-3 rounded-2xl px-4 py-4 text-left transition ${
                                  activeRoomId === room._id
                                    ? "bg-[#2b2118]"
                                    : "hover:bg-white/5"
                                }`}
                              >
                                <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-full bg-[#2b2118] text-sm font-semibold text-[#f7e7c7]">
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
                                  <p className="truncate text-sm text-[#c9b38a]">
                                    {room.lastMessage?.content ||
                                      "Start the conversation"}
                                  </p>
                                </div>
                              </button>
                            );
                          })
                        ) : (
                          <div className="rounded-2xl border border-[#5d4421] bg-[#1b1512] px-4 py-4 text-sm text-[#c9b38a]">
                            No planner chats yet. Open one from a proposal card
                            first.
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex min-h-[640px] flex-col">
                      {activeRoom ? (
                        <>
                          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#e9dfd2] px-6 py-5">
                            <div>
                              <p className="text-[18px] font-semibold">
                                {plannerLabel(
                                  activeRoom.participants?.find(
                                    (participant) =>
                                      participant._id !== currentUser?.id,
                                  ),
                                )}
                              </p>
                              <p className="mt-1 text-sm text-[#93887b]">
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
                                        participant._id !== currentUser?.id,
                                    )?._id
                                  }`,
                                )
                              }
                              className="rounded-2xl border border-[#ddd4c7] px-4 py-2 text-sm font-medium text-[#6c6257] transition hover:bg-[#f7f2ea]"
                            >
                              View profile
                            </button>
                          </div>

                          <div className="flex-1 overflow-y-auto px-6 py-6">
                            {chatLoading ? (
                              <div className="flex h-full items-center justify-center text-sm text-[#8d8174]">
                                Loading messages...
                              </div>
                            ) : messages.length > 0 ? (
                              <div className="space-y-6">
                                {messages.map((message) => {
                                  const isMine =
                                    message.sender?._id === currentUser?.id;
                                  return (
                                    <div
                                      key={message._id}
                                      className={`flex ${isMine ? "justify-end" : "justify-start"}`}
                                    >
                                      <div
                                        className={`max-w-[78%] ${isMine ? "text-right" : "text-left"}`}
                                      >
                                        <div
                                          className={`inline-block rounded-[22px] px-5 py-4 text-[16px] leading-7 ${
                                            isMine
                                              ? "bg-[#1f1b18] text-white"
                                              : "bg-[#2b2118] text-[#f7e7c7]"
                                          }`}
                                        >
                                          {message.content}
                                        </div>
                                        <p className="mt-2 text-xs text-[#b1a496]">
                                          {formatTime(message.createdAt)}
                                        </p>
                                      </div>
                                    </div>
                                  );
                                })}
                                <div ref={messageEndRef} />
                              </div>
                            ) : (
                              <div className="flex h-full items-center justify-center text-center text-sm text-[#8d8174]">
                                Start discussing your requirements with the
                                planner here.
                              </div>
                            )}
                          </div>

                          <div className="border-t border-[#342616] p-5">
                            <div className="flex gap-3">
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
                                className="flex-1 rounded-full border border-[#5d4421] bg-[#1b1512] px-5 py-3 text-sm outline-none placeholder:text-[#c9b38a] text-white"
                              />
                              <button
                                type="button"
                                onClick={handleSendMessage}
                                disabled={sending || !draft.trim()}
                                className="rounded-full bg-[#1f1b18] px-6 py-3 text-sm font-semibold text-white disabled:opacity-60"
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
    </main>
  );
}
