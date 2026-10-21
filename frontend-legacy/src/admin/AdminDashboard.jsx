import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { adminAPI } from "../api/api";

const AdminDashboard = () => {
  const [stats, setStats] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const data = await adminAPI.getStats();
        setStats(data.stats);
      } catch (err) {
        setError(err?.response?.data?.error || "Failed to load admin stats");
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  const StatCard = ({ title, value, icon, color = "amber" }) => {
    const colorConfig = {
      amber: {
        gradient: "from-amber-500/20 to-amber-600/10",
        border: "border-amber-500/30",
        text: "text-amber-400",
        bg: "bg-amber-500/20",
        shadow: "shadow-amber-500/20",
      },
      purple: {
        gradient: "from-purple-500/20 to-purple-600/10",
        border: "border-purple-500/30",
        text: "text-purple-400",
        bg: "bg-purple-500/20",
        shadow: "shadow-purple-500/20",
      },
      rose: {
        gradient: "from-rose-500/20 to-rose-600/10",
        border: "border-rose-500/30",
        text: "text-rose-400",
        bg: "bg-rose-500/20",
        shadow: "shadow-rose-500/20",
      },
      emerald: {
        gradient: "from-emerald-500/20 to-emerald-600/10",
        border: "border-emerald-500/30",
        text: "text-emerald-400",
        bg: "bg-emerald-500/20",
        shadow: "shadow-emerald-500/20",
      },
    };

    const config = colorConfig[color] || colorConfig.amber;

    return (
      <div
        className={`bg-gradient-to-br ${config.gradient} ${config.border} backdrop-blur-xl rounded-2xl border shadow-xl p-6 hover:shadow-2xl hover:scale-105 transition-all duration-300`}
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-300 mb-1">{title}</p>
            <p className="text-3xl font-bold text-white">
              {value?.toLocaleString() || "0"}
            </p>
          </div>
          <div className={`p-3 rounded-full ${config.bg} backdrop-blur-sm`}>
            <div className={`w-6 h-6 ${config.text}`}>{icon}</div>
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-400 mx-auto"></div>
          <p className="mt-4 text-gray-400">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 pt-24 md:pt-28">
      {/* Header Section - Matching Navbar aesthetic */}
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
                Admin Dashboard
              </h1>
              <p className="mt-1 text-sm text-gray-400">
                Manage users, monitor metrics, and oversee platform operations
              </p>
            </div>
            <Link
              to="/admin/users"
              className="inline-flex items-center justify-center px-5 py-2.5 rounded-full text-sm font-semibold text-[#F5E8E1] transition-all duration-300 hover:scale-105 whitespace-nowrap"
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
                  d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z"
                />
              </svg>
              Manage Users
            </Link>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
        {error && (
          <div className="mb-6 bg-rose-500/10 border border-rose-500/30 rounded-2xl p-4 backdrop-blur-sm">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg
                  className="h-5 w-5 text-rose-400"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-rose-400">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard
            title="Total Users"
            value={stats?.totalUsers}
            icon={
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z"
                />
              </svg>
            }
            color="amber"
          />
          <StatCard
            title="Pro Users"
            value={stats?.totalProUsers}
            icon={
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"
                />
              </svg>
            }
            color="purple"
          />
          <StatCard
            title="Blocked Users"
            value={stats?.totalBlockedUsers}
            icon={
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
                />
              </svg>
            }
            color="rose"
          />
          <StatCard
            title="Total Revenue"
            value={`$${stats?.totalRevenue?.toFixed(2)}`}
            icon={
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1"
                />
              </svg>
            }
            color="emerald"
          />
        </div>

        {/* Analytics & Financial Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* User Distribution Chart */}
          <div
            className="rounded-2xl p-6 transition-all duration-300"
            style={{
              background:
                "linear-gradient(152.97deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.02) 100%)",
              backdropFilter: "blur(20px)",
              WebkitBackdropFilter: "blur(20px)",
              border: "1px solid rgba(255,255,255,0.10)",
            }}
          >
            <h3 className="text-lg font-semibold text-white mb-4">
              User Distribution
            </h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="w-4 h-4 bg-amber-500 rounded-full mr-3 shadow-lg shadow-amber-500/30"></div>
                  <span className="text-sm text-gray-300">Free Users</span>
                </div>
                <span className="text-sm font-medium text-white">
                  {(
                    (stats?.totalUsers || 0) - (stats?.totalProUsers || 0)
                  ).toLocaleString()}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="w-4 h-4 bg-purple-500 rounded-full mr-3 shadow-lg shadow-purple-500/30"></div>
                  <span className="text-sm text-gray-300">Pro Users</span>
                </div>
                <span className="text-sm font-medium text-white">
                  {stats?.totalProUsers?.toLocaleString()}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="w-4 h-4 bg-rose-500 rounded-full mr-3 shadow-lg shadow-rose-500/30"></div>
                  <span className="text-sm text-gray-300">Blocked Users</span>
                </div>
                <span className="text-sm font-medium text-white">
                  {stats?.totalBlockedUsers?.toLocaleString()}
                </span>
              </div>
              <div className="mt-6">
                <div className="flex h-8 bg-gray-800/50 rounded-lg overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-amber-500 to-amber-400"
                    style={{
                      width: `${
                        (((stats?.totalUsers || 0) -
                          (stats?.totalProUsers || 0)) /
                          (stats?.totalUsers || 1)) *
                        100
                      }%`,
                    }}
                  ></div>
                  <div
                    className="bg-gradient-to-r from-purple-500 to-purple-400"
                    style={{
                      width: `${
                        ((stats?.totalProUsers || 0) /
                          (stats?.totalUsers || 1)) *
                        100
                      }%`,
                    }}
                  ></div>
                  <div
                    className="bg-gradient-to-r from-rose-500 to-rose-400"
                    style={{
                      width: `${
                        ((stats?.totalBlockedUsers || 0) /
                          (stats?.totalUsers || 1)) *
                        100
                      }%`,
                    }}
                  ></div>
                </div>
              </div>
            </div>
          </div>

          {/* Financial Overview */}
          <div
            className="rounded-2xl p-6 transition-all duration-300"
            style={{
              background:
                "linear-gradient(152.97deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.02) 100%)",
              backdropFilter: "blur(20px)",
              WebkitBackdropFilter: "blur(20px)",
              border: "1px solid rgba(255,255,255,0.10)",
            }}
          >
            <h3 className="text-lg font-semibold text-white mb-4">
              Financial Overview
            </h3>
            <div className="space-y-6">
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-gray-300">Total Revenue</span>
                  <span className="text-lg font-bold text-emerald-400">
                    ${stats?.totalRevenue?.toFixed(2)}
                  </span>
                </div>
                <div className="w-full bg-gray-800 rounded-full h-2">
                  <div
                    className="bg-gradient-to-r from-emerald-500 to-emerald-400 h-2 rounded-full"
                    style={{ width: "100%" }}
                  ></div>
                </div>
              </div>
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-gray-300">
                    Credits in Circulation
                  </span>
                  <span className="text-lg font-bold text-amber-400">
                    {stats?.totalCredits?.toLocaleString()}
                  </span>
                </div>
                <div className="w-full bg-gray-800 rounded-full h-2">
                  <div
                    className="bg-gradient-to-r from-amber-500 to-amber-400 h-2 rounded-full"
                    style={{ width: "100%" }}
                  ></div>
                </div>
              </div>
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-gray-300">
                    Avg Revenue per User
                  </span>
                  <span className="text-lg font-bold text-purple-400">
                    $
                    {stats?.totalUsers
                      ? (stats.totalRevenue / stats.totalUsers).toFixed(2)
                      : "0.00"}
                  </span>
                </div>
                <div className="w-full bg-gray-800 rounded-full h-2">
                  <div
                    className="bg-gradient-to-r from-purple-500 to-purple-400 h-2 rounded-full"
                    style={{ width: "75%" }}
                  ></div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Growth Trends Section */}
        <div
          className="rounded-2xl p-6 transition-all duration-300"
          style={{
            background:
              "linear-gradient(152.97deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.02) 100%)",
            backdropFilter: "blur(20px)",
            WebkitBackdropFilter: "blur(20px)",
            border: "1px solid rgba(255,255,255,0.10)",
          }}
        >
          <h3 className="text-lg font-semibold text-white mb-4">
            Growth Trends
          </h3>
          <div className="text-center py-12">
            <svg
              className="w-16 h-16 text-gray-600 mx-auto mb-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
              />
            </svg>
            <p className="text-gray-400 mb-2">
              Advanced analytics charts coming soon
            </p>
            <p className="text-sm text-gray-500">
              Historical data and trend analysis will be available in the next
              update
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
