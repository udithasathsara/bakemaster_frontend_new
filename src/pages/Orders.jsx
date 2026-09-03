// src/pages/Orders.jsx
import { useEffect, useState, useMemo } from "react";
import api from "../services/api";
import {
  FiPlus,
  FiX,
  FiSearch,
  FiCheckCircle,
  FiXCircle,
  FiEye,
  FiRefreshCw,
  FiAlertCircle,
} from "react-icons/fi";
import { showSuccess, showError, showConfirm } from "../services/swal";

const ORDER_STATUSES = [
  "ALL",
  "RECEIVED",
  "CONFIRMED",
  "IN_PROGRESS",
  "COMPLETED",
  "DELIVERED",
  "CANCELLED",
];

export default function Orders() {
  const [orders, setOrders] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  const [modalOpen, setModalOpen] = useState(false);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [form, setForm] = useState({
    customerId: "",
    channel: "WALK_IN",
    deliveryAddress: "",
    deliveryDeadline: "",
    paymentStatus: "PENDING",
    notes: "",
    items: [
      {
        productId: "",
        productName: "",
        quantity: 1,
        unitPrice: 0,
        specialInstructions: "",
      },
    ],
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [ordersRes, custRes, prodRes] = await Promise.all([
        api.get("/orders"),
        api.get("/customers"),
        api.get("/products"),
      ]);
      setOrders(ordersRes.data);
      setCustomers(custRes.data);
      setProducts(prodRes.data);
    } catch (err) {
      showError("Failed to fetch orders data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const openAddModal = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const defaultDate = tomorrow.toISOString().split("T")[0];

    const initialProduct = products.length > 0 ? products[0] : null;

    setForm({
      customerId: customers.length > 0 ? customers[0].id : "",
      channel: "WALK_IN",
      deliveryAddress: "",
      deliveryDeadline: defaultDate,
      paymentStatus: "PENDING",
      notes: "",
      items: initialProduct
        ? [
            {
              productId: initialProduct.id,
              productName: initialProduct.name,
              quantity: 1,
              unitPrice: initialProduct.sellingPrice,
              specialInstructions: "",
            },
          ]
        : [
            {
              productId: "",
              productName: "",
              quantity: 1,
              unitPrice: 0,
              specialInstructions: "",
            },
          ],
    });
    setModalOpen(true);
  };

  const addItem = () => {
    const firstProd = products.length > 0 ? products[0] : null;
    setForm((prev) => ({
      ...prev,
      items: [
        ...prev.items,
        firstProd
          ? {
              productId: firstProd.id,
              productName: firstProd.name,
              quantity: 1,
              unitPrice: firstProd.sellingPrice,
              specialInstructions: "",
            }
          : {
              productId: "",
              productName: "",
              quantity: 1,
              unitPrice: 0,
              specialInstructions: "",
            },
      ],
    }));
  };

  const removeItem = (i) => {
    setForm((prev) => ({
      ...prev,
      items: prev.items.filter((_, idx) => idx !== i),
    }));
  };

  const handleProductSelect = (index, productId) => {
    const updated = [...form.items];
    if (productId === "CUSTOM") {
      updated[index] = {
        productId: "",
        productName: "",
        quantity: updated[index].quantity || 1,
        unitPrice: 0,
        specialInstructions: updated[index].specialInstructions || "",
      };
    } else {
      const prod = products.find((p) => p.id === Number(productId));
      if (prod) {
        updated[index] = {
          productId: prod.id,
          productName: prod.name,
          quantity: updated[index].quantity || 1,
          unitPrice: prod.sellingPrice,
          specialInstructions: updated[index].specialInstructions || "",
        };
      }
    }
    setForm({ ...form, items: updated });
  };

  const updateItemField = (index, field, value) => {
    const updated = [...form.items];
    updated[index][field] = value;
    setForm({ ...form, items: updated });
  };

  const calculateFormTotal = () => {
    return form.items.reduce((acc, item) => {
      const qty = Number(item.quantity) || 0;
      const price = Number(item.unitPrice) || 0;
      return acc + qty * price;
    }, 0);
  };

  const createOrder = async (e) => {
    e.preventDefault();
    if (!form.customerId) {
      showError("Please select a customer");
      return;
    }
    if (form.items.length === 0) {
      showError("An order must have at least one item");
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        customerId: Number(form.customerId),
        channel: form.channel,
        deliveryAddress: form.deliveryAddress,
        deliveryDeadline: form.deliveryDeadline,
        paymentStatus: form.paymentStatus,
        notes: form.notes,
        items: form.items.map((i) => ({
          productId: i.productId ? Number(i.productId) : null,
          productName: i.productName,
          quantity: Number(i.quantity),
          unitPrice: Number(i.unitPrice),
          specialInstructions: i.specialInstructions,
        })),
      };

      await api.post("/orders", payload);
      showSuccess("Order created successfully!");
      setModalOpen(false);
      fetchData();
    } catch (err) {
      showError(err.response?.data?.message || "Failed to create order");
    } finally {
      setSubmitting(false);
    }
  };

  const confirmOrder = async (id) => {
    const result = await showConfirm(
      `Confirm Order #${id}? This will verify ingredient stock, deduct inventory, and schedule production tasks.`,
    );
    if (result.isConfirmed) {
      try {
        await api.post(`/orders/${id}/confirm`);
        showSuccess(`Order #${id} confirmed and scheduled for production!`);
        fetchData();
      } catch (err) {
        showError(
          err.response?.data?.message ||
            "Failed to confirm order. Check raw material stock.",
        );
      }
    }
  };

  const cancelOrder = async (id) => {
    const result = await showConfirm(
      `Cancel Order #${id}? Any deducted inventory ingredients will be restored.`,
    );
    if (result.isConfirmed) {
      try {
        await api.post(`/orders/${id}/cancel`);
        showSuccess(`Order #${id} cancelled.`);
        fetchData();
      } catch (err) {
        showError(err.response?.data?.message || "Failed to cancel order.");
      }
    }
  };

  const updateStatus = async (id, nextStatus) => {
    try {
      await api.put(`/orders/${id}/status`, { status: nextStatus });
      showSuccess(`Order #${id} status updated to ${nextStatus}`);
      fetchData();
    } catch (err) {
      showError(err.response?.data?.message || "Invalid status transition.");
    }
  };

  const getCustomer = (id) => {
    return customers.find((c) => c.id === Number(id));
  };

  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      const custName = getCustomer(o.customerId)?.name || "";
      const matchesSearch =
        String(o.id).includes(search) ||
        custName.toLowerCase().includes(search.toLowerCase()) ||
        (o.channel && o.channel.toLowerCase().includes(search.toLowerCase()));

      if (!matchesSearch) return false;
      if (statusFilter !== "ALL" && o.status !== statusFilter) return false;
      return true;
    });
  }, [orders, customers, search, statusFilter]);

  const getStatusBadge = (status) => {
    switch (status) {
      case "RECEIVED":
        return "bg-amber-100 text-amber-800 border-amber-200";
      case "CONFIRMED":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "IN_PROGRESS":
        return "bg-purple-100 text-purple-800 border-purple-200";
      case "COMPLETED":
        return "bg-teal-100 text-teal-800 border-teal-200";
      case "DELIVERED":
        return "bg-emerald-100 text-emerald-800 border-emerald-200";
      case "CANCELLED":
        return "bg-rose-100 text-rose-800 border-rose-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Order Management</h1>
          <p className="text-sm text-gray-500">
            Multi-channel bakery orders, confirmation, ingredient reservations,
            and dispatch
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchData}
            className="flex items-center gap-2 bg-white border border-gray-200 px-3 py-2 rounded-lg text-sm text-gray-700 hover:bg-gray-50 shadow-sm"
          >
            <FiRefreshCw className={loading ? "animate-spin" : ""} /> Refresh
          </button>
          <button
            onClick={openAddModal}
            className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 text-sm font-medium shadow-sm transition"
          >
            <FiPlus /> New Order
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap gap-1.5">
          {ORDER_STATUSES.map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                statusFilter === status
                  ? "bg-indigo-600 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {status}
            </button>
          ))}
        </div>
        <div className="relative min-w-[240px]">
          <FiSearch className="absolute left-3 top-3 text-gray-400" />
          <input
            type="text"
            placeholder="Search by Order #, Customer, Channel..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
          />
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-gray-50 text-xs font-semibold text-gray-500 uppercase tracking-wider border-b border-gray-100">
              <tr>
                <th className="p-4">Order ID</th>
                <th className="p-4">Customer</th>
                <th className="p-4">Items Summary</th>
                <th className="p-4">Channel</th>
                <th className="p-4">Total Amount</th>
                <th className="p-4">Deadline</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-sm">
              {loading ? (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-gray-400">
                    Loading bakery orders...
                  </td>
                </tr>
              ) : filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-gray-400">
                    No orders found matching the filter criteria.
                  </td>
                </tr>
              ) : (
                filteredOrders.map((order) => {
                  const customer = getCustomer(order.customerId);
                  const isReceived =
                    order.status === "RECEIVED" || order.status === "PENDING";
                  const isConfirmed = order.status === "CONFIRMED";
                  const isInProgress = order.status === "IN_PROGRESS";
                  const isCompleted = order.status === "COMPLETED";
                  const isCancelled = order.status === "CANCELLED";

                  return (
                    <tr
                      key={order.id}
                      className="hover:bg-gray-50/70 transition"
                    >
                      <td className="p-4 font-bold text-gray-800">
                        #{order.id}
                      </td>
                      <td className="p-4">
                        <div className="font-semibold text-gray-800">
                          {customer?.name || `Customer #${order.customerId}`}
                        </div>
                        <div className="text-xs text-gray-400">
                          {customer?.phone || ""}
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="space-y-0.5 text-xs text-gray-600 max-w-[220px]">
                          {order.items?.slice(0, 2).map((item) => (
                            <div key={item.id} className="truncate">
                              • {item.productName}{" "}
                              <span className="font-semibold">
                                x{item.quantity}
                              </span>
                            </div>
                          ))}
                          {order.items?.length > 2 && (
                            <span className="text-indigo-600 font-medium text-xs">
                              +{order.items.length - 2} more item(s)
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="p-4">
                        <span className="text-xs font-semibold px-2 py-1 rounded bg-gray-100 text-gray-700">
                          {order.channel}
                        </span>
                      </td>
                      <td className="p-4">
                        <div className="font-bold text-gray-800">
                          Rs.{Number(order.totalAmount || 0).toFixed(2)}
                        </div>
                        <span
                          className={`text-2xs font-semibold uppercase px-1.5 py-0.5 rounded ${
                            order.paymentStatus === "PAID"
                              ? "bg-emerald-100 text-emerald-800"
                              : order.paymentStatus === "PARTIAL_DEPOSIT"
                                ? "bg-amber-100 text-amber-800"
                                : "bg-gray-100 text-gray-600"
                          }`}
                        >
                          {order.paymentStatus}
                        </span>
                      </td>
                      <td className="p-4 text-xs text-gray-600">
                        {order.deliveryDeadline || "N/A"}
                      </td>
                      <td className="p-4">
                        <span
                          className={`inline-block px-2.5 py-1 rounded-full text-xs font-bold border ${getStatusBadge(
                            order.status,
                          )}`}
                        >
                          {order.status}
                        </span>
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* View details */}
                          <button
                            onClick={() => {
                              setSelectedOrder(order);
                              setDetailModalOpen(true);
                            }}
                            className="p-1.5 text-gray-600 hover:bg-gray-100 rounded-lg"
                            title="View Full Details"
                          >
                            <FiEye size={16} />
                          </button>

                          {/* Confirm action for RECEIVED */}
                          {isReceived && (
                            <button
                              onClick={() => confirmOrder(order.id)}
                              className="flex items-center gap-1 px-2 py-1 bg-emerald-600 text-white rounded text-xs font-semibold hover:bg-emerald-700 transition"
                              title="Confirm Order (Deduct stock & Schedule tasks)"
                            >
                              <FiCheckCircle size={13} /> Confirm
                            </button>
                          )}

                          {/* Progress actions */}
                          {isConfirmed && (
                            <button
                              onClick={() =>
                                updateStatus(order.id, "IN_PROGRESS")
                              }
                              className="px-2 py-1 bg-indigo-600 text-white rounded text-xs font-semibold hover:bg-indigo-700"
                            >
                              Start Bake
                            </button>
                          )}
                          {isInProgress && (
                            <button
                              onClick={() =>
                                updateStatus(order.id, "COMPLETED")
                              }
                              className="px-2 py-1 bg-teal-600 text-white rounded text-xs font-semibold hover:bg-teal-700"
                            >
                              Complete
                            </button>
                          )}
                          {isCompleted && (
                            <button
                              onClick={() =>
                                updateStatus(order.id, "DELIVERED")
                              }
                              className="px-2 py-1 bg-emerald-600 text-white rounded text-xs font-semibold hover:bg-emerald-700"
                            >
                              Deliver
                            </button>
                          )}

                          {/* Cancel action */}
                          {!isCancelled && order.status !== "DELIVERED" && (
                            <button
                              onClick={() => cancelOrder(order.id)}
                              className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg"
                              title="Cancel Order"
                            >
                              <FiXCircle size={16} />
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

      {/* Order Details Modal */}
      {detailModalOpen && selectedOrder && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <div>
                <h2 className="text-lg font-bold text-gray-800">
                  Order #{selectedOrder.id} Details
                </h2>
                <span
                  className={`inline-block mt-1 px-2.5 py-0.5 rounded-full text-xs font-bold border ${getStatusBadge(
                    selectedOrder.status,
                  )}`}
                >
                  {selectedOrder.status}
                </span>
              </div>
              <button
                onClick={() => setDetailModalOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <FiX size={20} />
              </button>
            </div>

            <div className="p-6 space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-3 text-xs bg-gray-50 p-3 rounded-xl">
                <div>
                  <span className="text-gray-400">Customer:</span>
                  <p className="font-semibold text-gray-800">
                    {getCustomer(selectedOrder.customerId)?.name || "Unknown"}
                  </p>
                </div>
                <div>
                  <span className="text-gray-400">Channel:</span>
                  <p className="font-semibold text-gray-800">
                    {selectedOrder.channel}
                  </p>
                </div>
                <div>
                  <span className="text-gray-400">Delivery Deadline:</span>
                  <p className="font-semibold text-gray-800">
                    {selectedOrder.deliveryDeadline}
                  </p>
                </div>
                <div>
                  <span className="text-gray-400">Payment Status:</span>
                  <p className="font-semibold text-gray-800">
                    {selectedOrder.paymentStatus}
                  </p>
                </div>
                {selectedOrder.deliveryAddress && (
                  <div className="col-span-2">
                    <span className="text-gray-400">Delivery Address:</span>
                    <p className="font-semibold text-gray-800">
                      {selectedOrder.deliveryAddress}
                    </p>
                  </div>
                )}
                {selectedOrder.notes && (
                  <div className="col-span-2">
                    <span className="text-gray-400">Special Notes:</span>
                    <p className="font-semibold text-gray-800">
                      {selectedOrder.notes}
                    </p>
                  </div>
                )}
              </div>

              {/* Items breakdown */}
              <div>
                <h4 className="font-bold text-xs text-gray-500 uppercase tracking-wider mb-2">
                  Order Items
                </h4>
                <div className="border border-gray-100 rounded-xl overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-gray-50 text-gray-500">
                      <tr>
                        <th className="p-2.5">Item</th>
                        <th className="p-2.5 text-center">Qty</th>
                        <th className="p-2.5 text-right">Price</th>
                        <th className="p-2.5 text-right">Subtotal</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {selectedOrder.items?.map((item) => (
                        <tr key={item.id}>
                          <td className="p-2.5">
                            <span className="font-medium text-gray-800">
                              {item.productName}
                            </span>
                            {item.specialInstructions && (
                              <p className="text-2xs text-gray-400 italic">
                                Note: {item.specialInstructions}
                              </p>
                            )}
                          </td>
                          <td className="p-2.5 text-center">{item.quantity}</td>
                          <td className="p-2.5 text-right">
                            Rs.{Number(item.unitPrice).toFixed(2)}
                          </td>
                          <td className="p-2.5 text-right font-semibold">
                            Rs.
                            {Number(
                              item.subtotal || item.quantity * item.unitPrice,
                            ).toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-gray-50 font-bold border-t border-gray-100">
                      <tr>
                        <td colSpan={3} className="p-2.5 text-right">
                          Total:
                        </td>
                        <td className="p-2.5 text-right text-indigo-700">
                          Rs.{Number(selectedOrder.totalAmount || 0).toFixed(2)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              <div className="text-right pt-2">
                <button
                  onClick={() => setDetailModalOpen(false)}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-xs font-semibold hover:bg-gray-200"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* New Order Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl shadow-xl overflow-hidden max-h-[90vh] flex flex-col">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <h2 className="text-lg font-bold text-gray-800">
                Create New Customer Order
              </h2>
              <button
                onClick={() => setModalOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <FiX size={20} />
              </button>
            </div>

            <form
              onSubmit={createOrder}
              className="p-6 overflow-y-auto space-y-4 flex-1"
            >
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Select Customer *
                  </label>
                  <select
                    required
                    className="w-full border px-3 py-2 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                    value={form.customerId}
                    onChange={(e) =>
                      setForm({ ...form, customerId: e.target.value })
                    }
                  >
                    <option value="">-- Choose Customer --</option>
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.phone || c.email})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Order Channel *
                  </label>
                  <select
                    className="w-full border px-3 py-2 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                    value={form.channel}
                    onChange={(e) =>
                      setForm({ ...form, channel: e.target.value })
                    }
                  >
                    <option value="WALK_IN">WALK_IN (In-Store)</option>
                    <option value="PHONE">PHONE Order</option>
                    <option value="EMAIL">EMAIL Order</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Delivery Deadline *
                  </label>
                  <input
                    type="date"
                    required
                    className="w-full border px-3 py-2 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                    value={form.deliveryDeadline}
                    onChange={(e) =>
                      setForm({ ...form, deliveryDeadline: e.target.value })
                    }
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Payment Status
                  </label>
                  <select
                    className="w-full border px-3 py-2 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                    value={form.paymentStatus}
                    onChange={(e) =>
                      setForm({ ...form, paymentStatus: e.target.value })
                    }
                  >
                    <option value="PENDING">PENDING</option>
                    <option value="PARTIAL_DEPOSIT">PARTIAL DEPOSIT</option>
                    <option value="PAID">PAID</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Delivery Address / Pickup Note
                </label>
                <input
                  type="text"
                  placeholder="e.g. 12 Baker Street, Colombo or Counter Pickup"
                  className="w-full border px-3 py-2 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                  value={form.deliveryAddress}
                  onChange={(e) =>
                    setForm({ ...form, deliveryAddress: e.target.value })
                  }
                />
              </div>

              {/* Order Items */}
              <div className="border-t border-gray-100 pt-4">
                <div className="flex justify-between items-center mb-2">
                  <div>
                    <h3 className="text-sm font-bold text-gray-800">
                      Order Items
                    </h3>
                    <p className="text-xs text-gray-500">
                      Pick from existing bakery menu or enter custom item
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={addItem}
                    className="flex items-center gap-1 text-xs font-semibold text-indigo-600 bg-indigo-50 px-2.5 py-1.5 rounded-lg hover:bg-indigo-100"
                  >
                    <FiPlus /> Add Item
                  </button>
                </div>

                <div className="space-y-3 max-h-52 overflow-y-auto pr-1">
                  {form.items.map((item, index) => (
                    <div
                      key={index}
                      className="p-3 bg-gray-50 rounded-xl space-y-2 border border-gray-100"
                    >
                      <div className="flex items-center gap-2">
                        <select
                          className="flex-1 border px-2.5 py-1.5 rounded text-xs bg-white"
                          value={item.productId || "CUSTOM"}
                          onChange={(e) =>
                            handleProductSelect(index, e.target.value)
                          }
                        >
                          <option value="CUSTOM">
                            -- Custom Item / Custom Name --
                          </option>
                          {products.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.name} (Rs.{Number(p.sellingPrice).toFixed(2)})
                            </option>
                          ))}
                        </select>

                        {(!item.productId || item.productId === "") && (
                          <input
                            type="text"
                            placeholder="Item Name *"
                            required
                            className="flex-1 border px-2.5 py-1.5 rounded text-xs bg-white"
                            value={item.productName}
                            onChange={(e) =>
                              updateItemField(
                                index,
                                "productName",
                                e.target.value,
                              )
                            }
                          />
                        )}

                        <div className="flex items-center gap-1">
                          <span className="text-2xs text-gray-500">Qty:</span>
                          <input
                            type="number"
                            min="1"
                            required
                            className="w-16 border px-2 py-1.5 rounded text-xs bg-white text-center"
                            value={item.quantity}
                            onChange={(e) =>
                              updateItemField(index, "quantity", e.target.value)
                            }
                          />
                        </div>

                        <div className="flex items-center gap-1">
                          <span className="text-2xs text-gray-500">Rs.</span>
                          <input
                            type="number"
                            step="0.01"
                            min="0.01"
                            required
                            placeholder="Price"
                            className="w-20 border px-2 py-1.5 rounded text-xs bg-white text-right"
                            value={item.unitPrice}
                            onChange={(e) =>
                              updateItemField(
                                index,
                                "unitPrice",
                                e.target.value,
                              )
                            }
                          />
                        </div>

                        {form.items.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeItem(index)}
                            className="p-1 text-rose-500 hover:text-rose-700"
                          >
                            <FiX size={16} />
                          </button>
                        )}
                      </div>

                      <input
                        type="text"
                        placeholder="Special instructions (e.g. Birthday inscription, gluten-free, etc.)"
                        className="w-full border px-2.5 py-1 rounded text-xs bg-white"
                        value={item.specialInstructions}
                        onChange={(e) =>
                          updateItemField(
                            index,
                            "specialInstructions",
                            e.target.value,
                          )
                        }
                      />
                    </div>
                  ))}
                </div>

                <div className="mt-3 flex justify-between items-center text-sm font-bold bg-indigo-50/70 p-3 rounded-xl text-indigo-950">
                  <span>Estimated Total Amount:</span>
                  <span className="text-lg text-indigo-700">
                    Rs.{calculateFormTotal().toFixed(2)}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Order Notes
                </label>
                <textarea
                  rows={2}
                  placeholder="Additional order notes or delivery preferences..."
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
                  className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50"
                >
                  {submitting ? "Creating Order..." : "Place Order"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
