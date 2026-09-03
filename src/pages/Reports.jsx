// src/pages/Reports.jsx
import { useEffect, useState, useMemo } from "react";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";
import {
  FiTrash2,
  FiPlus,
  FiX,
  FiRefreshCw,
  FiCalendar,
  FiDollarSign,
  FiAlertTriangle,
  FiDownload,
  FiSearch,
  FiFilter,
  FiPackage,
  FiPieChart,
} from "react-icons/fi";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import { showSuccess, showError } from "../services/swal";

const REASONS = [
  "EXPIRED",
  "SPOILED",
  "BURNT_IN_OVEN",
  "DAMAGED_IN_TRANSIT",
  "OTHER",
];

const COLORS = ["#f43f5e", "#f97316", "#eab308", "#8b5cf6", "#64748b"];

export default function Reports() {
  const [logs, setLogs] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [ingredients, setIngredients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [reasonFilter, setReasonFilter] = useState("ALL");

  // Date range filter
  const today = new Date().toISOString().split("T")[0];
  const last30Days = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split("T")[0];
  const [startDate, setStartDate] = useState(last30Days);
  const [endDate, setEndDate] = useState(today);

  // Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    ingredientId: "",
    ingredientName: "",
    quantity: 1,
    unit: "kg",
    reason: "EXPIRED",
    wasteDate: today,
    estimatedCostLoss: 0,
    loggedBy: "",
    notes: "",
  });

  const { user, isManager } = useAuth();
  const canLog = isManager;

  const fetchData = async () => {
    setLoading(true);
    try {
      const [logsRes, analyticsRes, ingRes] = await Promise.all([
        api.get(`/waste-logs/range?start=${startDate}&end=${endDate}`),
        api.get("/waste-logs/analytics"),
        api.get("/inventory"),
      ]);
      setLogs(logsRes.data);
      setAnalytics(analyticsRes.data);
      setIngredients(ingRes.data);
    } catch (err) {
      showError(err.response?.data?.message || "Failed to fetch waste & analytics data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [startDate, endDate]);

  const setDatePreset = (preset) => {
    const now = new Date();
    const t = now.toISOString().split("T")[0];
    if (preset === "TODAY") {
      setStartDate(t);
      setEndDate(t);
    } else if (preset === "7D") {
      const d7 = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
      setStartDate(d7);
      setEndDate(t);
    } else if (preset === "MONTH") {
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];
      setStartDate(startOfMonth);
      setEndDate(t);
    } else if (preset === "ALL") {
      setStartDate("2020-01-01");
      setEndDate(t);
    }
  };

  const openLogModal = () => {
    const firstIng = ingredients[0];
    setForm({
      ingredientId: firstIng ? firstIng.id : "",
      ingredientName: firstIng ? firstIng.name : "",
      quantity: 1,
      unit: firstIng ? firstIng.unit : "kg",
      reason: "EXPIRED",
      wasteDate: new Date().toISOString().split("T")[0],
      estimatedCostLoss: firstIng ? Number(firstIng.costPerUnit || 0) : 0,
      loggedBy: user?.username || "Staff",
      notes: "",
    });
    setModalOpen(true);
  };

  const handleIngredientChange = (ingId) => {
    if (!ingId) {
      setForm((prev) => ({
        ...prev,
        ingredientId: "",
        ingredientName: "",
        unit: "kg",
        estimatedCostLoss: 0,
      }));
      return;
    }
    const ing = ingredients.find((i) => i.id === Number(ingId));
    if (ing) {
      setForm((prev) => ({
        ...prev,
        ingredientId: ing.id,
        ingredientName: ing.name,
        unit: ing.unit,
        estimatedCostLoss: Number((prev.quantity * (ing.costPerUnit || 0)).toFixed(2)),
      }));
    }
  };

  const handleQuantityChange = (qty) => {
    const ing = ingredients.find((i) => i.id === Number(form.ingredientId));
    setForm((prev) => ({
      ...prev,
      quantity: qty,
      estimatedCostLoss: ing ? Number((Number(qty || 0) * (ing.costPerUnit || 0)).toFixed(2)) : prev.estimatedCostLoss,
    }));
  };

  const handleCreateWasteLog = async (e) => {
    e.preventDefault();
    if (!form.ingredientId && !form.ingredientName) {
      showError("Please select an ingredient");
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        ingredientId: form.ingredientId ? Number(form.ingredientId) : null,
        ingredientName: form.ingredientName,
        quantity: Number(form.quantity),
        unit: form.unit,
        reason: form.reason,
        wasteDate: form.wasteDate,
        estimatedCostLoss: Number(form.estimatedCostLoss),
        loggedBy: form.loggedBy || user?.username || "Staff",
        notes: form.notes,
      };

      await api.post("/waste-logs", payload);
      showSuccess("Food waste logged & raw stock deducted successfully!");
      setModalOpen(false);
      fetchData();
    } catch (err) {
      showError(err.response?.data?.message || "Failed to log food waste");
    } finally {
      setSubmitting(false);
    }
  };

  const exportCSV = () => {
    if (logs.length === 0) {
      showError("No logs to export");
      return;
    }
    const headers = ["ID,Date,Ingredient,Quantity,Unit,Reason,Cost Loss (Rs.),Logged By,Notes"];
    const rows = logs.map((l) =>
      [
        l.id,
        l.wasteDate,
        `"${l.ingredientName || ""}"`,
        l.quantity,
        l.unit,
        l.reason,
        Number(l.estimatedCostLoss || 0).toFixed(2),
        `"${l.loggedBy || ""}"`,
        `"${(l.notes || "").replace(/"/g, '""')}"`,
      ].join(",")
    );
    const csvContent = "data:text/csv;charset=utf-8," + [headers, ...rows].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `bakemaster_waste_report_${startDate}_${endDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Filtered logs
  const filteredLogs = useMemo(() => {
    return logs.filter((l) => {
      const searchLower = search.toLowerCase();
      const matchSearch =
        (l.ingredientName && l.ingredientName.toLowerCase().includes(searchLower)) ||
        (l.loggedBy && l.loggedBy.toLowerCase().includes(searchLower)) ||
        (l.notes && l.notes.toLowerCase().includes(searchLower));

      if (!matchSearch) return false;
      if (reasonFilter !== "ALL" && l.reason !== reasonFilter) return false;
      return true;
    });
  }, [logs, search, reasonFilter]);

  const chartData = (analytics?.reasonBreakdown || []).map((item) => ({
    name: item.reason.replace(/_/g, " "),
    value: Number(item.totalLoss || 0),
    count: item.count,
  }));

  const windowTotalLoss = filteredLogs.reduce((acc, l) => acc + (l.estimatedCostLoss || 0), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Food Waste, Spoilage & Loss Control</h1>
          <p className="text-sm text-gray-500">
            Log inventory write-offs, oven burn incidents, auto-deduct stock, and track loss analytics
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={fetchData}
            className="flex items-center gap-2 bg-white border border-gray-200 px-3 py-2 rounded-lg text-sm text-gray-700 hover:bg-gray-50 shadow-xs"
          >
            <FiRefreshCw className={loading ? "animate-spin" : ""} /> Refresh
          </button>
          <button
            onClick={exportCSV}
            className="flex items-center gap-2 bg-white border border-gray-200 px-3 py-2 rounded-lg text-sm text-gray-700 hover:bg-gray-50 shadow-xs"
            title="Export to CSV"
          >
            <FiDownload /> Export CSV
          </button>
          {canLog && (
            <button
              onClick={openLogModal}
              className="flex items-center gap-2 bg-rose-600 text-white px-4 py-2 rounded-lg hover:bg-rose-700 text-sm font-medium shadow-sm transition"
            >
              <FiPlus /> Log Waste & Deduct Stock
            </button>
          )}
        </div>
      </div>

      {/* Analytics KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl shadow-xs border border-gray-100 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Month Loss</p>
            <h3 className="text-2xl font-bold text-rose-600 mt-1">
              Rs.{Number(analytics?.currentMonthTotalLoss || 0).toFixed(2)}
            </h3>
            <p className="text-2xs text-gray-400 mt-0.5">Current month direct cost</p>
          </div>
          <div className="p-3 rounded-xl bg-rose-50 text-rose-600">
            <FiDollarSign size={22} />
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl shadow-xs border border-gray-100 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Selected Window Loss</p>
            <h3 className="text-2xl font-bold text-gray-800 mt-1">
              Rs.{windowTotalLoss.toFixed(2)}
            </h3>
            <p className="text-2xs text-gray-400 mt-0.5">{filteredLogs.length} incident(s) shown</p>
          </div>
          <div className="p-3 rounded-xl bg-amber-50 text-amber-600">
            <FiAlertTriangle size={22} />
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl shadow-xs border border-gray-100 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Total Recorded Logs</p>
            <h3 className="text-2xl font-bold text-gray-800 mt-1">
              {analytics?.totalRecordedLogs || 0}
            </h3>
            <p className="text-2xs text-gray-400 mt-0.5">All-time tracked events</p>
          </div>
          <div className="p-3 rounded-xl bg-indigo-50 text-indigo-600">
            <FiPackage size={22} />
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl shadow-xs border border-gray-100 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Date Window</p>
            <h3 className="text-xs font-bold text-gray-700 mt-2 truncate">
              {startDate} <br />to {endDate}
            </h3>
            <p className="text-2xs text-gray-400 mt-0.5">Active report filter</p>
          </div>
          <div className="p-3 rounded-xl bg-purple-50 text-purple-600">
            <FiCalendar size={22} />
          </div>
        </div>
      </div>

      {/* Analytics Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Pie Chart */}
        <div className="bg-white p-6 rounded-xl shadow-xs border border-gray-100">
          <h2 className="text-base font-bold text-gray-800 mb-1 flex items-center gap-1.5">
            <FiPieChart className="text-indigo-600" /> Loss by Category (Rs.)
          </h2>
          <p className="text-xs text-gray-400 mb-4">Financial distribution across causes</p>
          {chartData.length === 0 ? (
            <div className="h-56 flex items-center justify-center text-xs text-gray-400">
              No waste reasons recorded
            </div>
          ) : (
            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={70}
                    innerRadius={35}
                    paddingAngle={4}
                  >
                    {chartData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => [`Rs.${Number(value).toFixed(2)}`, "Loss"]} />
                  <Legend wrapperStyle={{ fontSize: "11px" }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Reason breakdown list */}
        <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-xs border border-gray-100 flex flex-col justify-between">
          <div>
            <h2 className="text-base font-bold text-gray-800 mb-1">Reason & Severity Analysis</h2>
            <p className="text-xs text-gray-400 mb-4">Cumulative financial toll and frequency</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {(analytics?.reasonBreakdown || []).map((item, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-3 rounded-xl bg-gray-50 border border-gray-100"
                >
                  <div className="flex items-center gap-2">
                    <span
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: COLORS[idx % COLORS.length] }}
                    />
                    <div>
                      <span className="font-semibold text-xs text-gray-800 block">
                        {item.reason}
                      </span>
                      <span className="text-2xs text-gray-400">{item.count} incident(s)</span>
                    </div>
                  </div>
                  <span className="font-bold text-sm text-rose-600">
                    Rs.{Number(item.totalLoss || 0).toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          </div>
          <div className="pt-3 mt-3 border-t border-gray-100 flex items-center justify-between text-2xs text-gray-400">
            <span>💡 Logging waste immediately decrements raw stock in inventory to maintain recipe precision.</span>
          </div>
        </div>
      </div>

      {/* Date Filter Presets and Search Bar */}
      <div className="bg-white p-4 rounded-xl shadow-xs border border-gray-100 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-gray-500">Presets:</span>
            <button
              onClick={() => setDatePreset("TODAY")}
              className="px-2.5 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded-md text-gray-700 font-medium"
            >
              Today
            </button>
            <button
              onClick={() => setDatePreset("7D")}
              className="px-2.5 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded-md text-gray-700 font-medium"
            >
              Last 7 Days
            </button>
            <button
              onClick={() => setDatePreset("MONTH")}
              className="px-2.5 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded-md text-gray-700 font-medium"
            >
              This Month
            </button>
            <button
              onClick={() => setDatePreset("ALL")}
              className="px-2.5 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded-md text-gray-700 font-medium"
            >
              All Time
            </button>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <label className="text-gray-500 font-medium">From:</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="border px-2.5 py-1 rounded bg-white outline-none focus:ring-1 focus:ring-indigo-500"
            />
            <label className="text-gray-500 font-medium">To:</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="border px-2.5 py-1 rounded bg-white outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4 pt-2 border-t border-gray-100">
          <div className="relative flex-1 min-w-[240px]">
            <FiSearch className="absolute left-3 top-3 text-gray-400" />
            <input
              type="text"
              placeholder="Search by ingredient, staff member, or notes..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
            />
          </div>

          <div className="flex bg-gray-100 p-1 rounded-lg text-xs font-medium">
            {["ALL", ...REASONS].map((r) => (
              <button
                key={r}
                onClick={() => setReasonFilter(r)}
                className={`px-2.5 py-1 rounded-md transition ${
                  reasonFilter === r ? "bg-white text-indigo-600 shadow-xs font-bold" : "text-gray-600 hover:text-black"
                }`}
              >
                {r.replace(/_/g, " ")}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Historical Logs Table */}
      <div className="bg-white rounded-xl shadow-xs border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead className="bg-gray-50 text-xs font-semibold text-gray-500 uppercase tracking-wider border-b border-gray-100">
              <tr>
                <th className="p-4">Date</th>
                <th className="p-4">Ingredient</th>
                <th className="p-4">Quantity Wasted</th>
                <th className="p-4">Loss Reason</th>
                <th className="p-4">Estimated Loss</th>
                <th className="p-4">Logged By</th>
                <th className="p-4">Incident Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-gray-400">
                    Loading waste records...
                  </td>
                </tr>
              ) : filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-gray-400">
                    No waste logs found for this filter criteria.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50/70 transition">
                    <td className="p-4 text-xs text-gray-600 font-medium">{log.wasteDate}</td>
                    <td className="p-4 font-semibold text-gray-800">{log.ingredientName}</td>
                    <td className="p-4 text-xs text-gray-700">
                      {log.quantity} {log.unit}
                    </td>
                    <td className="p-4">
                      <span className="inline-block px-2 py-0.5 rounded text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                        {log.reason}
                      </span>
                    </td>
                    <td className="p-4 font-bold text-rose-600">
                      Rs.{Number(log.estimatedCostLoss || 0).toFixed(2)}
                    </td>
                    <td className="p-4 text-xs text-gray-600">{log.loggedBy}</td>
                    <td className="p-4 text-xs text-gray-500 max-w-xs truncate">
                      {log.notes || "-"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Log Waste Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <div>
                <h2 className="text-lg font-bold text-gray-800">Log Food Waste & Deduct Stock</h2>
                <p className="text-xs text-gray-400">Inventory will be automatically decremented</p>
              </div>
              <button onClick={() => setModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <FiX size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateWasteLog} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Ingredient Wasted *
                </label>
                <select
                  required
                  className="w-full border px-3 py-2 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                  value={form.ingredientId}
                  onChange={(e) => handleIngredientChange(e.target.value)}
                >
                  <option value="">-- Choose Ingredient --</option>
                  {ingredients.map((ing) => (
                    <option key={ing.id} value={ing.id}>
                      {ing.name} ({ing.quantity} {ing.unit} in stock - Rs.{Number(ing.costPerUnit || 0).toFixed(2)}/{ing.unit})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Quantity *</label>
                  <input
                    type="number"
                    step="any"
                    min="0.01"
                    required
                    className="w-full border px-3 py-2 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                    value={form.quantity}
                    onChange={(e) => handleQuantityChange(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Unit</label>
                  <input
                    type="text"
                    readOnly
                    className="w-full border px-3 py-2 rounded-lg text-sm bg-gray-100 text-gray-600 outline-none"
                    value={form.unit}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Reason *</label>
                  <select
                    className="w-full border px-3 py-2 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                    value={form.reason}
                    onChange={(e) => setForm({ ...form, reason: e.target.value })}
                  >
                    {REASONS.map((r) => (
                      <option key={r} value={r}>
                        {r.replace(/_/g, " ")}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Calculated Loss (Rs.)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    className="w-full border px-3 py-2 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500 font-semibold text-rose-600"
                    value={form.estimatedCostLoss}
                    onChange={(e) => setForm({ ...form, estimatedCostLoss: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Waste Date</label>
                  <input
                    type="date"
                    required
                    className="w-full border px-3 py-2 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                    value={form.wasteDate}
                    onChange={(e) => setForm({ ...form, wasteDate: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Logged By</label>
                  <input
                    type="text"
                    className="w-full border px-3 py-2 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                    value={form.loggedBy}
                    onChange={(e) => setForm({ ...form, loggedBy: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Incident Description / Notes
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Discarded due to torn bag, or dropped while loading oven..."
                  className="w-full border px-3 py-2 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                />
              </div>

              <div className="pt-2 flex gap-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="flex-1 px-4 py-2 border rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 px-4 py-2 bg-rose-600 text-white rounded-lg text-sm font-semibold hover:bg-rose-700 disabled:opacity-50 shadow-sm"
                >
                  {submitting ? "Logging..." : "Log & Deduct Stock"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
