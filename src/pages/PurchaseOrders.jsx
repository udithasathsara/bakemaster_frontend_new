// src/pages/PurchaseOrders.jsx
import { useEffect, useState, useMemo } from "react";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";
import {
  FiSend,
  FiCheckCircle,
  FiShoppingCart,
  FiChevronDown,
  FiChevronUp,
  FiRefreshCw,
  FiPackage,
  FiTruck,
  FiPlus,
  FiX,
  FiSearch,
  FiClock,
  FiDollarSign,
  FiFileText,
  FiTrash2,
} from "react-icons/fi";
import { showSuccess, showError, showConfirm } from "../services/swal";

export default function PurchaseOrders() {
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [ingredients, setIngredients] = useState([]);
  const [expandedId, setExpandedId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  // Create PO Modal
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [createForm, setCreateForm] = useState({
    supplierId: "",
    orderDate: new Date().toISOString().split("T")[0],
    items: [{ ingredientId: "", ingredientName: "", quantity: 10, unitPrice: 0 }],
  });

  // Invoice / Slip Modal
  const [invoicePo, setInvoicePo] = useState(null);

  const { isManager } = useAuth();
  const canManage = isManager;

  const fetchData = async () => {
    setLoading(true);
    try {
      const [poRes, supRes, ingRes] = await Promise.all([
        api.get("/purchase-orders"),
        api.get("/suppliers"),
        api.get("/inventory"),
      ]);
      setPurchaseOrders(poRes.data);
      setSuppliers(supRes.data);
      setIngredients(ingRes.data);
    } catch (err) {
      showError("Failed to fetch purchase orders or suppliers");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const getSupplier = (id) => suppliers.find((s) => s.id === id);

  const toggleExpand = (id) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const openCreateModal = () => {
    const firstSup = suppliers[0];
    const firstIng = ingredients[0];
    setCreateForm({
      supplierId: firstSup ? firstSup.id : "",
      orderDate: new Date().toISOString().split("T")[0],
      items: [
        {
          ingredientId: firstIng ? firstIng.id : "",
          ingredientName: firstIng ? firstIng.name : "",
          quantity: 10,
          unitPrice: firstIng ? firstIng.costPerUnit || 0 : 0,
        },
      ],
    });
    setCreateModalOpen(true);
  };

  const addLineItem = () => {
    const firstIng = ingredients[0];
    setCreateForm((prev) => ({
      ...prev,
      items: [
        ...prev.items,
        {
          ingredientId: firstIng ? firstIng.id : "",
          ingredientName: firstIng ? firstIng.name : "",
          quantity: 10,
          unitPrice: firstIng ? firstIng.costPerUnit || 0 : 0,
        },
      ],
    }));
  };

  const removeLineItem = (idx) => {
    if (createForm.items.length <= 1) return;
    setCreateForm((prev) => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== idx),
    }));
  };

  const handleItemIngredientChange = (idx, ingId) => {
    const ing = ingredients.find((i) => i.id === Number(ingId));
    const newItems = [...createForm.items];
    if (ing) {
      newItems[idx] = {
        ...newItems[idx],
        ingredientId: ing.id,
        ingredientName: ing.name,
        unitPrice: ing.costPerUnit || 0,
      };
    } else {
      newItems[idx] = {
        ...newItems[idx],
        ingredientId: "",
        ingredientName: "",
        unitPrice: 0,
      };
    }
    setCreateForm({ ...createForm, items: newItems });
  };

  const handleItemFieldChange = (idx, field, val) => {
    const newItems = [...createForm.items];
    newItems[idx][field] = val;
    setCreateForm({ ...createForm, items: newItems });
  };

  const calculateCreateTotal = () => {
    return createForm.items.reduce((acc, item) => {
      const q = Number(item.quantity) || 0;
      const p = Number(item.unitPrice) || 0;
      return acc + q * p;
    }, 0);
  };

  const handleManualCreatePO = async (e) => {
    e.preventDefault();
    if (!createForm.supplierId) {
      showError("Please select a supplier");
      return;
    }
    if (createForm.items.length === 0) {
      showError("Please add at least one line item");
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        supplierId: Number(createForm.supplierId),
        orderDate: createForm.orderDate,
        items: createForm.items.map((i) => ({
          ingredientId: i.ingredientId ? Number(i.ingredientId) : null,
          ingredientName: i.ingredientName,
          quantity: Number(i.quantity),
          unitPrice: Number(i.unitPrice),
        })),
      };

      await api.post("/purchase-orders", payload);
      showSuccess("Purchase Order created successfully!");
      setCreateModalOpen(false);
      fetchData();
    } catch (err) {
      showError(err.response?.data?.message || "Failed to create purchase order");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSendPO = async (id) => {
    const result = await showConfirm(
      `Send Purchase Order #${id} to supplier? Status will update to SENT.`
    );
    if (result.isConfirmed) {
      try {
        await api.post(`/purchase-orders/${id}/send`);
        showSuccess(`Purchase Order #${id} sent to supplier!`);
        fetchData();
      } catch (err) {
        showError(err.response?.data?.message || "Failed to send purchase order");
      }
    }
  };

  const handleReceivePO = async (id) => {
    const result = await showConfirm(
      `Receive Purchase Order #${id}? All items will be added to inventory stock automatically.`
    );
    if (result.isConfirmed) {
      try {
        await api.post(`/purchase-orders/${id}/receive`);
        showSuccess(`PO #${id} received! Raw ingredients have been added to inventory stock.`);
        fetchData();
      } catch (err) {
        showError(err.response?.data?.message || "Failed to receive purchase order");
      }
    }
  };

  const handleCancelPO = async (id) => {
    const result = await showConfirm(`Cancel Purchase Order #${id}?`);
    if (result.isConfirmed) {
      try {
        await api.post(`/purchase-orders/${id}/cancel`);
        showSuccess(`Purchase Order #${id} cancelled`);
        fetchData();
      } catch (err) {
        showError(err.response?.data?.message || "Failed to cancel PO");
      }
    }
  };

  const generatePOFromLowStock = async () => {
    try {
      const res = await api.post("/inventory/generate-po");
      showSuccess(`Purchase Order #${res.data.id} auto-created for low-stock ingredients!`);
      fetchData();
    } catch (err) {
      showError(err.response?.data?.message || "No low-stock ingredients found or supplier missing.");
    }
  };

  const filteredPOs = useMemo(() => {
    return purchaseOrders.filter((po) => {
      const supplierName = getSupplier(po.supplierId)?.name || "";
      const matchSearch =
        String(po.id).includes(search) ||
        supplierName.toLowerCase().includes(search.toLowerCase());

      if (!matchSearch) return false;
      if (statusFilter !== "ALL" && po.status !== statusFilter) return false;
      return true;
    });
  }, [purchaseOrders, suppliers, search, statusFilter]);

  const totalPOs = purchaseOrders.length;
  const pendingPOs = purchaseOrders.filter((p) => p.status === "PENDING").length;
  const sentPOs = purchaseOrders.filter((p) => p.status === "SENT").length;
  const receivedPOs = purchaseOrders.filter((p) => p.status === "RECEIVED").length;
  const totalSpend = purchaseOrders
    .filter((p) => p.status === "RECEIVED")
    .reduce((acc, p) => acc + (p.totalAmount || 0), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Purchase Orders & Procurement</h1>
          <p className="text-sm text-gray-500">
            Source raw bakery ingredients, send vendor orders, and auto-increment stock upon delivery
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={fetchData}
            className="flex items-center gap-2 bg-white border border-gray-200 px-3 py-2 rounded-lg text-sm text-gray-700 hover:bg-gray-50 shadow-xs"
          >
            <FiRefreshCw className={loading ? "animate-spin" : ""} /> Refresh
          </button>
          {canManage && (
            <button
              onClick={generatePOFromLowStock}
              className="flex items-center gap-2 bg-emerald-600 text-white px-3.5 py-2 rounded-lg hover:bg-emerald-700 text-sm font-medium shadow-xs transition"
            >
              <FiShoppingCart /> Auto-Generate from Low Stock
            </button>
          )}
          {canManage && (
            <button
              onClick={openCreateModal}
              className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 text-sm font-medium shadow-sm transition"
            >
              <FiPlus /> New Purchase Order
            </button>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl shadow-xs border border-gray-100 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Total Orders</p>
            <h3 className="text-2xl font-bold text-gray-800 mt-1">{totalPOs}</h3>
            <p className="text-2xs text-gray-400 mt-0.5">All procurement POs</p>
          </div>
          <div className="p-3 rounded-xl bg-indigo-50 text-indigo-600">
            <FiPackage size={22} />
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl shadow-xs border border-gray-100 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Awaiting Delivery</p>
            <h3 className="text-2xl font-bold text-blue-600 mt-1">{sentPOs}</h3>
            <p className="text-2xs text-gray-400 mt-0.5">Sent to vendor / in-transit</p>
          </div>
          <div className="p-3 rounded-xl bg-blue-50 text-blue-600">
            <FiTruck size={22} />
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl shadow-xs border border-gray-100 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Draft / Pending</p>
            <h3 className="text-2xl font-bold text-amber-600 mt-1">{pendingPOs}</h3>
            <p className="text-2xs text-gray-400 mt-0.5">Ready to be sent</p>
          </div>
          <div className="p-3 rounded-xl bg-amber-50 text-amber-600">
            <FiClock size={22} />
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl shadow-xs border border-gray-100 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Total Received Spend</p>
            <h3 className="text-2xl font-bold text-emerald-600 mt-1">Rs.{totalSpend.toFixed(2)}</h3>
            <p className="text-2xs text-gray-400 mt-0.5">{receivedPOs} orders stocked in inventory</p>
          </div>
          <div className="p-3 rounded-xl bg-emerald-50 text-emerald-600">
            <FiDollarSign size={22} />
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl shadow-xs border border-gray-100 flex flex-wrap items-center justify-between gap-4">
        <div className="relative flex-1 min-w-[240px]">
          <FiSearch className="absolute left-3 top-3 text-gray-400" />
          <input
            type="text"
            placeholder="Search PO # or supplier name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
          />
        </div>

        <div className="flex bg-gray-100 p-1 rounded-lg text-xs font-medium">
          {["ALL", "PENDING", "SENT", "RECEIVED", "CANCELLED"].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-md transition ${
                statusFilter === st ? "bg-white text-indigo-600 shadow-xs font-bold" : "text-gray-600 hover:text-black"
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Purchase Orders Table */}
      <div className="bg-white rounded-xl shadow-xs border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead className="bg-gray-50 text-xs font-semibold text-gray-500 uppercase tracking-wider border-b border-gray-100">
              <tr>
                <th className="p-4">PO #</th>
                <th className="p-4">Supplier / Vendor</th>
                <th className="p-4">Order Date</th>
                <th className="p-4">Received Date</th>
                <th className="p-4">Amount</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-gray-400">
                    Loading purchase orders...
                  </td>
                </tr>
              ) : filteredPOs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-gray-400">
                    No purchase orders found matching current filter.
                  </td>
                </tr>
              ) : (
                filteredPOs.map((po) => {
                  const supplier = getSupplier(po.supplierId);
                  const isExpanded = expandedId === po.id;
                  const isPending = po.status === "PENDING";
                  const isSent = po.status === "SENT";
                  const isReceived = po.status === "RECEIVED";
                  const isCancelled = po.status === "CANCELLED";

                  return (
                    <tr key={po.id} className="hover:bg-gray-50/70 transition">
                      <td className="p-4 font-bold text-gray-800">#{po.id}</td>
                      <td className="p-4">
                        <div className="font-semibold text-gray-800">
                          {supplier?.name || `Supplier #${po.supplierId}`}
                        </div>
                        <div className="text-2xs text-gray-400 flex items-center gap-1">
                          <FiTruck size={12} /> Lead time: {supplier?.leadTimeDays || "?"} days
                        </div>
                      </td>
                      <td className="p-4 text-xs text-gray-600">{po.orderDate || "N/A"}</td>
                      <td className="p-4 text-xs text-gray-600">
                        {po.receivedDate || <span className="text-gray-400 italic">Pending delivery</span>}
                      </td>
                      <td className="p-4 font-bold text-gray-800">
                        Rs.{Number(po.totalAmount || 0).toFixed(2)}
                      </td>
                      <td className="p-4">
                        <span
                          className={`inline-block px-2.5 py-1 rounded-full text-xs font-bold border ${
                            isReceived
                              ? "bg-emerald-100 text-emerald-800 border-emerald-200"
                              : isSent
                              ? "bg-blue-100 text-blue-800 border-blue-200"
                              : isCancelled
                              ? "bg-rose-100 text-rose-800 border-rose-200"
                              : "bg-amber-100 text-amber-800 border-amber-200"
                          }`}
                        >
                          {po.status}
                        </span>
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => setInvoicePo(po)}
                            className="p-1.5 text-gray-500 hover:bg-gray-100 rounded-lg"
                            title="View PO Invoice"
                          >
                            <FiFileText size={15} />
                          </button>

                          {canManage && isPending && (
                            <button
                              onClick={() => handleSendPO(po.id)}
                              className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700 transition"
                              title="Send PO to Supplier"
                            >
                              <FiSend size={12} /> Send PO
                            </button>
                          )}

                          {canManage && isSent && (
                            <button
                              onClick={() => handleReceivePO(po.id)}
                              className="flex items-center gap-1 px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-semibold hover:bg-emerald-700 transition"
                              title="Receive stock into Inventory"
                            >
                              <FiCheckCircle size={12} /> Receive Stock
                            </button>
                          )}

                          {canManage && (isPending || isSent) && (
                            <button
                              onClick={() => handleCancelPO(po.id)}
                              className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg"
                              title="Cancel PO"
                            >
                              <FiX size={16} />
                            </button>
                          )}

                          <button
                            onClick={() => toggleExpand(po.id)}
                            className="p-1.5 text-gray-400 hover:text-gray-600 rounded"
                          >
                            {isExpanded ? <FiChevronUp size={16} /> : <FiChevronDown size={16} />}
                          </button>
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

      {/* Modal: Manual Create Purchase Order */}
      {createModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl shadow-xl overflow-hidden max-h-[90vh] flex flex-col">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <h2 className="text-lg font-bold text-gray-800">Create New Purchase Order</h2>
              <button onClick={() => setCreateModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <FiX size={20} />
              </button>
            </div>

            <form onSubmit={handleManualCreatePO} className="p-6 overflow-y-auto space-y-4 flex-1">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Select Supplier *</label>
                  <select
                    required
                    className="w-full border px-3 py-2 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                    value={createForm.supplierId}
                    onChange={(e) => setCreateForm({ ...createForm, supplierId: e.target.value })}
                  >
                    <option value="">-- Choose Supplier --</option>
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.contact || "No contact"} - Lead: {s.leadTimeDays}d)
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Order Date *</label>
                  <input
                    type="date"
                    required
                    className="w-full border px-3 py-2 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                    value={createForm.orderDate}
                    onChange={(e) => setCreateForm({ ...createForm, orderDate: e.target.value })}
                  />
                </div>
              </div>

              {/* Items Table */}
              <div className="border-t border-gray-100 pt-3">
                <div className="flex justify-between items-center mb-2">
                  <h3 className="text-sm font-bold text-gray-800">Ingredients to Order</h3>
                  <button
                    type="button"
                    onClick={addLineItem}
                    className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800 font-semibold"
                  >
                    <FiPlus /> Add Item
                  </button>
                </div>

                <div className="space-y-2">
                  {createForm.items.map((item, idx) => (
                    <div key={idx} className="flex gap-2 items-center bg-gray-50 p-2.5 rounded-xl border border-gray-100">
                      <div className="flex-1 min-w-[160px]">
                        <label className="block text-2xs text-gray-400 mb-0.5">Ingredient</label>
                        <select
                          className="w-full border text-xs p-1.5 rounded bg-white"
                          value={item.ingredientId}
                          onChange={(e) => handleItemIngredientChange(idx, e.target.value)}
                          required
                        >
                          <option value="">-- Select Material --</option>
                          {ingredients.map((ing) => (
                            <option key={ing.id} value={ing.id}>
                              {ing.name} ({ing.quantity} {ing.unit} in stock)
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="w-24">
                        <label className="block text-2xs text-gray-400 mb-0.5">Quantity</label>
                        <input
                          type="number"
                          step="any"
                          min="0.1"
                          required
                          className="w-full border text-xs p-1.5 rounded bg-white"
                          value={item.quantity}
                          onChange={(e) => handleItemFieldChange(idx, "quantity", e.target.value)}
                        />
                      </div>

                      <div className="w-28">
                        <label className="block text-2xs text-gray-400 mb-0.5">Unit Price (Rs.)</label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          required
                          className="w-full border text-xs p-1.5 rounded bg-white"
                          value={item.unitPrice}
                          onChange={(e) => handleItemFieldChange(idx, "unitPrice", e.target.value)}
                        />
                      </div>

                      <div className="w-24 text-right">
                        <span className="block text-2xs text-gray-400 mb-0.5">Subtotal</span>
                        <span className="font-bold text-xs text-gray-800">
                          Rs.{(Number(item.quantity || 0) * Number(item.unitPrice || 0)).toFixed(2)}
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => removeLineItem(idx)}
                        disabled={createForm.items.length <= 1}
                        className="p-1 text-gray-400 hover:text-rose-600 disabled:opacity-30 mt-3"
                      >
                        <FiTrash2 size={16} />
                      </button>
                    </div>
                  ))}
                </div>

                <div className="mt-4 p-3 bg-indigo-50/50 rounded-xl flex justify-between items-center border border-indigo-100">
                  <span className="text-sm font-semibold text-gray-700">Estimated Total Amount:</span>
                  <span className="text-lg font-bold text-indigo-700">
                    Rs.{calculateCreateTotal().toFixed(2)}
                  </span>
                </div>
              </div>

              <div className="pt-3 flex gap-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setCreateModalOpen(false)}
                  className="flex-1 px-4 py-2 border rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50 shadow-sm"
                >
                  {submitting ? "Creating PO..." : "Save Purchase Order"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: View PO Slip / Receipt */}
      {invoicePo && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex justify-between items-start bg-gray-50">
              <div>
                <h3 className="text-lg font-bold text-gray-900">Purchase Order #{invoicePo.id}</h3>
                <p className="text-xs text-gray-500">Official BakeMaster Procurement Slip</p>
              </div>
              <button onClick={() => setInvoicePo(null)} className="text-gray-400 hover:text-gray-600">
                <FiX size={20} />
              </button>
            </div>

            <div className="p-6 space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-3 bg-gray-50 p-3 rounded-xl text-xs">
                <div>
                  <span className="text-gray-400">Supplier:</span>
                  <p className="font-bold text-gray-800">{getSupplier(invoicePo.supplierId)?.name || "N/A"}</p>
                </div>
                <div>
                  <span className="text-gray-400">Status:</span>
                  <p className="font-bold text-indigo-700">{invoicePo.status}</p>
                </div>
                <div>
                  <span className="text-gray-400">Order Date:</span>
                  <p className="font-medium text-gray-700">{invoicePo.orderDate || "N/A"}</p>
                </div>
                <div>
                  <span className="text-gray-400">Received Date:</span>
                  <p className="font-medium text-gray-700">{invoicePo.receivedDate || "Pending"}</p>
                </div>
              </div>

              <div>
                <h4 className="font-bold text-xs text-gray-500 uppercase tracking-wider mb-2">Itemized Materials</h4>
                <div className="border border-gray-100 rounded-xl overflow-hidden">
                  <table className="w-full text-xs">
                    <thead className="bg-gray-50 text-gray-500">
                      <tr>
                        <th className="p-2.5 text-left">Item</th>
                        <th className="p-2.5 text-right">Qty</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {invoicePo.items?.map((it) => (
                        <tr key={it.id}>
                          <td className="p-2.5 font-medium text-gray-800">{it.ingredientName}</td>
                          <td className="p-2.5 text-right font-bold text-indigo-700">{it.quantity} units</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-gray-50 font-bold border-t border-gray-100">
                      <tr>
                        <td className="p-2.5">Total Amount:</td>
                        <td className="p-2.5 text-right text-indigo-700">Rs.{Number(invoicePo.totalAmount || 0).toFixed(2)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  onClick={() => window.print()}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-xs font-semibold hover:bg-indigo-700"
                >
                  Print Slip
                </button>
                <button
                  onClick={() => setInvoicePo(null)}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-xs font-semibold hover:bg-gray-200"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
