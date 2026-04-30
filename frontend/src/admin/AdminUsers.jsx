import React, { useEffect, useState } from "react";
import { adminAPI } from "../api/api";

const AdminUsers = () => {
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);
  const [showUserModal, setShowUserModal] = useState(false);
  const [showCreditModal, setShowCreditModal] = useState(false);
  const [showBlockModal, setShowBlockModal] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [creditAmount, setCreditAmount] = useState("");
  const [creditReason, setCreditReason] = useState("");
  const [blockReason, setBlockReason] = useState("");
  const [bulkAction, setBulkAction] = useState("");
  const [bulkValue, setBulkValue] = useState("");
  const [selectedUsers, setSelectedUsers] = useState(new Set());

  // Search and filter states
  const [searchTerm, setSearchTerm] = useState("");
  const [filterPlan, setFilterPlan] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterAdmin, setFilterAdmin] = useState("");
  const [sortBy, setSortBy] = useState("createdAt");
  const [sortOrder, setSortOrder] = useState("desc");

  const loadUsers = async () => {
    setLoading(true);
    try {
      const data = await adminAPI.listUsers();
      setUsers(data.users);
      setFilteredUsers(data.users);
    } catch (err) {
      setMessage(err?.response?.data?.error || "Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  // Filter and search users
  useEffect(() => {
    let filtered = [...users];

    if (searchTerm) {
      filtered = filtered.filter(
        (user) =>
          user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (user.fullName &&
            user.fullName.toLowerCase().includes(searchTerm.toLowerCase())),
      );
    }

    if (filterPlan) {
      filtered = filtered.filter((user) => user.plan === filterPlan);
    }

    if (filterStatus) {
      if (filterStatus === "blocked") {
        filtered = filtered.filter((user) => user.isBlocked);
      } else if (filterStatus === "active") {
        filtered = filtered.filter((user) => !user.isBlocked);
      }
    }

    if (filterAdmin) {
      if (filterAdmin === "admin") {
        filtered = filtered.filter((user) => user.isAdmin);
      } else if (filterAdmin === "user") {
        filtered = filtered.filter((user) => !user.isAdmin);
      }
    }

    filtered.sort((a, b) => {
      let aVal = a[sortBy];
      let bVal = b[sortBy];

      if (sortBy === "createdAt") {
        aVal = new Date(aVal);
        bVal = new Date(bVal);
      }

      if (sortOrder === "asc") {
        return aVal > bVal ? 1 : -1;
      } else {
        return aVal < bVal ? 1 : -1;
      }
    });

    setFilteredUsers(filtered);
  }, [
    users,
    searchTerm,
    filterPlan,
    filterStatus,
    filterAdmin,
    sortBy,
    sortOrder,
  ]);

  const handleAction = async (action, userId, ...args) => {
    try {
      let result;
      switch (action) {
        case "toggleAdmin":
          result = await adminAPI.updateUser(userId, {
            isAdmin: !users.find((u) => u.id === userId).isAdmin,
          });
          break;
        case "block":
          result = await adminAPI.blockUser(userId, args[0]);
          break;
        case "unblock":
          result = await adminAPI.unblockUser(userId);
          break;
        case "adjustCredits":
          result = await adminAPI.adjustCredits(userId, args[0], args[1]);
          break;
        case "delete":
          if (
            window.confirm(
              "Are you sure you want to delete this user? This action cannot be undone.",
            )
          ) {
            result = await adminAPI.deleteUser(userId);
          } else {
            return;
          }
          break;
        default:
          return;
      }
      setMessage(result.message || "Action completed successfully");
      await loadUsers();
    } catch (err) {
      setMessage(err?.response?.data?.error || "Action failed");
    }
  };

  const handleBulkAction = async () => {
    if (selectedUsers.size === 0) {
      setMessage("Please select users first");
      return;
    }

    if (!bulkAction) {
      setMessage("Please select an action");
      return;
    }

    try {
      const userIds = Array.from(selectedUsers);
      let successCount = 0;
      let errorCount = 0;

      for (const userId of userIds) {
        try {
          switch (bulkAction) {
            case "block":
              await adminAPI.blockUser(
                userId,
                bulkValue || "Bulk blocked by admin",
              );
              break;
            case "unblock":
              await adminAPI.unblockUser(userId);
              break;
            case "adjustCredits":
              if (bulkValue && !isNaN(parseInt(bulkValue))) {
                await adminAPI.adjustCredits(
                  userId,
                  parseInt(bulkValue),
                  "Bulk credit adjustment",
                );
              }
              break;
            case "delete":
              await adminAPI.deleteUser(userId);
              break;
          }
          successCount++;
        } catch (err) {
          errorCount++;
        }
      }

      setMessage(
        `Bulk action completed: ${successCount} successful, ${errorCount} failed`,
      );
      setSelectedUsers(new Set());
      setShowBulkModal(false);
      setBulkAction("");
      setBulkValue("");
      await loadUsers();
    } catch (err) {
      setMessage("Bulk action failed");
    }
  };

  const toggleUserSelection = (userId) => {
    const newSelected = new Set(selectedUsers);
    if (newSelected.has(userId)) {
      newSelected.delete(userId);
    } else {
      newSelected.add(userId);
    }
    setSelectedUsers(newSelected);
  };

  const selectAllUsers = () => {
    if (selectedUsers.size === filteredUsers.length) {
      setSelectedUsers(new Set());
    } else {
      setSelectedUsers(new Set(filteredUsers.map((user) => user.id)));
    }
  };

  const openUserDetails = async (userId) => {
    try {
      const data = await adminAPI.getUser(userId);
      setSelectedUser(data.user);
      setShowUserModal(true);
    } catch (err) {
      setMessage("Failed to load user details");
    }
  };

  const UserDetailsModal = () => (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div
        className="rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
        style={{
          background:
            "linear-gradient(152.97deg, rgba(0,0,0,0.95) 0%, rgba(20,20,30,0.95) 100%)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          border: "1px solid rgba(255,255,255,0.15)",
        }}
      >
        <div className="p-6 border-b border-white/10">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold bg-gradient-to-r from-amber-400 to-amber-300 bg-clip-text text-transparent">
              User Details
            </h2>
            <button
              onClick={() => setShowUserModal(false)}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        </div>

        {selectedUser && (
          <div className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-lg font-medium text-white mb-4">
                  Basic Information
                </h3>
                <div className="space-y-3 text-gray-300">
                  <div>
                    <span className="font-medium text-gray-400">Email:</span>{" "}
                    {selectedUser.email}
                  </div>
                  <div>
                    <span className="font-medium text-gray-400">Name:</span>{" "}
                    {selectedUser.fullName || "N/A"}
                  </div>
                  <div>
                    <span className="font-medium text-gray-400">Plan:</span>
                    <span
                      className={`ml-2 px-2 py-1 text-xs rounded-full ${
                        selectedUser.plan === "premium"
                          ? "bg-purple-500/20 text-purple-300"
                          : selectedUser.plan === "basic"
                            ? "bg-blue-500/20 text-blue-300"
                            : "bg-gray-500/20 text-gray-300"
                      }`}
                    >
                      {selectedUser.plan}
                    </span>
                  </div>
                  <div>
                    <span className="font-medium text-gray-400">Credits:</span>{" "}
                    {selectedUser.credits}
                  </div>
                  <div>
                    <span className="font-medium text-gray-400">Status:</span>
                    <span
                      className={`ml-2 px-2 py-1 text-xs rounded-full ${
                        selectedUser.isBlocked
                          ? "bg-rose-500/20 text-rose-300"
                          : "bg-emerald-500/20 text-emerald-300"
                      }`}
                    >
                      {selectedUser.isBlocked ? "Blocked" : "Active"}
                    </span>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-medium text-white mb-4">
                  Subscription & Payments
                </h3>
                <div className="space-y-3 text-gray-300">
                  <div>
                    <span className="font-medium text-gray-400">
                      Subscription Status:
                    </span>{" "}
                    {selectedUser.subscriptionStatus}
                  </div>
                  <div>
                    <span className="font-medium text-gray-400">
                      Last Payment:
                    </span>{" "}
                    {selectedUser.lastPaymentStatus || "N/A"}
                  </div>
                  <div>
                    <span className="font-medium text-gray-400">
                      Total Spent:
                    </span>{" "}
                    ${selectedUser.totalSpent?.toFixed(2) || "0.00"}
                  </div>
                  <div>
                    <span className="font-medium text-gray-400">
                      Total Credits Used:
                    </span>{" "}
                    {selectedUser.totalCreditsUsed || 0}
                  </div>
                  <div>
                    <span className="font-medium text-gray-400">
                      Total Payments:
                    </span>{" "}
                    {selectedUser.totalPayments || 0}
                  </div>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-medium text-white mb-4">
                Credit Transactions
              </h3>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-white/10">
                  <thead className="bg-white/5">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">
                        Type
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">
                        Amount
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">
                        Description
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">
                        Date
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">
                        Balance
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {selectedUser.creditTransactions
                      ?.slice()
                      .reverse()
                      .map((transaction, index) => (
                        <tr key={index} className="text-gray-300">
                          <td className="px-4 py-3 text-sm">
                            <span
                              className={`px-2 py-1 text-xs rounded-full ${
                                transaction.type === "credit"
                                  ? "bg-emerald-500/20 text-emerald-300"
                                  : "bg-rose-500/20 text-rose-300"
                              }`}
                            >
                              {transaction.type}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm font-medium">
                            {transaction.type === "credit" ? "+" : "-"}
                            {transaction.amount}
                          </td>
                          <td className="px-4 py-3 text-sm">
                            {transaction.description}
                          </td>
                          <td className="px-4 py-3 text-sm">
                            {new Date(
                              transaction.timestamp,
                            ).toLocaleDateString()}
                          </td>
                          <td className="px-4 py-3 text-sm font-medium">
                            {transaction.remainingBalance}
                          </td>
                        </tr>
                      )) || (
                      <tr>
                        <td
                          colSpan="5"
                          className="px-4 py-3 text-sm text-gray-500 text-center"
                        >
                          No transactions found
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  const CreditModal = () => (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div
        className="rounded-2xl max-w-md w-full"
        style={{
          background:
            "linear-gradient(152.97deg, rgba(0,0,0,0.95) 0%, rgba(20,20,30,0.95) 100%)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          border: "1px solid rgba(255,255,255,0.15)",
        }}
      >
        <div className="p-6">
          <h3 className="text-lg font-medium text-white mb-4">
            Adjust Credits
          </h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Credit Amount
              </label>
              <input
                type="number"
                value={creditAmount}
                onChange={(e) => setCreditAmount(e.target.value)}
                placeholder="Enter amount (use negative for deduction)"
                className="w-full px-3 py-2 rounded-xl bg-white/10 border border-white/20 text-white placeholder-gray-400 focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/50"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Reason
              </label>
              <input
                type="text"
                value={creditReason}
                onChange={(e) => setCreditReason(e.target.value)}
                placeholder="Reason for credit adjustment"
                className="w-full px-3 py-2 rounded-xl bg-white/10 border border-white/20 text-white placeholder-gray-400 focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/50"
              />
            </div>
          </div>
          <div className="flex space-x-3 mt-6">
            <button
              onClick={() => {
                if (selectedUser && creditAmount) {
                  handleAction(
                    "adjustCredits",
                    selectedUser.id,
                    parseInt(creditAmount),
                    creditReason,
                  );
                  setShowCreditModal(false);
                  setCreditAmount("");
                  setCreditReason("");
                }
              }}
              className="flex-1 rounded-full px-4 py-2 font-semibold transition-all duration-300 hover:scale-105"
              style={{
                background: "#D48C8C",
                boxShadow: "0 10px 26px rgba(0,0,0,0.28)",
                color: "#F5E8E1",
              }}
            >
              Adjust Credits
            </button>
            <button
              onClick={() => setShowCreditModal(false)}
              className="flex-1 px-4 py-2 rounded-full bg-white/10 text-gray-300 hover:bg-white/20 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  const BulkActionModal = () => (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div
        className="rounded-2xl max-w-md w-full"
        style={{
          background:
            "linear-gradient(152.97deg, rgba(0,0,0,0.95) 0%, rgba(20,20,30,0.95) 100%)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          border: "1px solid rgba(255,255,255,0.15)",
        }}
      >
        <div className="p-6">
          <h3 className="text-lg font-medium text-white mb-4">Bulk Actions</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Action
              </label>
              <select
                value={bulkAction}
                onChange={(e) => setBulkAction(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-white/10 border border-white/20 text-white focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/50"
              >
                <option value="" className="bg-gray-900">
                  Select action
                </option>
                <option value="block" className="bg-gray-900">
                  Block Users
                </option>
                <option value="unblock" className="bg-gray-900">
                  Unblock Users
                </option>
                <option value="adjustCredits" className="bg-gray-900">
                  Adjust Credits
                </option>
                <option value="delete" className="bg-gray-900">
                  Delete Users
                </option>
              </select>
            </div>

            {(bulkAction === "block" || bulkAction === "adjustCredits") && (
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  {bulkAction === "block" ? "Block Reason" : "Credit Amount"}
                </label>
                <input
                  type={bulkAction === "adjustCredits" ? "number" : "text"}
                  value={bulkValue}
                  onChange={(e) => setBulkValue(e.target.value)}
                  placeholder={
                    bulkAction === "block"
                      ? "Reason for blocking"
                      : "Amount (use negative to deduct)"
                  }
                  className="w-full px-3 py-2 rounded-xl bg-white/10 border border-white/20 text-white placeholder-gray-400 focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/50"
                />
              </div>
            )}

            <div className="bg-amber-500/10 border border-amber-500/30 p-3 rounded-xl">
              <p className="text-sm text-amber-400">
                <strong>{selectedUsers.size}</strong> users selected for bulk
                action
              </p>
            </div>
          </div>

          <div className="flex space-x-3 mt-6">
            <button
              onClick={handleBulkAction}
              disabled={!bulkAction}
              className="flex-1 rounded-full px-4 py-2 font-semibold transition-all duration-300 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                background: "#D48C8C",
                boxShadow: "0 10px 26px rgba(0,0,0,0.28)",
                color: "#F5E8E1",
              }}
            >
              Execute Bulk Action
            </button>
            <button
              onClick={() => {
                setShowBulkModal(false);
                setBulkAction("");
                setBulkValue("");
              }}
              className="flex-1 px-4 py-2 rounded-full bg-white/10 text-gray-300 hover:bg-white/20 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  const BlockModal = () => (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div
        className="rounded-2xl max-w-md w-full"
        style={{
          background:
            "linear-gradient(152.97deg, rgba(0,0,0,0.95) 0%, rgba(20,20,30,0.95) 100%)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          border: "1px solid rgba(255,255,255,0.15)",
        }}
      >
        <div className="p-6">
          <h3 className="text-lg font-medium text-white mb-4">Block User</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Block Reason
              </label>
              <textarea
                value={blockReason}
                onChange={(e) => setBlockReason(e.target.value)}
                placeholder="Reason for blocking this user..."
                rows={3}
                className="w-full px-3 py-2 rounded-xl bg-white/10 border border-white/20 text-white placeholder-gray-400 focus:outline-none focus:border-rose-500/50 focus:ring-1 focus:ring-rose-500/50"
              />
            </div>

            <div className="bg-rose-500/10 border border-rose-500/30 p-3 rounded-xl">
              <p className="text-sm text-rose-400">
                <strong>Warning:</strong> Blocking this user will prevent them
                from accessing the platform.
              </p>
            </div>
          </div>

          <div className="flex space-x-3 mt-6">
            <button
              onClick={() =>
                handleAction("block", selectedUser.id, blockReason)
              }
              disabled={!blockReason.trim()}
              className="flex-1 rounded-full px-4 py-2 font-semibold bg-rose-600 text-white hover:bg-rose-700 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Block User
            </button>
            <button
              onClick={() => {
                setShowBlockModal(false);
                setBlockReason("");
              }}
              className="flex-1 px-4 py-2 rounded-full bg-white/10 text-gray-300 hover:bg-white/20 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 pt-24 md:pt-28">
      {/* Header */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-8">
        <div
          className="rounded-2xl p-6 transition-all duration-300"
          style={{
            background:
              "linear-gradient(152.97deg, rgba(255,255,255,0.10) 0%, rgba(255,255,255,0.03) 100%)",
            backdropFilter: "blur(20px)",
            WebkitBackdropFilter: "blur(20px)",
            border: "1px solid rgba(255,255,255,0.10)",
          }}
        >
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-amber-400 to-amber-300 bg-clip-text text-transparent">
                User Management
              </h1>
              <p className="mt-1 text-sm text-gray-400">
                Manage user accounts, credits, and access controls
              </p>
            </div>
            <div className="flex space-x-3">
              <button
                onClick={loadUsers}
                className="inline-flex items-center px-5 py-2.5 rounded-full text-sm font-medium text-gray-300 bg-white/10 backdrop-blur-sm border border-white/20 hover:bg-white/20 transition-all duration-300"
              >
                <svg
                  className="w-4 h-4 mr-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
                Refresh
              </button>
              {selectedUsers.size > 0 && (
                <button
                  onClick={() => setShowBulkModal(true)}
                  className="inline-flex items-center px-5 py-2.5 rounded-full text-sm font-semibold text-[#F5E8E1] transition-all duration-300 hover:scale-105"
                  style={{
                    background: "#D48C8C",
                    boxShadow: "0 10px 26px rgba(0,0,0,0.28)",
                  }}
                >
                  <svg
                    className="w-4 h-4 mr-2"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13 10V3L4 14h7v7l9-11h-7z"
                    />
                  </svg>
                  Bulk Actions ({selectedUsers.size})
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-8">
        <div
          className="rounded-2xl p-5 transition-all duration-300"
          style={{
            background:
              "linear-gradient(152.97deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.02) 100%)",
            backdropFilter: "blur(20px)",
            WebkitBackdropFilter: "blur(20px)",
            border: "1px solid rgba(255,255,255,0.10)",
          }}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
            <div className="lg:col-span-2">
              <input
                type="text"
                placeholder="Search by email or name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-white/10 border border-white/20 text-white placeholder-gray-400 focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/50 transition-all"
              />
            </div>

            <div>
              <select
                value={filterPlan}
                onChange={(e) => setFilterPlan(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-white/10 border border-white/20 text-white focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/50"
              >
                <option value="" className="bg-gray-900">
                  All Plans
                </option>
                <option value="free" className="bg-gray-900">
                  Free
                </option>
                <option value="basic" className="bg-gray-900">
                  Basic
                </option>
                <option value="premium" className="bg-gray-900">
                  Premium
                </option>
              </select>
            </div>

            <div>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-white/10 border border-white/20 text-white focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/50"
              >
                <option value="" className="bg-gray-900">
                  All Status
                </option>
                <option value="active" className="bg-gray-900">
                  Active
                </option>
                <option value="blocked" className="bg-gray-900">
                  Blocked
                </option>
              </select>
            </div>

            <div>
              <select
                value={filterAdmin}
                onChange={(e) => setFilterAdmin(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-white/10 border border-white/20 text-white focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/50"
              >
                <option value="" className="bg-gray-900">
                  All Users
                </option>
                <option value="admin" className="bg-gray-900">
                  Admins
                </option>
                <option value="user" className="bg-gray-900">
                  Regular Users
                </option>
              </select>
            </div>

            <div>
              <select
                value={`${sortBy}-${sortOrder}`}
                onChange={(e) => {
                  const [field, order] = e.target.value.split("-");
                  setSortBy(field);
                  setSortOrder(order);
                }}
                className="w-full px-4 py-2.5 rounded-xl bg-white/10 border border-white/20 text-white focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/50"
              >
                <option value="createdAt-desc" className="bg-gray-900">
                  Newest First
                </option>
                <option value="createdAt-asc" className="bg-gray-900">
                  Oldest First
                </option>
                <option value="email-asc" className="bg-gray-900">
                  Email A-Z
                </option>
                <option value="email-desc" className="bg-gray-900">
                  Email Z-A
                </option>
                <option value="credits-desc" className="bg-gray-900">
                  Most Credits
                </option>
                <option value="credits-asc" className="bg-gray-900">
                  Least Credits
                </option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
        {message && (
          <div className="mb-6 bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 backdrop-blur-sm">
            <p className="text-sm text-amber-400">{message}</p>
          </div>
        )}

        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-400 mx-auto"></div>
            <p className="mt-4 text-gray-400">Loading users...</p>
          </div>
        ) : (
          <div
            className="rounded-2xl overflow-hidden"
            style={{
              background:
                "linear-gradient(152.97deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.02) 100%)",
              backdropFilter: "blur(20px)",
              WebkitBackdropFilter: "blur(20px)",
              border: "1px solid rgba(255,255,255,0.10)",
            }}
          >
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-white/10">
                <thead className="bg-white/5">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      <input
                        type="checkbox"
                        checked={
                          selectedUsers.size === filteredUsers.length &&
                          filteredUsers.length > 0
                        }
                        onChange={selectAllUsers}
                        className="h-4 w-4 rounded border-white/30 bg-white/10 text-amber-500 focus:ring-amber-500 focus:ring-offset-0"
                      />
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      User
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Plan
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Credits
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Payment
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {filteredUsers.map((user) => (
                    <tr
                      key={user.id}
                      className="hover:bg-white/5 transition-colors"
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <input
                          type="checkbox"
                          checked={selectedUsers.has(user.id)}
                          onChange={() => toggleUserSelection(user.id)}
                          className="h-4 w-4 rounded border-white/30 bg-white/10 text-amber-500 focus:ring-amber-500 focus:ring-offset-0"
                        />
                      </td>
                      <td className="px-6 py-4">
                        <div>
                          <div className="text-sm font-medium text-white">
                            {user.email}
                          </div>
                          <div className="text-sm text-gray-400">
                            {user.fullName || "No name"}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-2 py-1 text-xs rounded-full ${
                            user.plan === "premium"
                              ? "bg-purple-500/20 text-purple-300"
                              : user.plan === "basic"
                                ? "bg-blue-500/20 text-blue-300"
                                : "bg-gray-500/20 text-gray-300"
                          }`}
                        >
                          {user.plan}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                        {user.credits || 0}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-2 py-1 text-xs rounded-full ${
                            user.isBlocked
                              ? "bg-rose-500/20 text-rose-300"
                              : "bg-emerald-500/20 text-emerald-300"
                          }`}
                        >
                          {user.isBlocked ? "Blocked" : "Active"}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                        ${user.totalSpent?.toFixed(2) || "0.00"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm space-x-3">
                        <button
                          onClick={() => openUserDetails(user.id)}
                          className="text-amber-400 hover:text-amber-300 transition-colors"
                        >
                          View
                        </button>
                        <button
                          onClick={() => {
                            setSelectedUser(user);
                            setShowCreditModal(true);
                          }}
                          className="text-emerald-400 hover:text-emerald-300 transition-colors"
                        >
                          Credits
                        </button>
                        <button
                          onClick={() => handleAction("toggleAdmin", user.id)}
                          className={`transition-colors ${user.isAdmin ? "text-purple-400 hover:text-purple-300" : "text-gray-400 hover:text-gray-300"}`}
                        >
                          {user.isAdmin ? "Revoke Admin" : "Make Admin"}
                        </button>
                        {user.isBlocked ? (
                          <button
                            onClick={() => handleAction("unblock", user.id)}
                            className="text-orange-400 hover:text-orange-300 transition-colors"
                          >
                            Unblock
                          </button>
                        ) : (
                          <button
                            onClick={() => {
                              setSelectedUser(user);
                              setShowBlockModal(true);
                            }}
                            className="text-rose-400 hover:text-rose-300 transition-colors"
                          >
                            Block
                          </button>
                        )}
                        <button
                          onClick={() => handleAction("delete", user.id)}
                          className="text-rose-400 hover:text-rose-300 transition-colors"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      {showUserModal && <UserDetailsModal />}
      {showCreditModal && <CreditModal />}
      {showBlockModal && <BlockModal />}
      {showBulkModal && <BulkActionModal />}
    </div>
  );
};

export default AdminUsers;
