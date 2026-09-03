// src/pages/Dashboard.jsx
import { useEffect, useState, useCallback } from "react";
import api from "../services/api";
import {
  FiAlertTriangle,
  FiClock,
  FiShoppingCart,
  FiLoader,
  FiRefreshCw,
  FiDollarSign,
  FiCheckCircle,
  FiTrendingUp,
  FiTrash2,
} from "react-icons/fi";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(() => {
    setLoading(true);
    api
      .get("/dashboard")
      .then((res) => {
        setData(res.data);
      })
      .catch((err) => {
        console.error("Failed to fetch dashboard data", err);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000); // refresh every 30s
    return () => clearInterval(interval);
  }, [fetchData]);

  if (loading && !data) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin h-10 w-10 border-4 border-indigo-600 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Failed to load dashboard metrics.</p>
        <button
          onClick={fetchData}
          className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm"
        >
          Try Again
        </button>
      </div>
    );
  }

  const lowStockList = data.lowStockAlerts || [];
  const expiringSoonList = data.expiringSoonAlerts || [];
  const expiredList = data.expiredAlerts || [];
  const topSellers = data.topSellingProducts || [];
  const weeklySales = data.weeklySalesTrend || [];

  const stats = [
    {
      label: "Today's Sales",
      value: `Rs.${(data.todaySalesTotal || 0).toFixed(2)}`,
      sub: `${data.todayOrdersCount || 0} orders today`,
      icon: FiDollarSign,
      color: "bg-emerald-100 text-emerald-700",
    },
    {
      label: "Orders In Progress",
      value: data.ordersInProgress || 0,
      sub: `${data.pendingOrders || 0} pending/received`,
      icon: FiLoader,
      color: "bg-blue-100 text-blue-700",
    },
    {
      label: "Completed Today",
      value: data.completedToday || 0,
      sub: "Bakes ready/delivered",
      icon: FiCheckCircle,
      color: "bg-indigo-100 text-indigo-700",
    },
    {
      label: "Monthly Waste Loss",
      value: `Rs.${(data.monthlyWasteCost || 0).toFixed(2)}`,
      sub: "Spoilage & loss this month",
      icon: FiTrash2,
      color: "bg-rose-100 text-rose-700",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap justify-between items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">
            Dashboard Overview
          </h1>
          <p className="text-sm text-gray-500">
            Real-time operations, inventory alerts, and sales performance
          </p>
        </div>
        <button
          onClick={fetchData}
          className="flex items-center gap-2 bg-white border border-gray-200 px-4 py-2 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 shadow-sm transition"
        >
          <FiRefreshCw className={loading ? "animate-spin" : ""} /> Refresh
        </button>
      </div>

      {/* Top Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s, i) => (
          <div
            key={i}
            className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex items-start justify-between"
          >
            <div>
              <p className="text-sm font-medium text-gray-500">{s.label}</p>
              <h3 className="text-2xl font-bold text-gray-800 mt-1">
                {s.value}
              </h3>
              <p className="text-xs text-gray-400 mt-1">{s.sub}</p>
            </div>
            <div className={`p-3 rounded-lg ${s.color}`}>
              <s.icon size={22} />
            </div>
          </div>
        ))}
      </div>

      {/* Urgent Alerts Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Low Stock Alert */}
        <div
          className={`p-4 rounded-xl border ${
            lowStockList.length > 0
              ? "bg-amber-50/70 border-amber-200"
              : "bg-white border-gray-100"
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold text-amber-900 flex items-center gap-2">
              <FiAlertTriangle className="text-amber-600" /> Low Stock
            </h3>
            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-amber-200 text-amber-900">
              {lowStockList.length} items
            </span>
          </div>
          {lowStockList.length === 0 ? (
            <p className="text-xs text-gray-400 mt-2">
              All ingredient stock levels are adequate.
            </p>
          ) : (
            <ul className="space-y-1.5 mt-2 max-h-36 overflow-y-auto pr-1 text-xs text-amber-950">
              {lowStockList.map((item) => (
                <li
                  key={item.id}
                  className="flex justify-between items-center py-1 border-b border-amber-200/50"
                >
                  <span className="font-medium">{item.name}</span>
                  <span className="text-amber-800">
                    {item.quantity} {item.unit} (min {item.reorderThreshold})
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Expiring Soon Alert */}
        <div
          className={`p-4 rounded-xl border ${
            expiringSoonList.length > 0
              ? "bg-orange-50/70 border-orange-200"
              : "bg-white border-gray-100"
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold text-orange-900 flex items-center gap-2">
              <FiClock className="text-orange-600" /> Expiring Soon (≤3 Days)
            </h3>
            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-orange-200 text-orange-900">
              {expiringSoonList.length} items
            </span>
          </div>
          {expiringSoonList.length === 0 ? (
            <p className="text-xs text-gray-400 mt-2">
              No items expiring within the next 3 days.
            </p>
          ) : (
            <ul className="space-y-1.5 mt-2 max-h-36 overflow-y-auto pr-1 text-xs text-orange-950">
              {expiringSoonList.map((item) => (
                <li
                  key={item.id}
                  className="flex justify-between items-center py-1 border-b border-orange-200/50"
                >
                  <span className="font-medium">{item.name}</span>
                  <span className="text-orange-800">{item.expiryDate}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Expired Items */}
        <div
          className={`p-4 rounded-xl border ${
            expiredList.length > 0
              ? "bg-red-50/70 border-red-200"
              : "bg-white border-gray-100"
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold text-red-900 flex items-center gap-2">
              <FiTrash2 className="text-red-600" /> Expired Stock
            </h3>
            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-red-200 text-red-900">
              {expiredList.length} items
            </span>
          </div>
          {expiredList.length === 0 ? (
            <p className="text-xs text-gray-400 mt-2">
              No expired stock recorded.
            </p>
          ) : (
            <ul className="space-y-1.5 mt-2 max-h-36 overflow-y-auto pr-1 text-xs text-red-950">
              {expiredList.map((item) => (
                <li
                  key={item.id}
                  className="flex justify-between items-center py-1 border-b border-red-200/50"
                >
                  <span className="font-medium">{item.name}</span>
                  <span className="text-red-700 font-semibold">
                    {item.expiryDate}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Analytics & Top Sellers Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sales Trend Chart (2 cols) */}
        <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                <FiTrendingUp className="text-indigo-600" /> 7-Day Revenue Trend
              </h2>
              <p className="text-xs text-gray-400">
                Daily sales revenue over the past week
              </p>
            </div>
          </div>
          {weeklySales.length === 0 ? (
            <div className="h-64 flex items-center justify-center text-gray-400 text-sm">
              No sales data available for the week
            </div>
          ) : (
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={weeklySales}
                  margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    stroke="#f1f5f9"
                  />
                  <XAxis
                    dataKey="dayOfWeek"
                    tick={{ fill: "#64748b", fontSize: 12 }}
                  />
                  <YAxis tick={{ fill: "#64748b", fontSize: 12 }} />
                  <Tooltip
                    formatter={(value) => [
                      `Rs.${Number(value).toFixed(2)}`,
                      "Sales",
                    ]}
                    labelFormatter={(label) => `Day: ${label}`}
                    contentStyle={{
                      backgroundColor: "#1e293b",
                      borderRadius: "8px",
                      color: "#fff",
                      border: "none",
                      fontSize: "12px",
                    }}
                  />
                  <Bar dataKey="sales" fill="#6366f1" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Top Selling Products (1 col) */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col justify-between">
          <div>
            <h2 className="text-lg font-bold text-gray-800 mb-1">
              Top Selling Products
            </h2>
            <p className="text-xs text-gray-400 mb-4">
              Best performers based on customer orders
            </p>
            {topSellers.length === 0 ? (
              <p className="text-sm text-gray-400 py-8 text-center">
                No order sales recorded yet.
              </p>
            ) : (
              <div className="space-y-4">
                {topSellers.map((prod, idx) => (
                  <div key={idx} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="font-semibold text-gray-700">
                        {idx + 1}. {prod.productName}
                      </span>
                      <span className="text-gray-500 font-medium">
                        {prod.quantitySold} sold (Rs.
                        {Number(prod.totalRevenue || 0).toFixed(2)})
                      </span>
                    </div>
                    <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-indigo-600 rounded-full"
                        style={{
                          width: `${Math.min(
                            100,
                            (prod.quantitySold /
                              Math.max(1, topSellers[0].quantitySold)) *
                              100,
                          )}%`,
                        }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="pt-4 mt-4 border-t border-gray-100 text-xs text-gray-400 flex justify-between">
            <span>Live Sales Tracker</span>
            <span>Auto-refreshed</span>
          </div>
        </div>
      </div>
    </div>
  );
}
