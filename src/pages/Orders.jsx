// src/pages/Orders.jsx
import { useEffect, useState } from "react";
import api from "../services/api";
import { FiPlus, FiTrash2, FiX } from "react-icons/fi";
import { showSuccess, showError, showConfirm } from "../services/swal";

export default function Orders() {
  const [orders, setOrders] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({
    customerId: "",
    channel: "WALK_IN",
    deliveryDeadline: "",
    items: [{ productName: "", quantity: 1, unitPrice: 0 }],
  });

  const fetchOrders = () =>
    api.get("/orders").then((res) => setOrders(res.data));
  useEffect(() => {
    fetchOrders();
    api.get("/customers").then((res) => setCustomers(res.data));
  }, []);

  const addItem = () =>
    setForm({
      ...form,
      items: [...form.items, { productName: "", quantity: 1, unitPrice: 0 }],
    });
  const removeItem = (i) => {
    const newItems = form.items.filter((_, idx) => idx !== i);
    setForm({
      ...form,
      items: newItems.length
        ? newItems
        : [{ productName: "", quantity: 1, unitPrice: 0 }],
    });
  };
  const updateItem = (i, field, value) => {
    const newItems = form.items.map((item, idx) =>
      idx === i ? { ...item, [field]: value } : item,
    );
    setForm({ ...form, items: newItems });
  };

  const createOrder = async (e) => {
    e.preventDefault();
    try {
      await api.post("/orders", form);
      showSuccess("Order created");
      setModalOpen(false);
      setForm({
        customerId: "",
        channel: "WALK_IN",
        deliveryDeadline: "",
        items: [{ productName: "", quantity: 1, unitPrice: 0 }],
      });
      fetchOrders();
    } catch (err) {
      showError(err.response?.data?.message || "Error");
    }
  };

  const updateStatus = async (id, newStatus) => {
    await api.put(`/orders/${id}/status`, { status: newStatus });
    showSuccess(`Order #${id} updated to ${newStatus}`);
    fetchOrders();
  };

  const deleteOrder = async (id) => {
    const result = await showConfirm("Delete this order?");
    if (result.isConfirmed) {
      await api.delete(`/orders/${id}`);
      showSuccess("Order deleted");
      fetchOrders();
    }
  };

  const getCustomerName = (id) =>
    customers.find((c) => c.id == id)?.name || "Unknown";

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Orders</h1>
        <button
          onClick={() => setModalOpen(true)}
          className="flex items-center gap-1 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700"
        >
          <FiPlus /> New Order
        </button>
      </div>

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-xl w-full max-w-lg shadow-lg relative">
            <button
              onClick={() => setModalOpen(false)}
              className="absolute top-2 right-2 text-gray-500 hover:text-black"
            >
              <FiX size={20} />
            </button>
            <h2 className="text-xl font-bold mb-4">New Order</h2>
            <form onSubmit={createOrder} className="space-y-3">
              <select
                value={form.customerId}
                onChange={(e) =>
                  setForm({ ...form, customerId: e.target.value })
                }
                className="w-full border p-2 rounded"
                required
              >
                <option value="">Select Customer</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              <select
                value={form.channel}
                onChange={(e) => setForm({ ...form, channel: e.target.value })}
                className="w-full border p-2 rounded"
              >
                <option>WALK_IN</option>
                <option>PHONE</option>
                <option>EMAIL</option>
              </select>
              <input
                type="date"
                value={form.deliveryDeadline}
                onChange={(e) =>
                  setForm({ ...form, deliveryDeadline: e.target.value })
                }
                className="w-full border p-2 rounded"
                required
              />
              <div className="space-y-2">
                {form.items.map((item, i) => (
                  <div key={i} className="flex gap-2 items-center">
                    <input
                      type="text"
                      placeholder="Product"
                      value={item.productName}
                      onChange={(e) =>
                        updateItem(i, "productName", e.target.value)
                      }
                      className="border p-2 rounded flex-1"
                      required
                    />
                    <input
                      type="number"
                      value={item.quantity}
                      onChange={(e) =>
                        updateItem(i, "quantity", +e.target.value)
                      }
                      className="border p-2 rounded w-16"
                      min="1"
                    />
                    <input
                      type="number"
                      value={item.unitPrice}
                      onChange={(e) =>
                        updateItem(i, "unitPrice", +e.target.value)
                      }
                      className="border p-2 rounded w-20"
                      min="0.01"
                      step="0.01"
                    />
                    <button
                      type="button"
                      onClick={() => removeItem(i)}
                      className="text-red-500"
                    >
                      <FiX />
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={addItem}
                  className="text-indigo-600 text-sm flex items-center gap-1"
                >
                  <FiPlus /> Add item
                </button>
              </div>
              <button
                type="submit"
                className="w-full bg-indigo-600 text-white py-2 rounded-lg"
              >
                Create Order
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 text-gray-600">
            <tr>
              <th className="p-3 text-left">ID</th>
              <th className="p-3 text-left">Customer</th>
              <th className="p-3 text-left">Items</th>
              <th className="p-3 text-left">Status</th>
              <th className="p-3 text-left">Channel</th>
              <th className="p-3 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((o) => (
              <tr key={o.id} className="border-b hover:bg-gray-50">
                <td className="p-3">{o.id}</td>
                <td className="p-3">{getCustomerName(o.customerId)}</td>
                <td className="p-3 text-sm">
                  {o.items.map((i) => (
                    <div key={i.id}>
                      {i.productName} x{i.quantity}
                    </div>
                  ))}
                </td>
                <td className="p-3">
                  <span
                    className={`px-2 py-1 rounded-full text-xs font-semibold ${
                      o.status === "DELIVERED"
                        ? "bg-green-100 text-green-800"
                        : o.status === "BAKING"
                          ? "bg-pink-100 text-pink-800"
                          : o.status === "IN_PROGRESS"
                            ? "bg-blue-100 text-blue-800"
                            : "bg-yellow-100 text-yellow-800"
                    }`}
                  >
                    {o.status}
                  </span>
                </td>
                <td className="p-3">{o.channel}</td>
                <td className="p-3">
                  <select
                    value={o.status}
                    onChange={(e) => updateStatus(o.id, e.target.value)}
                    className="border p-1 rounded text-sm mr-2"
                  >
                    <option>PENDING</option>
                    <option>IN_PROGRESS</option>
                    <option>BAKING</option>
                    <option>DELIVERED</option>
                  </select>
                  <button
                    onClick={() => deleteOrder(o.id)}
                    className="text-red-600 hover:text-red-800"
                  >
                    <FiTrash2 />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
