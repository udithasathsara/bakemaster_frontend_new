// src/pages/Inventory.jsx
import { useEffect, useState, useMemo } from "react";
import api from "../services/api";
import LoadingSpinner from "../components/LoadingSpinner";
import Pagination from "../components/Pagination";
import {
  FiPlus,
  FiEdit3,
  FiTrash2,
  FiAlertTriangle,
  FiX,
  FiSearch,
  FiPackage,
  FiCalendar,
  FiDollarSign,
  FiRefreshCw,
  FiTrendingDown,
  FiPlusCircle,
  FiShoppingCart,
} from "react-icons/fi";
import { showSuccess, showError, showConfirm } from "../services/swal";
import { useAuth } from "../context/AuthContext";

const COMMON_UNITS = ["kg", "g", "L", "ml", "pcs", "boxes", "packs"];

export default function Inventory() {
  const [ingredients, setIngredients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("ALL"); // ALL, LOW_STOCK, EXPIRING_SOON, EXPIRED

  // Add / Edit Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({
    name: "",
    quantity: 10,
    unit: "kg",
    expiryDate: "",
    reorderThreshold: 5,
    costPerUnit: 0,
  });

  // Restock / Refill Modal
  const [restockModalOpen, setRestockModalOpen] = useState(false);
  const [restockItem, setRestockItem] = useState(null);
  const [restockForm, setRestockForm] = useState({
    addQty: 10,
    newExpiryDate: "",
  });

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  const { isManager, isAdmin } = useAuth();
  const canEdit = isManager;

  const fetchIngredients = async () => {
    setLoading(true);
    try {
      const res = await api.get("/inventory");
      setIngredients(res.data);
    } catch (err) {
      showError(err.response?.data?.message || "Failed to load inventory");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIngredients();
  }, []);

  const openAdd = () => {
    setEditingId(null);
    setForm({
      name: "",
      quantity: 10,
      unit: "kg",
      expiryDate: "",
      reorderThreshold: 5,
      costPerUnit: 0,
    });
    setModalOpen(true);
  };

  const openEdit = (ing) => {
    setEditingId(ing.id);
    setForm({
      name: ing.name,
      quantity: ing.quantity,
      unit: ing.unit,
      expiryDate: ing.expiryDate || "",
      reorderThreshold: ing.reorderThreshold,
      costPerUnit: ing.costPerUnit || 0,
    });
    setModalOpen(true);
  };

  const openRestock = (ing) => {
    setRestockItem(ing);
    setRestockForm({
      addQty: 10,
      newExpiryDate: ing.expiryDate || "",
    });
    setRestockModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        name: form.name.trim(),
        quantity: Number(form.quantity),
        unit: form.unit.trim(),
        // Send null instead of empty string so Jackson LocalDate doesn't throw 400!
        expiryDate: form.expiryDate ? form.expiryDate : null,
        reorderThreshold: Number(form.reorderThreshold),
        costPerUnit: Number(form.costPerUnit || 0),
      };

      if (editingId) {
        await api.put(`/inventory/${editingId}`, payload);
        showSuccess("Ingredient updated successfully!");
      } else {
        await api.post("/inventory", payload);
        showSuccess("New ingredient added to inventory!");
      }
      setModalOpen(false);
      fetchIngredients();
    } catch (err) {
      showError(err.response?.data?.message || "Error saving ingredient");
    }
  };

  const handleRestockSubmit = async (e) => {
    e.preventDefault();
    if (!restockItem) return;

    try {
      let url = `/inventory/${restockItem.id}/stock?qty=${encodeURIComponent(
        restockForm.addQty
      )}&addStock=true`;
      if (restockForm.newExpiryDate) {
        url += `&expiryDate=${encodeURIComponent(restockForm.newExpiryDate)}`;
      }

      await api.put(url);
      showSuccess(
        `Restocked ${restockForm.addQty} ${restockItem.unit} of "${restockItem.name}" and updated expiry date!`
      );
      setRestockModalOpen(false);
      fetchIngredients();
    } catch (err) {
      showError(err.response?.data?.message || "Failed to restock item");
    }
  };

  const deleteIngredient = async (id, name) => {
    const result = await showConfirm(
      `Delete ingredient "${name}" from inventory? This cannot be undone.`
    );
    if (result.isConfirmed) {
      try {
        await api.delete(`/inventory/${id}`);
        showSuccess("Ingredient deleted");
        fetchIngredients();
      } catch (err) {
        showError(err.response?.data?.message || "Error deleting ingredient");
      }
    }
  };

  const handleGeneratePO = async () => {
    try {
      const res = await api.post("/inventory/generate-po");
      showSuccess(`Purchase Order #${res.data.id} automatically drafted for low-stock items!`);
    } catch (err) {
      showError(err.response?.data?.message || "No ingredients below reorder threshold.");
    }
  };

  const getExpiryStatus = (expiryDate) => {
    if (!expiryDate) return { label: "No Date", color: "bg-gray-100 text-gray-600 border-gray-200" };
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const exp = new Date(expiryDate);
    const diffDays = Math.ceil((exp - today) / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return { label: `Expired (${Math.abs(diffDays)}d ago)`, color: "bg-rose-100 text-rose-800 border-rose-200", isExpired: true };
    }
    if (diffDays <= 7) {
      return { label: `Expires in ${diffDays}d`, color: "bg-amber-100 text-amber-800 border-amber-200", isExpiringSoon: true };
    }
    return { label: expiryDate, color: "bg-emerald-50 text-emerald-700 border-emerald-200" };
  };

  const filteredIngredients = useMemo(() => {
    return ingredients.filter((ing) => {
      const searchLower = search.toLowerCase();
      const matchSearch =
        ing.name.toLowerCase().includes(searchLower) ||
        (ing.unit && ing.unit.toLowerCase().includes(searchLower));

      if (!matchSearch) return false;

      const isLowStock = ing.quantity <= ing.reorderThreshold;
      const expStatus = getExpiryStatus(ing.expiryDate);

      if (filterType === "LOW_STOCK" && !isLowStock) return false;
      if (filterType === "EXPIRING_SOON" && !expStatus.isExpiringSoon) return false;
      if (filterType === "EXPIRED" && !expStatus.isExpired) return false;

      return true;
    });
  }, [ingredients, search, filterType]);

  const totalPages = Math.ceil(filteredIngredients.length / itemsPerPage);
  const paginatedIngredients = filteredIngredients.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Metrics
  const totalSku = ingredients.length;
  const lowStockCount = ingredients.filter((i) => i.quantity <= i.reorderThreshold).length;
  const expiredCount = ingredients.filter((i) => getExpiryStatus(i.expiryDate).isExpired).length;
  const expiringSoonCount = ingredients.filter((i) => getExpiryStatus(i.expiryDate).isExpiringSoon).length;
  const totalValuation = ingredients.reduce((acc, i) => acc + (i.quantity || 0) * (i.costPerUnit || 0), 0);

  if (loading && ingredients.length === 0) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Inventory & Raw Materials</h1>
          <p className="text-sm text-gray-500">
            Ingredient stock levels, batch expiry tracking, restock refills, and automatic PO generation
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={fetchIngredients}
            className="flex items-center gap-2 bg-white border border-gray-200 px-3 py-2 rounded-lg text-sm text-gray-700 hover:bg-gray-50 shadow-xs"
          >
            <FiRefreshCw className={loading ? "animate-spin" : ""} /> Refresh
          </button>
          {canEdit && (
            <button
              onClick={handleGeneratePO}
              className="flex items-center gap-2 bg-amber-600 text-white px-3.5 py-2 rounded-lg hover:bg-amber-700 text-sm font-medium shadow-xs transition"
              title="Auto-draft PO for low ingredients"
            >
              <FiShoppingCart /> Auto-Generate PO
            </button>
          )}
          {canEdit && (
            <button
              onClick={openAdd}
              className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 text-sm font-medium shadow-sm transition"
            >
              <FiPlus /> Add Material
            </button>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl shadow-xs border border-gray-100 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Total Raw SKUs</p>
            <h3 className="text-2xl font-bold text-gray-800 mt-1">{totalSku}</h3>
            <p className="text-2xs text-gray-400 mt-0.5">Cataloged bakery ingredients</p>
          </div>
          <div className="p-3 rounded-xl bg-indigo-50 text-indigo-600">
            <FiPackage size={22} />
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl shadow-xs border border-gray-100 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Low Stock Warnings</p>
            <h3 className="text-2xl font-bold text-amber-600 mt-1">{lowStockCount}</h3>
            <p className="text-2xs text-gray-400 mt-0.5">Below reorder threshold</p>
          </div>
          <div className="p-3 rounded-xl bg-amber-50 text-amber-600">
            <FiTrendingDown size={22} />
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl shadow-xs border border-gray-100 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Expiry Alerts</p>
            <h3 className="text-2xl font-bold text-rose-600 mt-1">
              {expiredCount + expiringSoonCount}
            </h3>
            <p className="text-2xs text-gray-400 mt-0.5">
              {expiredCount} expired & {expiringSoonCount} expiring soon
            </p>
          </div>
          <div className="p-3 rounded-xl bg-rose-50 text-rose-600">
            <FiAlertTriangle size={22} />
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl shadow-xs border border-gray-100 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Inventory Valuation</p>
            <h3 className="text-2xl font-bold text-emerald-600 mt-1">
              Rs.{totalValuation.toFixed(2)}
            </h3>
            <p className="text-2xs text-gray-400 mt-0.5">Total stock value on hand</p>
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
            placeholder="Search ingredients by name or unit..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full pl-9 pr-4 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
          />
        </div>

        <div className="flex bg-gray-100 p-1 rounded-lg text-xs font-medium">
          <button
            onClick={() => {
              setFilterType("ALL");
              setCurrentPage(1);
            }}
            className={`px-3 py-1.5 rounded-md transition ${
              filterType === "ALL" ? "bg-white text-indigo-600 shadow-xs font-bold" : "text-gray-600 hover:text-black"
            }`}
          >
            All Items
          </button>
          <button
            onClick={() => {
              setFilterType("LOW_STOCK");
              setCurrentPage(1);
            }}
            className={`px-3 py-1.5 rounded-md transition ${
              filterType === "LOW_STOCK" ? "bg-white text-amber-600 shadow-xs font-bold" : "text-gray-600 hover:text-black"
            }`}
          >
            Low Stock ({lowStockCount})
          </button>
          <button
            onClick={() => {
              setFilterType("EXPIRING_SOON");
              setCurrentPage(1);
            }}
            className={`px-3 py-1.5 rounded-md transition ${
              filterType === "EXPIRING_SOON" ? "bg-white text-rose-600 shadow-xs font-bold" : "text-gray-600 hover:text-black"
            }`}
          >
            Expiring &le;7d ({expiringSoonCount})
          </button>
          <button
            onClick={() => {
              setFilterType("EXPIRED");
              setCurrentPage(1);
            }}
            className={`px-3 py-1.5 rounded-md transition ${
              filterType === "EXPIRED" ? "bg-white text-rose-700 shadow-xs font-bold" : "text-gray-600 hover:text-black"
            }`}
          >
            Expired ({expiredCount})
          </button>
        </div>
      </div>

      {/* Inventory Table */}
      <div className="bg-white rounded-xl shadow-xs border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead className="bg-gray-50 text-xs font-semibold text-gray-500 uppercase tracking-wider border-b border-gray-100">
              <tr>
                <th className="p-4">Ingredient</th>
                <th className="p-4">Stock Level</th>
                <th className="p-4">Reorder Threshold</th>
                <th className="p-4">Batch Expiry</th>
                <th className="p-4">Unit Cost</th>
                <th className="p-4">Total Value</th>
                {canEdit && <th className="p-4 text-right">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {paginatedIngredients.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-gray-400">
                    No ingredients found matching current filters.
                  </td>
                </tr>
              ) : (
                paginatedIngredients.map((ing) => {
                  const isLow = ing.quantity <= ing.reorderThreshold;
                  const expStatus = getExpiryStatus(ing.expiryDate);
                  const totalVal = (ing.quantity || 0) * (ing.costPerUnit || 0);

                  return (
                    <tr key={ing.id} className="hover:bg-gray-50/70 transition">
                      <td className="p-4">
                        <div className="font-semibold text-gray-800">{ing.name}</div>
                        <div className="text-2xs text-gray-400">SKU #{ing.id}</div>
                      </td>

                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <span className={`font-bold text-sm ${isLow ? "text-rose-600" : "text-gray-800"}`}>
                            {ing.quantity} {ing.unit}
                          </span>
                          {isLow && (
                            <span className="px-2 py-0.5 rounded-full text-2xs font-bold bg-amber-100 text-amber-800 border border-amber-200 flex items-center gap-1">
                              <FiAlertTriangle size={10} /> Low
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="p-4 text-xs text-gray-600">
                        {ing.reorderThreshold} {ing.unit}
                      </td>

                      <td className="p-4">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold border ${expStatus.color}`}
                        >
                          {expStatus.label}
                        </span>
                      </td>

                      <td className="p-4 text-xs text-gray-600">
                        Rs.{Number(ing.costPerUnit || 0).toFixed(2)} / {ing.unit}
                      </td>

                      <td className="p-4 font-bold text-gray-800 text-xs">
                        Rs.{totalVal.toFixed(2)}
                      </td>

                      {canEdit && (
                        <td className="p-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* Dedicated Restock / Refill Button */}
                            <button
                              onClick={() => openRestock(ing)}
                              className="flex items-center gap-1 px-2.5 py-1 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-lg text-xs font-semibold transition border border-emerald-200"
                              title="Refill stock & set new expiry date"
                            >
                              <FiPlusCircle size={13} /> Restock
                            </button>

                            <button
                              onClick={() => openEdit(ing)}
                              className="p-1.5 text-amber-600 hover:bg-amber-50 rounded-lg transition"
                              title="Edit Material"
                            >
                              <FiEdit3 size={16} />
                            </button>

                            <button
                              onClick={() => deleteIngredient(ing.id, ing.name)}
                              className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition"
                              title="Delete Material"
                            >
                              <FiTrash2 size={16} />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {totalPages > 1 && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
        />
      )}

      {/* Modal: Add/Edit Ingredient */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <h2 className="text-lg font-bold text-gray-800">
                {editingId ? "Edit Raw Ingredient" : "Add New Raw Material"}
              </h2>
              <button onClick={() => setModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <FiX size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Ingredient Name *</label>
                <input
                  type="text"
                  placeholder="e.g. All Purpose Flour"
                  className="w-full border px-3 py-2 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Quantity *</label>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    className="w-full border px-3 py-2 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                    value={form.quantity}
                    onChange={(e) => setForm({ ...form, quantity: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Unit *</label>
                  <input
                    type="text"
                    list="units-list"
                    placeholder="kg, g, L..."
                    className="w-full border px-3 py-2 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                    value={form.unit}
                    onChange={(e) => setForm({ ...form, unit: e.target.value })}
                    required
                  />
                  <datalist id="units-list">
                    {COMMON_UNITS.map((u) => (
                      <option key={u} value={u} />
                    ))}
                  </datalist>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Batch Expiry Date <span className="text-gray-400 font-normal">(Optional)</span>
                  </label>
                  <input
                    type="date"
                    className="w-full border px-3 py-2 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                    value={form.expiryDate}
                    onChange={(e) => setForm({ ...form, expiryDate: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Reorder Threshold *</label>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    className="w-full border px-3 py-2 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                    value={form.reorderThreshold}
                    onChange={(e) => setForm({ ...form, reorderThreshold: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Cost Per Unit (Rs.)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  className="w-full border px-3 py-2 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                  value={form.costPerUnit}
                  onChange={(e) => setForm({ ...form, costPerUnit: e.target.value })}
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
                  className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 shadow-sm"
                >
                  {editingId ? "Save Changes" : "Create Ingredient"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Restock / Refill Stock & Set Expiry Date */}
      {restockModalOpen && restockItem && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <div>
                <h2 className="text-lg font-bold text-gray-800">Restock & Set Expiry Date</h2>
                <p className="text-xs text-gray-500">{restockItem.name}</p>
              </div>
              <button onClick={() => setRestockModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <FiX size={20} />
              </button>
            </div>

            <form onSubmit={handleRestockSubmit} className="p-6 space-y-4">
              <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-100 text-xs text-emerald-800 flex justify-between items-center">
                <span>Current Stock:</span>
                <span className="font-bold text-sm">
                  {restockItem.quantity} {restockItem.unit}
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Quantity to Add ({restockItem.unit}) *
                </label>
                <input
                  type="number"
                  step="any"
                  min="0.1"
                  required
                  className="w-full border px-3 py-2 rounded-lg text-sm outline-none focus:ring-2 focus:ring-emerald-500"
                  value={restockForm.addQty}
                  onChange={(e) => setRestockForm({ ...restockForm, addQty: e.target.value })}
                />
                <p className="text-2xs text-gray-400 mt-1">
                  New total stock will become:{" "}
                  <strong>
                    {(Number(restockItem.quantity || 0) + Number(restockForm.addQty || 0)).toFixed(1)}{" "}
                    {restockItem.unit}
                  </strong>
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  New Batch Expiry Date *
                </label>
                <input
                  type="date"
                  required
                  className="w-full border px-3 py-2 rounded-lg text-sm outline-none focus:ring-2 focus:ring-emerald-500"
                  value={restockForm.newExpiryDate}
                  onChange={(e) => setRestockForm({ ...restockForm, newExpiryDate: e.target.value })}
                />
                <p className="text-2xs text-gray-400 mt-1">
                  Updates expiration tracker for fresh stock batch.
                </p>
              </div>

              <div className="pt-3 flex gap-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setRestockModalOpen(false)}
                  className="flex-1 px-4 py-2 border rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-semibold hover:bg-emerald-700 shadow-sm"
                >
                  Confirm Restock
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
