import React from "react";

const AdminAILogs = () => {
  const mockLogs = [
    {
      id: "gen_001",
      user: "couple_88",
      tool: "retexturing",
      theme: "haldi",
      cost: 10,
      status: "Success",
      date: "2 mins ago",
    },
    {
      id: "gen_002",
      user: "planner_x",
      tool: "image_to_video",
      theme: "N/A",
      cost: 25,
      status: "Success",
      date: "15 mins ago",
    },
    {
      id: "gen_003",
      user: "couple_42",
      tool: "angle_change",
      theme: "N/A",
      cost: 15,
      status: "Failed",
      date: "1 hour ago",
    },
    {
      id: "gen_004",
      user: "couple_88",
      tool: "retexturing",
      theme: "sangeet",
      cost: 10,
      status: "Success",
      date: "2 hours ago",
    },
  ];

  return (
    <div className="pt-24 md:pt-28 px-4 sm:px-6 lg:px-8 pb-12 w-full max-w-7xl mx-auto">
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
            <h1 className="text-3xl font-bold bg-gradient-to-r from-amber-400 to-amber-300 bg-clip-text text-transparent">
              AI Generation Logs
            </h1>
            <p className="mt-1 text-sm text-gray-400">
              Monitor FLUX API usage, credit consumption, and system health
            </p>
          </div>
          <button className="inline-flex items-center px-4 py-2 rounded-full text-sm font-semibold text-[#F5E8E1] bg-[#D48C8C] hover:scale-105 transition-transform shadow-[0_10px_26px_rgba(0,0,0,0.28)]">
            Export CSV
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-gradient-to-br from-emerald-500/20 to-emerald-600/10 border border-emerald-500/30 backdrop-blur-xl rounded-2xl shadow-xl p-6">
          <p className="text-sm font-medium text-gray-300 mb-1">
            Total Credits Burned (Today)
          </p>
          <p className="text-3xl font-bold text-white">1,450</p>
        </div>
        <div className="bg-gradient-to-br from-amber-500/20 to-amber-600/10 border border-amber-500/30 backdrop-blur-xl rounded-2xl shadow-xl p-6">
          <p className="text-sm font-medium text-gray-300 mb-1">Success Rate</p>
          <p className="text-3xl font-bold text-white">98.2%</p>
        </div>
        <div className="bg-gradient-to-br from-purple-500/20 to-purple-600/10 border border-purple-500/30 backdrop-blur-xl rounded-2xl shadow-xl p-6">
          <p className="text-sm font-medium text-gray-300 mb-1">
            Most Used Tool
          </p>
          <p className="text-3xl font-bold text-white">Retexturing</p>
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
              {mockLogs.map((log) => (
                <tr key={log.id} className="hover:bg-white/5 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-400">
                    {log.id}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-amber-400">
                    {log.user}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                    <span className="block font-medium">{log.tool}</span>
                    <span className="text-xs text-gray-500 uppercase">
                      {log.theme}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-rose-300">
                    -{log.cost}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                    {log.date}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <span
                      className={`px-2 py-1 rounded text-xs font-bold ${log.status === "Success" ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" : "bg-rose-500/20 text-rose-400 border border-rose-500/30"}`}
                    >
                      {log.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AdminAILogs;
