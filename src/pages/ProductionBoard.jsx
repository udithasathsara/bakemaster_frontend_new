// src/pages/ProductionBoard.jsx
import { useEffect, useState } from "react";
import api from "../services/api";
import {
  FiChevronRight,
  FiCheckCircle,
  FiClock,
  FiRefreshCw,
  FiUser,
  FiCalendar,
  FiLayers,
} from "react-icons/fi";
import { showSuccess, showError } from "../services/swal";

const ORDER_STAGES = [
  {
    label: "📥 Received",
    value: "RECEIVED",
    sub: "Awaiting Confirmation",
    bg: "bg-amber-50/50",
    border: "border-amber-200",
    headerBg: "bg-amber-100/70 text-amber-900",
  },
  {
    label: "📋 Confirmed",
    value: "CONFIRMED",
    sub: "Stock Reserved, Ready",
    bg: "bg-blue-50/50",
    border: "border-blue-200",
    headerBg: "bg-blue-100/70 text-blue-900",
  },
  {
    label: "🔥 In Progress",
    value: "IN_PROGRESS",
    sub: "Baking & Prep",
    bg: "bg-purple-50/50",
    border: "border-purple-200",
    headerBg: "bg-purple-100/70 text-purple-900",
  },
  {
    label: "✨ Completed",
    value: "COMPLETED",
    sub: "Ready for Dispatch",
    bg: "bg-teal-50/50",
    border: "border-teal-200",
    headerBg: "bg-teal-100/70 text-teal-900",
  },
];

const TASK_STAGES = [
  {
    label: "⏳ Pending",
    value: "PENDING",
    headerBg: "bg-amber-100/70 text-amber-900",
    border: "border-amber-200",
  },
  {
    label: "👩‍🍳 In Progress",
    value: "IN_PROGRESS",
    headerBg: "bg-blue-100/70 text-blue-900",
    border: "border-blue-200",
  },
  {
    label: "✅ Completed",
    value: "COMPLETED",
    headerBg: "bg-emerald-100/70 text-emerald-900",
    border: "border-emerald-200",
  },
];

export default function ProductionBoard() {
  const [activeTab, setActiveTab] = useState("ORDERS"); // "ORDERS" or "TASKS"
  const [queue, setQueue] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [queueRes, tasksRes, staffRes] = await Promise.all([
        api.get("/orders/queue"),
        api.get("/production-tasks"),
        api.get("/staff"),
      ]);
      setQueue(queueRes.data);
      setTasks(tasksRes.data);
      setStaff(staffRes.data);
    } catch (err) {
      showError("Failed to fetch production board data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 20000); // auto-refresh every 20s
    return () => clearInterval(interval);
  }, []);

  // Advance Order Lifecycle
  const advanceOrder = async (order) => {
    try {
      if (order.status === "RECEIVED" || order.status === "PENDING") {
        await api.post(`/orders/${order.id}/confirm`);
        showSuccess(`Order #${order.id} confirmed! Tasks generated.`);
      } else if (order.status === "CONFIRMED") {
        await api.put(`/orders/${order.id}/status`, { status: "IN_PROGRESS" });
        showSuccess(`Order #${order.id} started baking!`);
      } else if (order.status === "IN_PROGRESS") {
        await api.put(`/orders/${order.id}/status`, { status: "COMPLETED" });
        showSuccess(`Order #${order.id} marked completed!`);
      } else if (order.status === "COMPLETED") {
        await api.put(`/orders/${order.id}/status`, { status: "DELIVERED" });
        showSuccess(`Order #${order.id} delivered!`);
      }
      fetchData();
    } catch (err) {
      showError(err.response?.data?.message || "Action failed");
    }
  };

  // Advance Task Status
  const advanceTask = async (task) => {
    const next = task.status === "PENDING" ? "IN_PROGRESS" : "COMPLETED";
    try {
      await api.put(`/production-tasks/${task.id}/status`, { status: next });
      showSuccess(`Task #${task.id} updated to ${next}`);
      fetchData();
    } catch (err) {
      showError("Failed to update task status");
    }
  };

  const getStaffName = (staffId) => {
    return staff.find((s) => s.id === staffId)?.name || "Unassigned";
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Kitchen & Production Board</h1>
          <p className="text-sm text-gray-500">
            Real-time bakery floor pipeline and kitchen workstation tasks
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="bg-white border border-gray-200 p-1 rounded-lg flex items-center shadow-xs">
            <button
              onClick={() => setActiveTab("ORDERS")}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition ${
                activeTab === "ORDERS"
                  ? "bg-indigo-600 text-white"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              Order Flow Kanban
            </button>
            <button
              onClick={() => setActiveTab("TASKS")}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition ${
                activeTab === "TASKS"
                  ? "bg-indigo-600 text-white"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              Kitchen Tasks ({tasks.filter((t) => t.status !== "COMPLETED" && t.status !== "CANCELLED").length})
            </button>
          </div>
          <button
            onClick={fetchData}
            className="flex items-center gap-2 bg-white border border-gray-200 px-3 py-2 rounded-lg text-sm text-gray-700 hover:bg-gray-50 shadow-sm"
          >
            <FiRefreshCw className={loading ? "animate-spin" : ""} /> Refresh
          </button>
        </div>
      </div>

      {/* View 1: Order Flow Kanban */}
      {activeTab === "ORDERS" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {ORDER_STAGES.map((stage) => {
            const orders = queue.filter(
              (o) =>
                o.status === stage.value ||
                (stage.value === "RECEIVED" && o.status === "PENDING")
            );

            return (
              <div
                key={stage.value}
                className={`rounded-2xl border ${stage.border} ${stage.bg} flex flex-col min-h-[500px] shadow-xs overflow-hidden`}
              >
                {/* Column Header */}
                <div className={`p-4 border-b ${stage.border} ${stage.headerBg} flex justify-between items-center`}>
                  <div>
                    <h3 className="font-bold text-sm">{stage.label}</h3>
                    <p className="text-2xs opacity-80">{stage.sub}</p>
                  </div>
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-white/70 shadow-xs">
                    {orders.length}
                  </span>
                </div>

                {/* Card Container */}
                <div className="p-3 space-y-3 flex-1 overflow-y-auto max-h-[calc(100vh-280px)]">
                  {orders.length === 0 ? (
                    <p className="text-xs text-center text-gray-400 py-10">
                      No orders in this stage.
                    </p>
                  ) : (
                    orders.map((order) => (
                      <div
                        key={order.id}
                        className="bg-white p-4 rounded-xl shadow-xs border border-gray-100 hover:shadow-md transition space-y-2.5"
                      >
                        <div className="flex justify-between items-start">
                          <span className="font-bold text-gray-900 text-sm">
                            Order #{order.id}
                          </span>
                          <span className="text-2xs font-semibold px-2 py-0.5 bg-gray-100 text-gray-600 rounded">
                            {order.channel}
                          </span>
                        </div>

                        <div className="text-xs text-gray-500 flex items-center gap-1">
                          <FiClock size={12} /> Deadline:{" "}
                          <span className="font-medium text-gray-700">
                            {order.deliveryDeadline || "Today"}
                          </span>
                        </div>

                        {order.deliveryAddress && (
                          <div className="text-2xs text-gray-400 truncate">
                            📍 {order.deliveryAddress}
                          </div>
                        )}

                        {/* Items list */}
                        <div className="bg-gray-50 p-2 rounded-lg text-xs space-y-1">
                          {order.items?.map((item) => (
                            <div
                              key={item.id}
                              className="flex justify-between text-gray-700 text-2xs"
                            >
                              <span className="font-medium">• {item.productName}</span>
                              <span className="font-bold">x{item.quantity}</span>
                            </div>
                          ))}
                        </div>

                        {/* Next action button */}
                        <button
                          onClick={() => advanceOrder(order)}
                          className="w-full mt-2 py-1.5 px-3 bg-indigo-600 text-white rounded-lg text-xs font-semibold hover:bg-indigo-700 transition flex items-center justify-center gap-1 shadow-xs"
                        >
                          {order.status === "RECEIVED" || order.status === "PENDING"
                            ? "Confirm & Plan Tasks"
                            : order.status === "CONFIRMED"
                            ? "Start Baking"
                            : order.status === "IN_PROGRESS"
                            ? "Mark Completed"
                            : "Mark Delivered"}{" "}
                          <FiChevronRight size={14} />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* View 2: Kitchen Workstation Tasks */}
      {activeTab === "TASKS" && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {TASK_STAGES.map((stage) => {
            const stageTasks = tasks.filter((t) => t.status === stage.value);

            return (
              <div
                key={stage.value}
                className={`rounded-2xl border ${stage.border} bg-gray-50/50 flex flex-col min-h-[500px] shadow-xs overflow-hidden`}
              >
                {/* Header */}
                <div className={`p-4 border-b ${stage.border} ${stage.headerBg} flex justify-between items-center`}>
                  <h3 className="font-bold text-sm">{stage.label}</h3>
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-white/70 shadow-xs">
                    {stageTasks.length}
                  </span>
                </div>

                {/* Tasks List */}
                <div className="p-3 space-y-3 flex-1 overflow-y-auto max-h-[calc(100vh-280px)]">
                  {stageTasks.length === 0 ? (
                    <p className="text-xs text-center text-gray-400 py-10">
                      No tasks in this category.
                    </p>
                  ) : (
                    stageTasks.map((task) => (
                      <div
                        key={task.id}
                        className="bg-white p-4 rounded-xl shadow-xs border border-gray-100 hover:shadow-md transition space-y-2"
                      >
                        <div className="flex justify-between items-start">
                          <span className="font-bold text-xs px-2 py-0.5 rounded bg-indigo-50 text-indigo-700">
                            {task.taskType}
                          </span>
                          <span
                            className={`text-2xs font-bold px-2 py-0.5 rounded-full ${
                              task.priority === 1
                                ? "bg-rose-100 text-rose-700"
                                : task.priority === 2
                                ? "bg-amber-100 text-amber-700"
                                : "bg-emerald-100 text-emerald-700"
                            }`}
                          >
                            Priority {task.priority}
                          </span>
                        </div>

                        <h4 className="font-bold text-gray-800 text-sm">
                          {task.productName || `Item #${task.orderItemId || task.orderId}`}
                          {task.quantity ? ` (x${task.quantity})` : ""}
                        </h4>

                        <div className="text-xs text-gray-500 space-y-1">
                          <div className="flex items-center gap-1.5 text-2xs text-gray-600">
                            <FiUser size={12} className="text-gray-400" />
                            <span>Assigned: </span>
                            <span className="font-semibold text-gray-800">
                              {getStaffName(task.assignedStaffId)}
                            </span>
                          </div>

                          <div className="flex items-center gap-1.5 text-2xs text-gray-600">
                            <FiCalendar size={12} className="text-gray-400" />
                            <span>
                              {task.scheduledStart
                                ? new Date(task.scheduledStart).toLocaleTimeString([], {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })
                                : "Scheduled"}
                              {" - "}
                              {task.scheduledEnd
                                ? new Date(task.scheduledEnd).toLocaleTimeString([], {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })
                                : ""}
                            </span>
                          </div>

                          {task.notes && (
                            <p className="text-2xs text-gray-500 italic bg-gray-50 p-1.5 rounded">
                              &ldquo;{task.notes}&rdquo;
                            </p>
                          )}
                        </div>

                        {task.status !== "COMPLETED" && (
                          <button
                            onClick={() => advanceTask(task)}
                            className="w-full mt-2 py-1.5 px-3 bg-indigo-600 text-white rounded-lg text-xs font-semibold hover:bg-indigo-700 transition flex items-center justify-center gap-1"
                          >
                            {task.status === "PENDING" ? "Start Task" : "Complete Task"}{" "}
                            <FiChevronRight size={14} />
                          </button>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
