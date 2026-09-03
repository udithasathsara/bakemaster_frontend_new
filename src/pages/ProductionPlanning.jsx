// src/pages/ProductionPlanning.jsx
import { useEffect, useState, useMemo } from "react";
import api from "../services/api";
import LoadingSpinner from "../components/LoadingSpinner";
import {
  FiPlus,
  FiX,
  FiTrash2,
  FiAlertTriangle,
  FiCheckCircle,
  FiClock,
  FiUsers,
  FiSearch,
  FiRefreshCw,
  FiCalendar,
  FiChevronRight,
  FiActivity,
} from "react-icons/fi";
import { showSuccess, showError, showConfirm } from "../services/swal";
import { useAuth } from "../context/AuthContext";

const TASK_TYPES = ["BAKING", "DECORATING", "PACKAGING", "DELIVERY"];

export default function ProductionPlanning() {
  const [tasks, setTasks] = useState([]);
  const [staff, setStaff] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [staffFilter, setStaffFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");

  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({
    orderId: "",
    taskType: "BAKING",
    quantity: 1,
    assignedStaffId: "",
    scheduledStart: "",
    scheduledEnd: "",
    priority: 2,
    notes: "",
  });

  const { isManager, isAdmin } = useAuth();
  const canEdit = isManager;

  const fetchData = async () => {
    setLoading(true);
    try {
      const [tasksRes, staffRes, ordersRes] = await Promise.all([
        api.get("/production-tasks"),
        api.get("/staff"),
        api.get("/orders"),
      ]);
      setTasks(tasksRes.data);
      setStaff(staffRes.data);
      setOrders(ordersRes.data);
    } catch (err) {
      showError(err.response?.data?.message || "Failed to load production planning data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const openAddModal = () => {
    const now = new Date();
    const startTime = new Date(now.getTime() + 15 * 60000).toISOString().slice(0, 16);
    const endTime = new Date(now.getTime() + 105 * 60000).toISOString().slice(0, 16);

    setForm({
      orderId: orders.length > 0 ? orders[0].id : "",
      taskType: "BAKING",
      quantity: 1,
      assignedStaffId: "",
      scheduledStart: startTime,
      scheduledEnd: endTime,
      priority: 2,
      notes: "",
    });
    setModalOpen(true);
  };

  // Client-side conflict check
  const checkStaffConflict = (staffId, startStr, endStr, excludeTaskId = null) => {
    if (!staffId || !startStr || !endStr) return null;
    const start = new Date(startStr).getTime();
    const end = new Date(endStr).getTime();
    if (isNaN(start) || isNaN(end) || end <= start) return null;

    for (const t of tasks) {
      if (excludeTaskId && t.id === excludeTaskId) continue;
      if (t.assignedStaffId === Number(staffId) && t.status !== "COMPLETED" && t.status !== "CANCELLED") {
        if (t.scheduledStart && t.scheduledEnd) {
          const tStart = new Date(t.scheduledStart).getTime();
          const tEnd = new Date(t.scheduledEnd).getTime();
          if (start < tEnd && end > tStart) {
            return t;
          }
        }
      }
    }
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.scheduledStart || !form.scheduledEnd) {
      showError("Please specify both start and end times.");
      return;
    }

    if (new Date(form.scheduledEnd) <= new Date(form.scheduledStart)) {
      showError("Scheduled end time must be after scheduled start time.");
      return;
    }

    // Check conflict
    if (form.assignedStaffId) {
      const conflict = checkStaffConflict(form.assignedStaffId, form.scheduledStart, form.scheduledEnd);
      if (conflict) {
        const staffName = staff.find((s) => s.id === Number(form.assignedStaffId))?.name || "This staff member";
        showError(
          `Double-Booking Conflict! ${staffName} is already assigned to task "${conflict.productName || conflict.taskType}" during this time window. Same member cannot be assigned to two tasks at the same time.`
        );
        return;
      }
    }

    try {
      const payload = {
        orderId: Number(form.orderId),
        taskType: form.taskType,
        quantity: form.quantity ? Number(form.quantity) : 1,
        assignedStaffId: form.assignedStaffId ? Number(form.assignedStaffId) : null,
        scheduledStart:
          form.scheduledStart.length === 16 ? form.scheduledStart + ":00" : form.scheduledStart,
        scheduledEnd:
          form.scheduledEnd.length === 16 ? form.scheduledEnd + ":00" : form.scheduledEnd,
        priority: form.priority ? Number(form.priority) : 2,
        notes: form.notes,
      };

      await api.post("/production-tasks", payload);
      showSuccess("Production task scheduled successfully!");
      setModalOpen(false);
      fetchData();
    } catch (err) {
      showError(err.response?.data?.message || "Failed to create task");
    }
  };

  const assignStaff = async (taskId, staffId) => {
    const task = tasks.find((t) => t.id === taskId);
    if (staffId && task && task.scheduledStart && task.scheduledEnd) {
      const conflict = checkStaffConflict(staffId, task.scheduledStart, task.scheduledEnd, taskId);
      if (conflict) {
        const staffName = staff.find((s) => s.id === Number(staffId))?.name || "This staff member";
        showError(
          `Scheduling Conflict! ${staffName} is already assigned to task "${conflict.productName || conflict.taskType}" at this time. Same member cannot be assigned to two tasks at the same time.`
        );
        return;
      }
    }

    try {
      await api.put(`/production-tasks/${taskId}/assign`, {
        staffId: staffId ? Number(staffId) : null,
      });
      showSuccess("Staff assignment updated!");
      fetchData();
    } catch (err) {
      showError(err.response?.data?.message || "Error assigning staff");
    }
  };

  const updateStatus = async (taskId, nextStatus) => {
    try {
      await api.put(`/production-tasks/${taskId}/status`, { status: nextStatus });
      showSuccess(`Task status set to ${nextStatus}`);
      fetchData();
    } catch (err) {
      showError("Error updating task status");
    }
  };

  const deleteTask = async (id) => {
    const result = await showConfirm("Delete this production task?");
    if (result.isConfirmed) {
      try {
        await api.delete(`/production-tasks/${id}`);
        showSuccess("Task deleted");
        fetchData();
      } catch (err) {
        showError(err.response?.data?.message || "Failed to delete task");
      }
    }
  };

  const getStaffName = (id) => staff.find((s) => s.id === id)?.name || "Unassigned";

  const getOrderInfo = (id) => {
    const order = orders.find((o) => o.id === id);
    return order ? `Order #${order.id} (${order.channel})` : `Order #${id}`;
  };

  // Conflict state inside form modal for real-time visual warning
  const currentModalConflict = useMemo(() => {
    if (!form.assignedStaffId || !form.scheduledStart || !form.scheduledEnd) return null;
    return checkStaffConflict(form.assignedStaffId, form.scheduledStart, form.scheduledEnd);
  }, [form.assignedStaffId, form.scheduledStart, form.scheduledEnd, tasks]);

  const filteredTasks = useMemo(() => {
    return tasks.filter((t) => {
      const searchLower = search.toLowerCase();
      const staffName = getStaffName(t.assignedStaffId).toLowerCase();
      const prodName = (t.productName || "").toLowerCase();
      const matchSearch =
        String(t.id).includes(searchLower) ||
        String(t.orderId).includes(searchLower) ||
        prodName.includes(searchLower) ||
        staffName.includes(searchLower);

      if (!matchSearch) return false;
      if (typeFilter !== "ALL" && t.taskType !== typeFilter) return false;
      if (staffFilter !== "ALL" && String(t.assignedStaffId) !== staffFilter) return false;
      if (statusFilter !== "ALL" && t.status !== statusFilter) return false;
      return true;
    });
  }, [tasks, search, typeFilter, staffFilter, statusFilter, staff]);

  // Metrics
  const totalTasksCount = tasks.length;
  const inProgressCount = tasks.filter((t) => t.status === "IN_PROGRESS").length;
  const unassignedCount = tasks.filter((t) => !t.assignedStaffId && t.status !== "COMPLETED").length;
  const highPriorityCount = tasks.filter((t) => t.priority === 1 && t.status !== "COMPLETED").length;

  if (loading && tasks.length === 0) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Production Planning & Scheduling</h1>
          <p className="text-sm text-gray-500">
            Workstation dispatch, schedule timeline, and conflict-free staff assignment
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchData}
            className="flex items-center gap-2 bg-white border border-gray-200 px-3 py-2 rounded-lg text-sm text-gray-700 hover:bg-gray-50 shadow-xs"
          >
            <FiRefreshCw className={loading ? "animate-spin" : ""} /> Refresh
          </button>
          {canEdit && (
            <button
              onClick={openAddModal}
              className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 text-sm font-medium shadow-sm transition"
            >
              <FiPlus /> Plan New Task
            </button>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl shadow-xs border border-gray-100 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Scheduled Tasks</p>
            <h3 className="text-2xl font-bold text-gray-800 mt-1">{totalTasksCount}</h3>
            <p className="text-2xs text-gray-400 mt-0.5">Total production runs</p>
          </div>
          <div className="p-3 rounded-xl bg-indigo-50 text-indigo-600">
            <FiActivity size={22} />
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl shadow-xs border border-gray-100 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Baking / Active</p>
            <h3 className="text-2xl font-bold text-purple-600 mt-1">{inProgressCount}</h3>
            <p className="text-2xs text-gray-400 mt-0.5">Currently on bakery floor</p>
          </div>
          <div className="p-3 rounded-xl bg-purple-50 text-purple-600">
            <FiClock size={22} />
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl shadow-xs border border-gray-100 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Unassigned Tasks</p>
            <h3 className="text-2xl font-bold text-amber-600 mt-1">{unassignedCount}</h3>
            <p className="text-2xs text-gray-400 mt-0.5">Needs chef/staff assignment</p>
          </div>
          <div className="p-3 rounded-xl bg-amber-50 text-amber-600">
            <FiUsers size={22} />
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl shadow-xs border border-gray-100 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">High Priority</p>
            <h3 className="text-2xl font-bold text-rose-600 mt-1">{highPriorityCount}</h3>
            <p className="text-2xs text-gray-400 mt-0.5">Rush orders requiring focus</p>
          </div>
          <div className="p-3 rounded-xl bg-rose-50 text-rose-600">
            <FiAlertTriangle size={22} />
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl shadow-xs border border-gray-100 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="relative flex-1 min-w-[240px]">
            <FiSearch className="absolute left-3 top-3 text-gray-400" />
            <input
              type="text"
              placeholder="Search by task #, order #, product, or assigned staff..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={staffFilter}
              onChange={(e) => setStaffFilter(e.target.value)}
              className="border px-3 py-2 rounded-lg text-xs bg-white outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
            >
              <option value="ALL">All Staff</option>
              {staff.map((s) => (
                <option key={s.id} value={String(s.id)}>
                  {s.name} ({s.role})
                </option>
              ))}
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="border px-3 py-2 rounded-lg text-xs bg-white outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
            >
              <option value="ALL">All Status</option>
              <option value="PENDING">Pending</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="COMPLETED">Completed</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>
        </div>

        {/* Task Type Pills */}
        <div className="flex bg-gray-100 p-1 rounded-lg text-xs font-medium w-fit">
          {["ALL", ...TASK_TYPES].map((type) => (
            <button
              key={type}
              onClick={() => setTypeFilter(type)}
              className={`px-3 py-1.5 rounded-md transition ${
                typeFilter === type ? "bg-white text-indigo-600 shadow-xs font-bold" : "text-gray-600 hover:text-black"
              }`}
            >
              {type}
            </button>
          ))}
        </div>
      </div>

      {/* Production Tasks Table */}
      <div className="bg-white rounded-xl shadow-xs border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead className="bg-gray-50 text-xs font-semibold text-gray-500 uppercase tracking-wider border-b border-gray-100">
              <tr>
                <th className="p-4">Station / Task</th>
                <th className="p-4">Associated Order</th>
                <th className="p-4">Assigned Personnel</th>
                <th className="p-4">Priority</th>
                <th className="p-4">Status</th>
                <th className="p-4">Scheduled Window</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredTasks.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-gray-400">
                    No production tasks matching current criteria.
                  </td>
                </tr>
              ) : (
                filteredTasks.map((task) => {
                  const isCompleted = task.status === "COMPLETED";
                  const isInProgress = task.status === "IN_PROGRESS";
                  const isPending = task.status === "PENDING";

                  return (
                    <tr key={task.id} className="hover:bg-gray-50/70 transition">
                      <td className="p-4">
                        <div className="font-semibold text-gray-800">
                          {task.productName || `Task #${task.id}`}
                          {task.quantity > 0 && (
                            <span className="ml-1 text-xs text-indigo-600 font-bold">(x{task.quantity})</span>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span
                            className={`px-2 py-0.5 rounded text-2xs font-bold uppercase ${
                              task.taskType === "BAKING"
                                ? "bg-amber-100 text-amber-800"
                                : task.taskType === "DECORATING"
                                ? "bg-pink-100 text-pink-800"
                                : task.taskType === "PACKAGING"
                                ? "bg-blue-100 text-blue-800"
                                : "bg-emerald-100 text-emerald-800"
                            }`}
                          >
                            {task.taskType}
                          </span>
                          {task.notes && <span className="text-2xs text-gray-400 italic truncate max-w-xs">{task.notes}</span>}
                        </div>
                      </td>

                      <td className="p-4 text-xs text-gray-600">
                        <div className="font-medium text-gray-800">{getOrderInfo(task.orderId)}</div>
                      </td>

                      <td className="p-4">
                        {canEdit ? (
                          <select
                            value={task.assignedStaffId || ""}
                            onChange={(e) => assignStaff(task.id, e.target.value)}
                            className="border text-xs px-2.5 py-1.5 rounded-lg bg-white font-medium text-gray-700 outline-none focus:ring-1 focus:ring-indigo-500 shadow-2xs"
                          >
                            <option value="">-- Unassigned --</option>
                            {staff.map((s) => (
                              <option key={s.id} value={s.id}>
                                {s.name} ({s.role})
                              </option>
                            ))}
                          </select>
                        ) : (
                          <span className="text-xs font-semibold text-gray-700">
                            {getStaffName(task.assignedStaffId)}
                          </span>
                        )}
                      </td>

                      <td className="p-4">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-bold ${
                            task.priority === 1
                              ? "bg-rose-100 text-rose-800"
                              : task.priority === 2
                              ? "bg-amber-100 text-amber-800"
                              : "bg-emerald-100 text-emerald-800"
                          }`}
                        >
                          {task.priority === 1 ? "High" : task.priority === 2 ? "Medium" : "Low"}
                        </span>
                      </td>

                      <td className="p-4">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                            isCompleted
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : isInProgress
                              ? "bg-purple-50 text-purple-700 border-purple-200"
                              : "bg-amber-50 text-amber-700 border-amber-200"
                          }`}
                        >
                          {task.status}
                        </span>
                      </td>

                      <td className="p-4 text-xs text-gray-600">
                        <div className="flex items-center gap-1.5">
                          <FiCalendar size={13} className="text-indigo-400" />
                          <span>
                            {task.scheduledStart
                              ? new Date(task.scheduledStart).toLocaleString([], {
                                  month: "short",
                                  day: "numeric",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })
                              : "N/A"}{" "}
                            –{" "}
                            {task.scheduledEnd
                              ? new Date(task.scheduledEnd).toLocaleTimeString([], {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })
                              : "N/A"}
                          </span>
                        </div>
                      </td>

                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {isPending && (
                            <button
                              onClick={() => updateStatus(task.id, "IN_PROGRESS")}
                              className="px-2.5 py-1 bg-indigo-600 text-white rounded-lg text-xs font-semibold hover:bg-indigo-700 transition flex items-center gap-1"
                              title="Start Workstation Run"
                            >
                              Start <FiChevronRight size={12} />
                            </button>
                          )}

                          {isInProgress && (
                            <button
                              onClick={() => updateStatus(task.id, "COMPLETED")}
                              className="px-2.5 py-1 bg-emerald-600 text-white rounded-lg text-xs font-semibold hover:bg-emerald-700 transition flex items-center gap-1"
                              title="Complete Task"
                            >
                              <FiCheckCircle size={12} /> Done
                            </button>
                          )}

                          {isAdmin && (
                            <button
                              onClick={() => deleteTask(task.id)}
                              className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition"
                              title="Delete Task"
                            >
                              <FiTrash2 size={16} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: New Production Task */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl overflow-hidden max-h-[90vh] flex flex-col">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <h2 className="text-lg font-bold text-gray-800">Schedule Production Task</h2>
              <button onClick={() => setModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <FiX size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
              {/* Conflict Alert Banner */}
              {currentModalConflict && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2.5 text-xs text-rose-800">
                  <FiAlertTriangle className="text-rose-600 mt-0.5 shrink-0" size={16} />
                  <div>
                    <span className="font-bold block">Scheduling Conflict Detected!</span>
                    <span>
                      {getStaffName(Number(form.assignedStaffId))} is already assigned to task "
                      {currentModalConflict.productName || currentModalConflict.taskType}" during this time window. Same member cannot be double-booked.
                    </span>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Select Order *</label>
                <select
                  required
                  className="w-full border px-3 py-2 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                  value={form.orderId}
                  onChange={(e) => setForm({ ...form, orderId: e.target.value })}
                >
                  <option value="">-- Choose Order --</option>
                  {orders.map((o) => (
                    <option key={o.id} value={o.id}>
                      Order #{o.id} – {o.channel} ({o.items?.length || 0} items)
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Workstation *</label>
                  <select
                    className="w-full border px-3 py-2 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                    value={form.taskType}
                    onChange={(e) => setForm({ ...form, taskType: e.target.value })}
                  >
                    {TASK_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Batch Quantity</label>
                  <input
                    type="number"
                    min="1"
                    className="w-full border px-3 py-2 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                    value={form.quantity}
                    onChange={(e) => setForm({ ...form, quantity: Math.max(1, Number(e.target.value)) })}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Priority</label>
                  <select
                    className="w-full border px-3 py-2 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                    value={form.priority}
                    onChange={(e) => setForm({ ...form, priority: Number(e.target.value) })}
                  >
                    <option value={1}>High (Rush)</option>
                    <option value={2}>Medium (Standard)</option>
                    <option value={3}>Low</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Assign Staff Member</label>
                <select
                  className="w-full border px-3 py-2 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                  value={form.assignedStaffId}
                  onChange={(e) => setForm({ ...form, assignedStaffId: e.target.value })}
                >
                  <option value="">-- Leave Unassigned --</option>
                  {staff.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.role}) - Shift: {s.shiftStart?.slice(0, 5)} to {s.shiftEnd?.slice(0, 5)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Scheduled Start *</label>
                  <input
                    type="datetime-local"
                    required
                    className="w-full border px-3 py-2 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                    value={form.scheduledStart}
                    onChange={(e) => setForm({ ...form, scheduledStart: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Scheduled End *</label>
                  <input
                    type="datetime-local"
                    required
                    className="w-full border px-3 py-2 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                    value={form.scheduledEnd}
                    onChange={(e) => setForm({ ...form, scheduledEnd: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Instructions / Notes</label>
                <textarea
                  rows={2}
                  placeholder="e.g. Extra butter crust, bake on deck 2 at 180C..."
                  className="w-full border px-3 py-2 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                />
              </div>

              <div className="pt-3 flex gap-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="flex-1 px-4 py-2 border rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!!currentModalConflict}
                  className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"
                >
                  Confirm & Schedule
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
