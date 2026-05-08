import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { io } from "socket.io-client";
import { quoteAPI } from "../../api/api";
import { useAuth } from "../../context/AuthContext";

const apiBaseUrl =
  process.env.REACT_APP_API_BASE_URL || "http://localhost:5000";

const stepsMap = [
  {
    label: "Bid Placed",
    key: "pending",
    description: "Finding the perfect planners for your vision...",
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

const CoupleBidPlaced = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser } = useAuth();
  const [quote, setQuote] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const quoteId = location.state?.quoteId || null;
  const justSubmitted = Boolean(location.state?.justSubmitted);

  useEffect(() => {
    const fetchLatestQuote = async () => {
      setLoading(true);
      setError("");
      try {
        if (quoteId) {
          const data = await quoteAPI.getById(quoteId);
          if (data.success) {
            setQuote(data.quote);
            return;
          }
        }

        const data = await quoteAPI.getMyQuotes();
        if (data.success && data.quotes?.length) {
          setQuote(data.quotes[0]);
          return;
        }

        setError("We couldn't find your latest bid yet.");
      } catch (err) {
        setError(
          err.response?.data?.error || "Failed to load your bid details.",
        );
      } finally {
        setLoading(false);
      }
    };

    fetchLatestQuote();
  }, [quoteId]);

  useEffect(() => {
    if (!currentUser?.id || !quote?._id) return undefined;

    const socket = io(apiBaseUrl, { transports: ["websocket", "polling"] });
    socket.emit("join", currentUser.id);

    socket.on("quote_update", (data) => {
      if (data.quoteId === quote._id) {
        quoteAPI
          .getById(quote._id)
          .then((res) => {
            if (res.success) setQuote(res.quote);
          })
          .catch((err) => {
            console.error(
              `CoupleBidPlaced.jsx: quoteAPI.getById failed for quote ${quote._id}:`,
              err,
            );
          });
      }
    });

    return () => {
      socket.off("quote_update");
      socket.disconnect();
    };
  }, [currentUser?.id, quote?._id]);

  const progressMeta = useMemo(() => {
    if (!quote) return { completed: 0, activeStep: stepsMap[0] };
    const completed = stepsMap.filter(
      (step) => getStepStatus(quote.status, step.key) === "done",
    ).length;
    const activeStep =
      stepsMap.find(
        (step) => getStepStatus(quote.status, step.key) === "active",
      ) || stepsMap[0];
    return { completed, activeStep };
  }, [quote]);

  if (loading) {
    return (
      <div className="min-h-screen loverai-page-bg flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-loverai-gold/30 border-t-loverai-gold rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !quote) {
    return (
      <div className="min-h-screen loverai-page-bg flex flex-col items-center justify-center px-4 text-center text-white">
        <h1 className="font-heading text-3xl mb-3">Bid Flow Unavailable</h1>
        <p className="text-white/55 max-w-md mb-6">{error}</p>
        <button
          onClick={() => navigate("/couple/profile")}
          className="rounded-xl bg-[#f4d3bf] px-6 py-3 text-sm font-semibold text-[#1d1714]"
        >
          Go to Dashboard
        </button>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-[#0d0907] px-4 py-8 text-white md:px-8">
      <div className="mx-auto max-w-[1280px]">
        <div className="mb-6 flex items-center justify-between">
          <button
            type="button"
            onClick={() => navigate("/couple/profile")}
            className="rounded-full border border-white/10 bg-white/[0.03] px-4 py-2 text-sm text-white/70 transition hover:bg-white/[0.06]"
          >
            Back
          </button>
          <button
            type="button"
            onClick={() =>
              navigate(`/couple/bid-dashboard/${quote._id}`, {
                state: { justSubmitted },
              })
            }
            className="rounded-full bg-[#f0d0bd] px-5 py-2 text-sm font-semibold text-[#1d1714] transition hover:brightness-105"
          >
            Open Bid Dashboard
          </button>
        </div>

        <div className="grid gap-8 lg:grid-cols-[1.1fr_360px]">
          <section className="rounded-[34px] border border-white/10 bg-[#1a1411]/92 p-7 shadow-[0_0_0_1px_rgba(255,255,255,0.03)] md:p-10">
            <div className="mb-8 flex items-center justify-between">
              <div>
                <p className="text-[11px] uppercase tracking-[0.28em] text-[#bdaea4]">
                  Bid Journey
                </p>
                <h1 className="mt-3 font-heading text-3xl text-[#f3d4e2] md:text-4xl">
                  {justSubmitted ? "Bid Placed" : "Track Your Booking"}
                </h1>
              </div>
              <div className="rounded-full border border-white/10 bg-white/[0.03] px-4 py-2 text-xs text-white/55">
                {progressMeta.completed}/{stepsMap.length} complete
              </div>
            </div>

            <div className="relative pl-3">
              <div className="absolute left-[34px] top-6 bottom-6 w-px bg-white/10" />
              <div className="space-y-10">
                {stepsMap.map((step) => {
                  const stepStatus = getStepStatus(quote.status, step.key);
                  const isActive = stepStatus === "active";
                  const isDone = stepStatus === "done";

                  return (
                    <div
                      key={step.key}
                      role="button"
                      tabIndex={0}
                      onClick={() => {
                        const targetPanel =
                          step.key === "quoted"
                            ? "proposals"
                            : step.key === "accepted"
                              ? "messages"
                              : "overview";
                        navigate(`/couple/bid-dashboard/${quote._id}`, {
                          state: { activePanel: targetPanel },
                        });
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          const targetPanel =
                            step.key === "quoted"
                              ? "proposals"
                              : step.key === "accepted"
                                ? "messages"
                                : "overview";
                          navigate(`/couple/bid-dashboard/${quote._id}`, {
                            state: { activePanel: targetPanel },
                          });
                        }
                      }}
                      className="relative flex cursor-pointer items-start gap-6"
                    >
                      <div className="relative z-10 flex h-[58px] w-[58px] items-center justify-center rounded-full border border-white/10 bg-[#2d2623]">
                        <div
                          className={`flex h-[30px] w-[30px] items-center justify-center rounded-full ${
                            isActive
                              ? "bg-[#f0d0bd] text-[#1d1714] shadow-[0_0_20px_rgba(240,208,189,0.35)]"
                              : isDone
                                ? "bg-[#cda88f] text-[#1d1714]"
                                : "bg-white/10 text-white/30"
                          }`}
                        >
                          {isDone ? (
                            <svg
                              className="h-4 w-4"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M5 13l4 4L19 7"
                              />
                            </svg>
                          ) : isActive ? (
                            <svg
                              className="h-4 w-4"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M12 8v4l2.5 2.5M12 22a10 10 0 100-20 10 10 0 000 20z"
                              />
                            </svg>
                          ) : (
                            <div className="h-3.5 w-3.5 rounded-full bg-current" />
                          )}
                        </div>
                      </div>

                      <div className="pt-1">
                        <h2
                          className={`text-[22px] font-semibold ${isActive ? "text-[#f1ccd8]" : isDone ? "text-white/80" : "text-white/30"}`}
                        >
                          {step.label}
                        </h2>
                        <p
                          className={`mt-2 max-w-xl text-sm ${isActive ? "text-white/50" : "text-white/22"}`}
                        >
                          {step.description}
                        </p>

                        {isActive &&
                          step.key === "quoted" &&
                          quote.responses?.length > 0 && (
                            <div className="mt-4 flex flex-wrap gap-3">
                              <button
                                type="button"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  navigate(
                                    `/couple/bid-dashboard/${quote._id}`,
                                    { state: { activePanel: "proposals" } },
                                  );
                                }}
                                className="rounded-full bg-[#f0d0bd] px-4 py-2 text-xs font-semibold text-[#1d1714]"
                              >
                                Review {quote.responses.length} Proposal
                                {quote.responses.length > 1 ? "s" : ""}
                              </button>
                              <button
                                type="button"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  navigate(
                                    `/couple/bid-dashboard/${quote._id}`,
                                    { state: { activePanel: "messages" } },
                                  );
                                }}
                                className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-xs font-semibold text-white/70"
                              >
                                Open Messages
                              </button>
                            </div>
                          )}

                        {isActive && step.key === "pending" && (
                          <div className="mt-4 rounded-2xl border border-[#f0d0bd]/10 bg-[#211917] px-4 py-3 text-xs text-white/45">
                            Planners usually start reviewing within a few hours.
                            Your request ID is{" "}
                            <span className="font-semibold text-[#f0d0bd]">
                              {quote._id.slice(-6).toUpperCase()}
                            </span>
                            .
                          </div>
                        )}

                        {!isActive && !isDone && (
                          <div className="mt-4 rounded-2xl border border-white/5 bg-white/[0.02] px-4 py-3 text-xs text-white/28">
                            This stage unlocks automatically when planners
                            update your bid. It is not a clickable next page.
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="mt-8 rounded-[28px] border border-white/10 bg-[#16110e] p-5">
              <p className="text-[11px] uppercase tracking-[0.22em] text-white/35">
                What You Can Do Now
              </p>
              <div className="mt-4 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() =>
                    navigate(`/couple/bid-dashboard/${quote._id}`, {
                      state: { activePanel: "overview" },
                    })
                  }
                  className="rounded-full bg-[#f0d0bd] px-4 py-2 text-xs font-semibold text-[#1d1714]"
                >
                  Open Bid Dashboard
                </button>
                <button
                  type="button"
                  onClick={() =>
                    navigate(`/couple/bid-dashboard/${quote._id}`, {
                      state: { activePanel: "messages" },
                    })
                  }
                  className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-xs font-semibold text-white/75"
                >
                  Open Messages
                </button>
                <button
                  type="button"
                  onClick={() => navigate("/couple/profile")}
                  className="rounded-full border border-white/10 bg-transparent px-4 py-2 text-xs font-semibold text-white/55"
                >
                  Go to Dashboard
                </button>
              </div>
            </div>
          </section>

          <aside className="space-y-6">
            <div>
              <p className="mb-3 text-[11px] uppercase tracking-[0.24em] text-white/18">
                Request Overview
              </p>
              <div className="rounded-[28px] border border-white/10 bg-[#1a1411]/92 p-6">
                <div className="relative overflow-hidden rounded-[22px] border border-white/10 bg-[#2a231e] p-5">
                  {quote.images?.[0] ? (
                    <img
                      src={quote.images[0].url}
                      alt={quote.images[0].label || "Vision preview"}
                      className="aspect-[4/3] w-full rounded-[18px] object-cover"
                    />
                  ) : (
                    <div className="aspect-[4/3] w-full rounded-[18px] bg-white/5" />
                  )}
                  <div className="absolute right-9 top-9 rounded-2xl border border-white/10 bg-[#5c544f]/95 px-4 py-2 text-sm font-semibold text-white shadow-xl">
                    {quote.images?.length || 0} Vision
                    {quote.images?.length === 1 ? "" : "s"}
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-[28px] border border-white/10 bg-[#1a1411]/92 px-7 py-6">
              <div className="space-y-7">
                <div className="flex items-center justify-between border-b border-white/10 pb-5">
                  <span className="text-[11px] uppercase tracking-[0.22em] text-white/35">
                    Budget
                  </span>
                  <span className="text-[18px] font-semibold text-white">
                    {quote.eventDetails?.budget || "Flexible"}
                  </span>
                </div>
                <div className="flex items-center justify-between border-b border-white/10 pb-5">
                  <span className="text-[11px] uppercase tracking-[0.22em] text-white/35">
                    Location
                  </span>
                  <span className="text-[18px] font-semibold text-white">
                    {quote.eventDetails?.city || "TBD"}
                  </span>
                </div>
                <div className="flex items-center justify-between border-b border-white/10 pb-5">
                  <span className="text-[11px] uppercase tracking-[0.22em] text-white/35">
                    Guests
                  </span>
                  <span className="text-[18px] font-semibold text-white">
                    {quote.eventDetails?.guestCount || "TBD"}
                  </span>
                </div>
                <div className="pt-1">
                  <span className="text-[11px] uppercase tracking-[0.22em] text-white/35">
                    Any Special Notes
                  </span>
                  <p className="mt-3 text-[15px] italic text-white/75">
                    {quote.eventDetails?.notes || "None specified."}
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-[28px] border border-white/10 bg-gradient-to-b from-[#1a1411]/92 to-[#15100d]/92 p-6 text-[14px] text-white/58">
              <div className="flex items-start gap-4">
                <div className="mt-1 flex h-7 w-7 items-center justify-center rounded-full border border-[#f0d0bd]/50 text-[#f0d0bd]">
                  i
                </div>
                <p>
                  Your contact details remain hidden from planners until you
                  choose to accept a proposal.
                </p>
              </div>
            </div>

            <div className="rounded-[28px] border border-white/10 bg-[#1a1411]/92 p-6">
              <p className="text-[11px] uppercase tracking-[0.22em] text-white/35">
                Next Actions
              </p>
              <div className="mt-4 space-y-3">
                <button
                  type="button"
                  onClick={() =>
                    navigate(`/couple/bid-dashboard/${quote._id}`, {
                      state: { activePanel: "overview" },
                    })
                  }
                  className="w-full rounded-2xl bg-[#f0d0bd] px-4 py-3 text-sm font-semibold text-[#1d1714]"
                >
                  Track Bid Dashboard
                </button>
                <button
                  type="button"
                  onClick={() =>
                    navigate(`/couple/bid-dashboard/${quote._id}`, {
                      state: { activePanel: "messages" },
                    })
                  }
                  className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-semibold text-white/75"
                >
                  Open Messages
                </button>
                <button
                  type="button"
                  onClick={() => navigate("/couple/profile")}
                  className="w-full rounded-2xl border border-white/10 bg-transparent px-4 py-3 text-sm font-semibold text-white/50"
                >
                  Back to Dashboard
                </button>
              </div>
              <p className="mt-4 text-xs text-white/28">
                Submitted on {formatDate(quote.createdAt)} • Wedding date{" "}
                {formatDate(quote.eventDetails?.weddingDate)}
              </p>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
};

export default CoupleBidPlaced;
