import React, { useState, useEffect } from "react";
import { plannerAdminAPI } from "../api/api";

const PlannerUserModal = ({ user, onClose, onRefresh }) => {
  const [activeTab, setActiveTab] = useState("overview");
  const [details, setDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  // Subscription Form State
  const [grantPlan, setGrantPlan] = useState("planner_basic");
  const [grantDuration, setGrantDuration] = useState("30");
  const [grantSource, setGrantSource] = useState("Admin Granted");
  const [grantReason, setGrantReason] = useState("");

  // Credit Form State
  const [creditAction, setCreditAction] = useState("add");
  const [creditAmount, setCreditAmount] = useState("");
  const [creditReason, setCreditReason] = useState("");

  const loadUserDetails = async () => {
    setLoading(true);
    try {
      const data = await plannerAdminAPI.getUser(user.id);
      setDetails(data);
    } catch (err) {
      setMessage(err?.response?.data?.error || "Failed to load user details");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user && user.id) {
      loadUserDetails();
    }
  }, [user]);

  const handleGrantSubscription = async () => {
    if (!grantReason) return setMessage("Reason is required.");
    try {
      await plannerAdminAPI.grantSubscription(user.id, {
        plan: grantPlan,
        duration: grantDuration,
        source: grantSource,
        reason: grantReason,
      });
      setMessage("Subscription granted successfully!");
      setGrantReason("");
      loadUserDetails();
      onRefresh();
    } catch (err) {
      setMessage(err?.response?.data?.error || "Failed to grant subscription");
    }
  };

  const handleModifySubscription = async (action, plan = null, duration = null) => {
    const reason = window.prompt(`Please provide a reason to ${action} subscription:`);
    if (!reason) return;

    if (action === "remove") {
      if (!window.confirm("Are you sure you want to remove this Planner subscription? This action cannot be undone and will reset credits to 0.")) return;
    }

    try {
      await plannerAdminAPI.modifySubscription(user.id, { action, plan, duration, reason });
      setMessage(`Subscription ${action} successful!`);
      loadUserDetails();
      onRefresh();
    } catch (err) {
      setMessage(err?.response?.data?.error || `Failed to ${action} subscription`);
    }
  };

  const handleManageCredits = async () => {
    if (!creditReason) return setMessage("Reason is required.");
    if (creditAction !== "reset" && (!creditAmount || isNaN(creditAmount) || Number(creditAmount) <= 0)) {
      return setMessage("Amount must be a positive number.");
    }
    
    if (creditAction === "remove" || creditAction === "reset") {
      if (!window.confirm(`Are you sure you want to ${creditAction} credits? This action cannot be undone.`)) return;
    }

    try {
      await plannerAdminAPI.manageCredits(user.id, {
        action: creditAction,
        amount: creditAction !== "reset" ? parseInt(creditAmount) : null,
        reason: creditReason,
      });
      setMessage(`Credits ${creditAction} successful!`);
      setCreditAmount("");
      setCreditReason("");
      loadUserDetails();
      onRefresh();
    } catch (err) {
      setMessage(err?.response?.data?.error || "Failed to manage credits");
    }
  };

  if (!user) return null;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div
        className="rounded-2xl max-w-5xl w-full max-h-[90vh] overflow-y-auto"
        style={{
          background: "linear-gradient(152.97deg, rgba(0,0,0,0.95) 0%, rgba(20,20,30,0.95) 100%)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          border: "1px solid rgba(255,255,255,0.15)",
        }}
      >
        <div className="p-6 border-b border-white/10 flex items-center justify-between sticky top-0 bg-black/50 backdrop-blur-md z-10">
          <div>
            <h2 className="text-xl font-semibold bg-gradient-to-r from-amber-400 to-amber-300 bg-clip-text text-transparent">
              Manage Planner AI User
            </h2>
            <p className="text-sm text-gray-400 mt-1">
              {user.fullName || "N/A"} ({user.email})
              {user.phone && ` • ${user.phone}`}
              {user.socialLink && (
                <>
                  {" • "}
                  <a href={user.socialLink} target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:underline">
                    Profile
                  </a>
                </>
              )}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {message && (
          <div className="m-6 p-4 rounded-xl bg-white/5 border border-white/10 text-amber-300 text-sm">
            {message}
          </div>
        )}

        <div className="border-b border-white/10 px-6 flex space-x-6 overflow-x-auto">
          {["overview", "subscription", "credits", "transactions", "audit_logs"].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`py-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                activeTab === tab
                  ? "border-amber-400 text-amber-400"
                  : "border-transparent text-gray-400 hover:text-gray-200"
              }`}
            >
              {tab.replace("_", " ").toUpperCase()}
            </button>
          ))}
        </div>

        <div className="p-6">
          {loading ? (
            <div className="flex justify-center p-8">
              <div className="w-8 h-8 border-4 border-amber-400/20 border-t-amber-400 rounded-full animate-spin"></div>
            </div>
          ) : (
            <>
              {/* OVERVIEW TAB */}
              {activeTab === "overview" && details && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                    <h3 className="text-gray-400 text-xs uppercase tracking-wider mb-4">Planner Wallet</h3>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-gray-400">Balance</span>
                        <span className="text-white font-medium">{details.wallet?.balance || 0} Credits</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Lifetime Added</span>
                        <span className="text-white">{details.wallet?.lifetimeAdded || 0}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Lifetime Used</span>
                        <span className="text-white">{details.wallet?.lifetimeUsed || 0}</span>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                    <h3 className="text-gray-400 text-xs uppercase tracking-wider mb-4">Active Subscription</h3>
                    {details.activeSubscription ? (
                      <div className="space-y-3">
                        <div className="flex justify-between">
                          <span className="text-gray-400">Plan</span>
                          <span className="text-amber-400 font-medium capitalize">{details.activeSubscription.plan.replace('planner_', '')}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Source</span>
                          <span className="text-white">{details.activeSubscription.source}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Expires</span>
                          <span className="text-white">{details.activeSubscription.endsAt ? new Date(details.activeSubscription.endsAt).toLocaleDateString() : "Never"}</span>
                        </div>
                      </div>
                    ) : (
                      <div className="text-gray-400 text-center py-4">No active planner subscription</div>
                    )}
                  </div>
                </div>
              )}

              {/* SUBSCRIPTION TAB */}
              {activeTab === "subscription" && details && (
                <div className="space-y-8">
                  {details.activeSubscription ? (
                    <div className="p-6 rounded-xl bg-white/5 border border-white/10">
                      <h3 className="text-white font-medium mb-6">Modify Active Subscription</h3>
                      <div className="flex flex-wrap gap-4">
                        <button onClick={() => handleModifySubscription("upgrade", "planner_pro")} className="px-4 py-2 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 transition-colors">
                          Upgrade to Pro
                        </button>
                        <button onClick={() => handleModifySubscription("downgrade", "planner_basic")} className="px-4 py-2 rounded-lg bg-orange-500/10 text-orange-400 border border-orange-500/20 hover:bg-orange-500/20 transition-colors">
                          Downgrade to Basic
                        </button>
                        <button onClick={() => handleModifySubscription("extend", null, "30")} className="px-4 py-2 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20 hover:bg-blue-500/20 transition-colors">
                          Extend 30 Days
                        </button>
                        <button onClick={() => handleModifySubscription("remove")} className="px-4 py-2 rounded-lg bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 transition-colors">
                          Remove Subscription
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="p-6 rounded-xl bg-white/5 border border-white/10">
                      <h3 className="text-white font-medium mb-6">Grant New Subscription</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                        <div>
                          <label className="block text-xs text-gray-400 uppercase tracking-wider mb-2">Plan</label>
                          <select value={grantPlan} onChange={(e) => setGrantPlan(e.target.value)} className="w-full bg-black/30 border border-white/10 rounded-lg px-4 py-2 text-white">
                            <option value="planner_basic">Basic (100)</option>
                            <option value="planner_premium">Premium (210)</option>
                            <option value="planner_pro">Pro (400)</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs text-gray-400 uppercase tracking-wider mb-2">Duration</label>
                          <select value={grantDuration} onChange={(e) => setGrantDuration(e.target.value)} className="w-full bg-black/30 border border-white/10 rounded-lg px-4 py-2 text-white">
                            <option value="7">7 Days</option>
                            <option value="30">30 Days</option>
                            <option value="90">90 Days</option>
                            <option value="365">1 Year</option>
                            <option value="never">Never Expire</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs text-gray-400 uppercase tracking-wider mb-2">Source</label>
                          <select value={grantSource} onChange={(e) => setGrantSource(e.target.value)} className="w-full bg-black/30 border border-white/10 rounded-lg px-4 py-2 text-white">
                            <option value="Admin Granted">Admin Granted</option>
                            <option value="Founder">Founder</option>
                            <option value="Internal Team">Internal Team</option>
                            <option value="Developer">Developer</option>
                            <option value="QA">QA</option>
                            <option value="Marketing">Marketing</option>
                            <option value="Support">Support</option>
                            <option value="Demo">Demo</option>
                            <option value="Beta">Beta</option>
                            <option value="Promotional">Promotional</option>
                            <option value="Investor">Investor</option>
                          </select>
                        </div>
                      </div>
                      <div className="mb-6">
                        <label className="block text-xs text-gray-400 uppercase tracking-wider mb-2">Reason (Required)</label>
                        <input type="text" value={grantReason} onChange={(e) => setGrantReason(e.target.value)} placeholder="e.g., QA Testing" className="w-full bg-black/30 border border-white/10 rounded-lg px-4 py-2 text-white" />
                      </div>
                      <button onClick={handleGrantSubscription} className="bg-gradient-to-r from-amber-500 to-amber-400 text-black px-6 py-2 rounded-full font-medium hover:scale-105 transition-transform">
                        Grant Subscription
                      </button>
                    </div>
                  )}
                  
                  <div className="mt-8">
                    <h3 className="text-gray-400 text-xs uppercase tracking-wider mb-4">Subscription History</h3>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm text-left">
                        <thead className="text-xs text-gray-400 uppercase bg-white/5">
                          <tr>
                            <th className="px-4 py-3">Plan</th>
                            <th className="px-4 py-3">Status</th>
                            <th className="px-4 py-3">Source</th>
                            <th className="px-4 py-3">Starts</th>
                            <th className="px-4 py-3">Expires</th>
                          </tr>
                        </thead>
                        <tbody>
                          {details.allSubscriptions?.map((s) => (
                            <tr key={s._id} className="border-b border-white/5">
                              <td className="px-4 py-3 text-white capitalize">{s.plan.replace('planner_', '')}</td>
                              <td className="px-4 py-3 text-white">{s.status}</td>
                              <td className="px-4 py-3 text-white">{s.source || 'Paid'}</td>
                              <td className="px-4 py-3 text-gray-400">{new Date(s.startsAt).toLocaleDateString()}</td>
                              <td className="px-4 py-3 text-gray-400">{s.endsAt ? new Date(s.endsAt).toLocaleDateString() : 'Never'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* CREDITS TAB */}
              {activeTab === "credits" && details && (
                <div className="space-y-6">
                  <div className="p-6 rounded-xl bg-white/5 border border-white/10">
                    <h3 className="text-white font-medium mb-6">Manual Credit Management</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                      <div>
                        <label className="block text-xs text-gray-400 uppercase tracking-wider mb-2">Action</label>
                        <select value={creditAction} onChange={(e) => setCreditAction(e.target.value)} className="w-full bg-black/30 border border-white/10 rounded-lg px-4 py-2 text-white">
                          <option value="add">Add Credits</option>
                          <option value="remove">Remove Credits</option>
                          <option value="refund">Refund Credits</option>
                          <option value="reset">Reset Wallet to 0</option>
                        </select>
                      </div>
                      {creditAction !== "reset" && (
                        <div>
                          <label className="block text-xs text-gray-400 uppercase tracking-wider mb-2">Amount</label>
                          <input type="number" min="1" value={creditAmount} onChange={(e) => setCreditAmount(e.target.value)} placeholder="e.g., 50" className="w-full bg-black/30 border border-white/10 rounded-lg px-4 py-2 text-white" />
                        </div>
                      )}
                    </div>
                    <div className="mb-6">
                      <label className="block text-xs text-gray-400 uppercase tracking-wider mb-2">Reason (Required)</label>
                      <input type="text" value={creditReason} onChange={(e) => setCreditReason(e.target.value)} placeholder="e.g., Customer compensation" className="w-full bg-black/30 border border-white/10 rounded-lg px-4 py-2 text-white" />
                    </div>
                    <button onClick={handleManageCredits} className="bg-gradient-to-r from-amber-500 to-amber-400 text-black px-6 py-2 rounded-full font-medium hover:scale-105 transition-transform">
                      Execute
                    </button>
                  </div>
                </div>
              )}

              {/* TRANSACTIONS TAB */}
              {activeTab === "transactions" && details && (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="text-xs text-gray-400 uppercase bg-white/5">
                      <tr>
                        <th className="px-4 py-3">Date</th>
                        <th className="px-4 py-3">Type</th>
                        <th className="px-4 py-3">Amount</th>
                        <th className="px-4 py-3">Source</th>
                        <th className="px-4 py-3">Reference</th>
                        <th className="px-4 py-3">Balance After</th>
                      </tr>
                    </thead>
                    <tbody>
                      {details.transactions?.map((t) => (
                        <tr key={t._id} className="border-b border-white/5">
                          <td className="px-4 py-3 text-gray-400">{new Date(t.createdAt).toLocaleString()}</td>
                          <td className={`px-4 py-3 font-medium ${t.type === 'credit' ? 'text-emerald-400' : 'text-red-400'}`}>{t.type.toUpperCase()}</td>
                          <td className="px-4 py-3 text-white">{t.amount}</td>
                          <td className="px-4 py-3 text-white">{t.source}</td>
                          <td className="px-4 py-3 text-gray-400 text-xs break-all">{t.reference}</td>
                          <td className="px-4 py-3 text-white">{t.balanceAfter}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {details.transactions?.length === 0 && (
                    <div className="text-center py-8 text-gray-400">No Planner transactions found.</div>
                  )}
                </div>
              )}

              {/* AUDIT LOGS TAB */}
              {activeTab === "audit_logs" && details && (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="text-xs text-gray-400 uppercase bg-white/5">
                      <tr>
                        <th className="px-4 py-3">Date</th>
                        <th className="px-4 py-3">Admin</th>
                        <th className="px-4 py-3">Action</th>
                        <th className="px-4 py-3">Plan Change</th>
                        <th className="px-4 py-3">Credit Change</th>
                        <th className="px-4 py-3">Reason</th>
                      </tr>
                    </thead>
                    <tbody>
                      {details.auditLogs?.map((l) => (
                        <tr key={l._id} className="border-b border-white/5">
                          <td className="px-4 py-3 text-gray-400">{new Date(l.createdAt).toLocaleString()}</td>
                          <td className="px-4 py-3 text-white">{l.adminName}</td>
                          <td className="px-4 py-3 text-amber-400 font-medium">{l.action}</td>
                          <td className="px-4 py-3 text-gray-400">{l.previousPlan || '-'} &rarr; {l.newPlan || '-'}</td>
                          <td className="px-4 py-3 text-gray-400">{l.previousCredits ?? '-'} &rarr; {l.newCredits ?? '-'}</td>
                          <td className="px-4 py-3 text-white text-xs">{l.reason}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {details.auditLogs?.length === 0 && (
                    <div className="text-center py-8 text-gray-400">No audit logs found.</div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default PlannerUserModal;
