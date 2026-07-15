import React, { useState, useEffect } from "react";
import { adminAPI } from "../api/api";

const AdminAILogs = () => {
  const [logs, setLogs] = useState([]);
  const [filteredLogs, setFilteredLogs] = useState([]);
  const [stats, setStats] = useState({
    totalCreditsToday: 0,
    successRate: 100,
    mostUsedTool: "N/A"
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Search & Filter States
  const [searchTerm, setSearchTerm] = useState("");
  const [filterTool, setFilterTool] = useState("");
  const [filterStatus, setFilterStatus] = useState("");

  const fetchLogs = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await adminAPI.getAILogs();
      if (data.success) {
        setLogs(data.logs || []);
        setFilteredLogs(data.logs || []);
        setStats(data.stats || { totalCreditsToday: 0, successRate: 100, mostUsedTool: "N/A" });
      } else {
        setError(data.error || "Failed to load logs");
      }
    } catch (err) {
      console.error("fetchLogs error:", err);
      setError(err?.response?.data?.error || "Failed to connect to the backend server");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  // Handle local searching & filtering
  useEffect(() => {
    let result = [...logs];

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(
        (log) =>
          log.user.toLowerCase().includes(term) ||
          (log.fullName && log.fullName.toLowerCase().includes(term)) ||
          log.id.toLowerCase().includes(term)
      );
    }

    if (filterTool) {
      result = result.filter((log) => log.tool === filterTool);
    }

    if (filterStatus) {
      result = result.filter((log) => log.status === filterStatus);
    }

    setFilteredLogs(result);
  }, [searchTerm, filterTool, filterStatus, logs]);

  // Extract unique tools for the filter dropdown
  const uniqueTools = Array.from(new Set(logs.map((log) => log.tool))).filter(Boolean);

  // Export CSV
  const handleExportCSV = () => {
    if (filteredLogs.length === 0) return;
    
    const headers = ["Log ID", "User Email", "User Name", "Tool", "Theme", "Credits Spent", "Date/Time", "Status"];
    const rows = filteredLogs.map((log) => [
      log.id,
      log.user,
      log.fullName || "N/A",
      log.tool,
      log.theme,
      log.cost,
      new Date(log.date).toLocaleString(),
      log.status
    ]);

    const csvContent = [headers.join(","), ...rows.map((r) => r.map(val => `"${val}"`).join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `ai_generation_logs_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="pt-24 md:pt-28 px-4 sm:px-6 lg:px-8 pb-12 w-full max-w-7xl mx-auto">
      {/* Header */}
      <div
        className="rounded-2xl p-6 transition-all duration-300 mb-8"
        style={{
          background:
            "linear-gradient(152.97deg, rgba(255,255,255,0.10) 0%, rgba(255,255,255,0.03) 100%)",
          backdropFilter: "blur(20px)",
          border: "1px solid rgba(255,255,255,0.10)",
        }}
      >
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold bg-gradient-to-r from-amber-400 to-amber-300 bg-clip-text text-transparent">
                AI Generation Logs
              </h1>
              <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/20">
                {filteredLogs.length} Records
              </span>
            </div>
            <p className="mt-1 text-sm text-gray-400">
              Monitor FLUX API usage, credit consumption, and system health
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={fetchLogs}
              className="inline-flex items-center px-4 py-2 rounded-full text-sm font-medium text-gray-300 bg-white/10 backdrop-blur-sm border border-white/20 hover:bg-white/20 transition-all"
            >
              Refresh
            </button>
            <button
              onClick={handleExportCSV}
              disabled={filteredLogs.length === 0}
              className="inline-flex items-center px-4 py-2 rounded-full text-sm font-semibold text-[#F5E8E1] bg-[#D48C8C] hover:scale-105 transition-all shadow-[0_10px_26px_rgba(0,0,0,0.28)] disabled:opacity-50 disabled:scale-100"
            >
              Export CSV
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-8 p-4 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl">
          {error}
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-gradient-to-br from-emerald-500/20 to-emerald-600/10 border border-emerald-500/30 backdrop-blur-xl rounded-2xl shadow-xl p-6">
          <p className="text-sm font-medium text-gray-300 mb-1">
            Total Credits Burned (Today)
          </p>
          <p className="text-3xl font-bold text-white">
            {loading ? "..." : stats.totalCreditsToday.toLocaleString()}
          </p>
        </div>
        <div className="bg-gradient-to-br from-amber-500/20 to-amber-600/10 border border-amber-500/30 backdrop-blur-xl rounded-2xl shadow-xl p-6">
          <p className="text-sm font-medium text-gray-300 mb-1">Success Rate</p>
          <p className="text-3xl font-bold text-white">
            {loading ? "..." : `${stats.successRate}%`}
          </p>
        </div>
        <div className="bg-gradient-to-br from-purple-500/20 to-purple-600/10 border border-purple-500/30 backdrop-blur-xl rounded-2xl shadow-xl p-6">
          <p className="text-sm font-medium text-gray-300 mb-1">
            Most Used Tool
          </p>
          <p className="text-3xl font-bold text-white capitalize">
            {loading ? "..." : stats.mostUsedTool}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div
        className="rounded-2xl p-5 mb-8 transition-all duration-300"
        style={{
          background:
            "linear-gradient(152.97deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.02) 100%)",
          backdropFilter: "blur(20px)",
          border: "1px solid rgba(255,255,255,0.10)",
        }}
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <input
              type="text"
              placeholder="Search by email, name or log ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-white/10 border border-white/20 text-white placeholder-gray-400 focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/50 transition-all"
            />
          </div>
          <div>
            <select
              value={filterTool}
              onChange={(e) => setFilterTool(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-white/10 border border-white/20 text-white focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/50"
            >
              <option value="" className="bg-gray-900">All Tools</option>
              {uniqueTools.map((tool) => (
                <option key={tool} value={tool} className="bg-gray-900 capitalize">
                  {tool}
                </option>
              ))}
            </select>
          </div>
          <div>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-white/10 border border-white/20 text-white focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/50"
            >
              <option value="" className="bg-gray-900">All Statuses</option>
              <option value="Success" className="bg-gray-900">Success</option>
              <option value="Failed" className="bg-gray-900">Failed</option>
            </select>
          </div>
        </div>
      </div>

      {/* Table */}
      <div
        className="rounded-2xl overflow-hidden"
        style={{
          background:
            "linear-gradient(152.97deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.02) 100%)",
          backdropFilter: "blur(20px)",
          border: "1px solid rgba(255,255,255,0.10)",
        }}
      >
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-white/10 text-white">
            <thead className="bg-white/5">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Log ID
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Tool & Theme
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Credits Spent
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Time
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                <tr>
                  <td colSpan="6" className="px-6 py-12 text-center text-gray-400">
                    Loading AI generation logs...
                  </td>
                </tr>
              ) : filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-12 text-center text-gray-400">
                    No generation logs found matching your filters.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-white/5 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-xs font-mono text-gray-400">
                      {log.id}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-amber-400">
                      <div>
                        <span className="block">{log.user}</span>
                        {log.fullName && (
                          <span className="text-xs text-gray-500 font-normal">
                            {log.fullName}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                      <span className="block font-medium capitalize">{log.tool.replace(/_/g, " ")}</span>
                      <span className="text-xs text-gray-500 uppercase">
                        {log.theme}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-rose-300">
                      -{log.cost}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                      {new Date(log.date).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span
                        className={`px-2 py-1 rounded text-xs font-bold ${log.status === "Success" ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" : "bg-rose-500/20 text-rose-400 border border-rose-500/30"}`}
                      >
                        {log.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AdminAILogs;
