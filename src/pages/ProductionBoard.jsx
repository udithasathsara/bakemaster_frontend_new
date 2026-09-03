// src/pages/ProductionBoard.jsx
import { useEffect, useState } from "react";
import api from "../services/api";
import { FiChevronRight } from "react-icons/fi";
import { showSuccess, showError } from "../services/swal";

const stages = [
  {
    label: "📋 Pending",
    value: "PENDING",
    bg: "bg-yellow-50",
    border: "border-yellow-200",
  },
  {
    label: "🔄 In Progress",
    value: "IN_PROGRESS",
    bg: "bg-blue-50",
    border: "border-blue-200",
  },
  {
    label: "🔥 Baking",
    value: "BAKING",
    bg: "bg-pink-50",
    border: "border-pink-200",
  },
  {
    label: "✅ Delivered",
    value: "DELIVERED",
    bg: "bg-green-50",
    border: "border-green-200",
  },
];

export default function ProductionBoard() {
  const [queue, setQueue] = useState([]);
  const fetchQueue = () =>
    api.get("/orders/queue").then((res) => setQueue(res.data));
  useEffect(() => {
    fetchQueue();
  }, []);

  const advance = async (order) => {
    const next =
      order.status === "PENDING"
        ? "IN_PROGRESS"
        : order.status === "IN_PROGRESS"
          ? "BAKING"
          : "DELIVERED";
    try {
      await api.put(`/orders/${order.id}/status`, { status: next });
      showSuccess(`Order #${order.id} → ${next}`);
      fetchQueue();
    } catch (err) {
      showError(err.response?.data?.message || "Update failed");
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Production Board</h1>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {stages.map((stage) => {
          const orders = queue.filter((o) => o.status === stage.value);
          return (
            <div
              key={stage.value}
              className={`rounded-xl p-4 min-h-[300px] ${stage.bg} ${stage.border} border`}
            >
              <h3 className="font-bold text-lg mb-3">{stage.label}</h3>
              <div className="space-y-2">
                {orders.map((order) => (
                  <div
                    key={order.id}
                    className="bg-white p-3 rounded shadow-sm"
                  >
                    <div className="flex justify-between items-start">
                      <strong>#{order.id}</strong>
                      <span className="text-xs text-gray-500">
                        {order.channel}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Deadline: {order.deliveryDeadline}
                    </p>
                    <ul className="text-sm mt-2">
                      {order.items.map((item) => (
                        <li key={item.id}>
                          • {item.productName} x{item.quantity}
                        </li>
                      ))}
                    </ul>
                    {order.status !== "DELIVERED" && (
                      <button
                        onClick={() => advance(order)}
                        className="mt-2 w-full flex items-center justify-center gap-1 bg-indigo-500 text-white px-3 py-1 rounded text-sm hover:bg-indigo-600"
                      >
                        {order.status === "PENDING"
                          ? "Start"
                          : order.status === "IN_PROGRESS"
                            ? "Bake"
                            : "Deliver"}{" "}
                        <FiChevronRight />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
