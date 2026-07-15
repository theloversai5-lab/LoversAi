import React, { useEffect, useState } from "react";
import { plannerAdminAPI } from "../api/api";
import PlannerUserModal from "./PlannerUserModal";

const PlannerSubscriptions = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState(null);
  
  // Search and Filter State
  const [searchTerm, setSearchTerm] = useState("");
  const [filterPlan, setFilterPlan] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalUsers, setTotalUsers] = useState(0);
  
  // Selected User State
  const [selectedUser, setSelectedUser] = useState(null);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const data = await plannerAdminAPI.getUsers({
        page,
        limit: 20,
        search: searchTerm,
        plan: filterPlan,
        status: filterStatus,
      });
      setUsers(data.users);
      setTotalPages(data.pages);
      setTotalUsers(data.total);
    } catch (err) {
      setMessage(err?.response?.data?.error || "Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      loadUsers();
    }, 500); // Debounce search
    return () => clearTimeout(delayDebounceFn);
  }, [searchTerm, filterPlan, filterStatus, page]);

  // Handle Quick Actions
  const handleQuickAction = async (action, user) => {
    try {
      const reason = window.prompt(`Please provide a reason to ${action} for ${user.email}:`);
      if (!reason) return;

      if (action === "grant_pro") {
        await plannerAdminAPI.grantSubscription(user.id, { plan: "planner_pro", duration: "30", source: "Admin Granted", reason });
      } else if (action === "extend") {
        await plannerAdminAPI.modifySubscription(user.id, { action: "extend", duration: "30", reason });
      } else if (action === "add_credits") {
        await plannerAdminAPI.manageCredits(user.id, { action: "add", amount: 100, reason });
      } else if (action === "remove_credits") {
        await plannerAdminAPI.manageCredits(user.id, { action: "reset", reason });
      }
      
      setMessage(`Action ${action} completed successfully!`);
      loadUsers(); // Refresh grid
    } catch (err) {
      setMessage(err?.response?.data?.error || `Failed to execute ${action}`);
    }
  };

  return (
    <div className="min-h-screen pt-24 pb-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-white tracking-tight">
              Planner AI Subscriptions
            </h1>
            <p className="text-gray-400 mt-2">
              Manage planner subscriptions, wallets, and audit logs.
            </p>
          </div>
        </div>

        {message && (
          <div className="p-4 rounded-xl bg-white/5 border border-white/10 text-amber-300">
            {message}
          </div>
        )}

        <div className="p-6 rounded-2xl bg-white/5 border border-white/10 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="col-span-1 md:col-span-2">
              <input
                type="text"
                placeholder="Search by name, email, or ID..."
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }}
                className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-amber-400/50 transition-colors"
              />
            </div>
            <div>
              <select
                value={filterPlan}
                onChange={(e) => { setFilterPlan(e.target.value); setPage(1); }}
                className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-amber-400/50 transition-colors"
              >
                <option value="">All Plans</option>
                <option value="free">Free</option>
                <option value="planner_basic">Basic</option>
                <option value="planner_premium">Premium</option>
                <option value="planner_pro">Pro</option>
              </select>
            </div>
            <div>
              <select
                value={filterStatus}
                onChange={(e) => { setFilterStatus(e.target.value); setPage(1); }}
                className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-amber-400/50 transition-colors"
              >
                <option value="">All Statuses</option>
                <option value="active">Active</option>
                <option value="expired">Expired / None</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border border-white/10 bg-black/20">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-gray-400 uppercase bg-white/5 border-b border-white/10">
                <tr>
                  <th className="px-6 py-4 font-medium">User</th>
                  <th className="px-6 py-4 font-medium">Plan</th>
                  <th className="px-6 py-4 font-medium">Status</th>
                  <th className="px-6 py-4 font-medium">Credits</th>
                  <th className="px-6 py-4 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {loading ? (
                  <tr>
                    <td colSpan="5" className="px-6 py-8 text-center text-gray-400">
                      Loading users...
                    </td>
                  </tr>
                ) : users.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="px-6 py-8 text-center text-gray-400">
                      No users found.
                    </td>
                  </tr>
                ) : (
                  users.map((user) => (
                    <tr key={user.id} className="hover:bg-white/5 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-medium text-white">{user.fullName || "N/A"}</div>
                        <div className="text-gray-400 text-xs mt-1">{user.email}</div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          user.plannerPlan !== 'free'
                            ? "bg-amber-400/10 text-amber-400 border border-amber-400/20"
                            : "bg-gray-400/10 text-gray-400 border border-gray-400/20"
                        }`}>
                          {user.plannerPlan.replace('planner_', '').toUpperCase()}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-white capitalize">{user.plannerStatus}</td>
                      <td className="px-6 py-4">
                        <div className="text-emerald-400 font-medium">{user.plannerCredits}</div>
                      </td>
                      <td className="px-6 py-4 text-right space-x-2">
                        {user.plannerPlan === "free" && (
                          <button onClick={() => handleQuickAction("grant_pro", user)} className="text-xs text-amber-400 hover:text-amber-300">Grant Pro</button>
                        )}
                        {user.plannerPlan !== "free" && user.plannerStatus === "active" && (
                          <button onClick={() => handleQuickAction("extend", user)} className="text-xs text-blue-400 hover:text-blue-300">Extend</button>
                        )}
                        <button onClick={() => handleQuickAction("add_credits", user)} className="text-xs text-emerald-400 hover:text-emerald-300">+100 Crd</button>
                        <button onClick={() => setSelectedUser(user)} className="text-xs px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors ml-2">
                          Manage
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          
          <div className="flex justify-between items-center text-sm text-gray-400">
            <div>
              Showing page {page} of {totalPages} ({totalUsers} total users)
            </div>
            <div className="flex space-x-2">
              <button 
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1 bg-white/5 border border-white/10 rounded disabled:opacity-50"
              >
                Prev
              </button>
              <button 
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-3 py-1 bg-white/5 border border-white/10 rounded disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      </div>

      {selectedUser && (
        <PlannerUserModal
          user={selectedUser}
          onClose={() => setSelectedUser(null)}
          onRefresh={loadUsers}
        />
      )}
    </div>
  );
};

export default PlannerSubscriptions;
