// src/pages/Suppliers.jsx
import { useEffect, useState, useMemo } from "react";
import api from "../services/api";
import LoadingSpinner from "../components/LoadingSpinner";
import Pagination from "../components/Pagination";
import {
  FiPlus,
  FiTrash2,
  FiEdit3,
  FiX,
  FiSearch,
  FiTruck,
  FiStar,
  FiPhone,
  FiCheckCircle,
  FiRefreshCw,
  FiClock,
} from "react-icons/fi";
import { showSuccess, showError, showConfirm } from "../services/swal";
import { useAuth } from "../context/AuthContext";

export default function Suppliers() {
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [ratingFilter, setRatingFilter] = useState("ALL");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({
    name: "",
    contact: "",
    leadTimeDays: 2,
    pricingScore: 4.5,
  });

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  const { isManager } = useAuth();
  const canEdit = isManager;

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await api.get("/suppliers");
      setSuppliers(res.data);
    } catch (err) {
      showError(err.response?.data?.message || "Failed to load suppliers");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const openAdd = () => {
    setEditingId(null);
    setForm({ name: "", contact: "", leadTimeDays: 2, pricingScore: 4.5 });
    setModalOpen(true);
  };

  const openEdit = (sup) => {
    setEditingId(sup.id);
    setForm({
      name: sup.name,
      contact: sup.contact || "",
      leadTimeDays: sup.leadTimeDays,
      pricingScore: sup.pricingScore,
    });
    setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        name: form.name,
        contact: form.contact,
        leadTimeDays: Number(form.leadTimeDays),
        pricingScore: Number(form.pricingScore),
      };

      if (editingId) {
        await api.put(`/suppliers/${editingId}`, payload);
        showSuccess("Supplier details updated!");
      } else {
        await api.post("/suppliers", payload);
        showSuccess("New supplier registered!");
      }
      setModalOpen(false);
      fetchData();
    } catch (err) {
      showError(err.response?.data?.message || "Error saving supplier");
    }
  };

  const deleteSupplier = async (id, name) => {
    const result = await showConfirm(`Delete supplier "${name}"? Existing PO records will remain.`);
    if (result.isConfirmed) {
      try {
        await api.delete(`/suppliers/${id}`);
        showSuccess("Supplier deleted");
        fetchData();
      } catch (err) {
        showError(err.response?.data?.message || "Error deleting supplier");
      }
    }
  };

  const filteredSuppliers = useMemo(() => {
    return suppliers.filter((s) => {
      const searchLower = search.toLowerCase();
      const matchSearch =
        s.name.toLowerCase().includes(searchLower) ||
        (s.contact && s.contact.toLowerCase().includes(searchLower));

      if (!matchSearch) return false;
      if (ratingFilter === "4_PLUS" && s.pricingScore < 4) return false;
      if (ratingFilter === "FAST_LEAD" && s.leadTimeDays > 3) return false;
      return true;
    });
  }, [suppliers, search, ratingFilter]);

  const totalPages = Math.ceil(filteredSuppliers.length / itemsPerPage);
  const paginatedSuppliers = filteredSuppliers.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Metrics
  const avgLeadTime =
    suppliers.length > 0
      ? (suppliers.reduce((acc, s) => acc + (s.leadTimeDays || 0), 0) / suppliers.length).toFixed(1)
      : 0;
  const topSupplier =
    suppliers.length > 0
      ? [...suppliers].sort((a, b) => (b.pricingScore || 0) - (a.pricingScore || 0))[0]
      : null;
  const fastSuppliersCount = suppliers.filter((s) => (s.leadTimeDays || 0) <= 2).length;

  if (loading && suppliers.length === 0) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Supplier & Vendor Directory</h1>
          <p className="text-sm text-gray-500">
            Approved bakery raw material vendors, delivery lead times, and reliability ratings
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
              onClick={openAdd}
              className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 text-sm font-medium shadow-sm transition"
            >
              <FiPlus /> Add Supplier
            </button>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl shadow-xs border border-gray-100 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Active Suppliers</p>
            <h3 className="text-2xl font-bold text-gray-800 mt-1">{suppliers.length}</h3>
            <p className="text-2xs text-gray-400 mt-0.5">Approved vendor network</p>
          </div>
          <div className="p-3 rounded-xl bg-indigo-50 text-indigo-600">
            <FiTruck size={22} />
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl shadow-xs border border-gray-100 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Avg Lead Time</p>
            <h3 className="text-2xl font-bold text-blue-600 mt-1">{avgLeadTime} days</h3>
            <p className="text-2xs text-gray-400 mt-0.5">Time to restock inventory</p>
          </div>
          <div className="p-3 rounded-xl bg-blue-50 text-blue-600">
            <FiClock size={22} />
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl shadow-xs border border-gray-100 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Fast Delivery (&le;2d)</p>
            <h3 className="text-2xl font-bold text-emerald-600 mt-1">{fastSuppliersCount}</h3>
            <p className="text-2xs text-gray-400 mt-0.5">Quick turn-around partners</p>
          </div>
          <div className="p-3 rounded-xl bg-emerald-50 text-emerald-600">
            <FiCheckCircle size={22} />
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl shadow-xs border border-gray-100 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Top Rated Partner</p>
            <h3 className="text-sm font-bold text-gray-800 mt-1 truncate max-w-[140px]">
              {topSupplier ? topSupplier.name : "N/A"}
            </h3>
            <p className="text-2xs text-amber-500 font-semibold mt-0.5 flex items-center gap-1">
              <FiStar size={11} className="fill-amber-400" /> {topSupplier?.pricingScore || 0} / 5.0 Rating
            </p>
          </div>
          <div className="p-3 rounded-xl bg-amber-50 text-amber-600">
            <FiStar size={22} />
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl shadow-xs border border-gray-100 flex flex-wrap items-center justify-between gap-4">
        <div className="relative flex-1 min-w-[240px]">
          <FiSearch className="absolute left-3 top-3 text-gray-400" />
          <input
            type="text"
            placeholder="Search by vendor name or contact info..."
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
              setRatingFilter("ALL");
              setCurrentPage(1);
            }}
            className={`px-3 py-1.5 rounded-md transition ${
              ratingFilter === "ALL" ? "bg-white text-indigo-600 shadow-xs font-bold" : "text-gray-600 hover:text-black"
            }`}
          >
            All Vendors
          </button>
          <button
            onClick={() => {
              setRatingFilter("4_PLUS");
              setCurrentPage(1);
            }}
            className={`px-3 py-1.5 rounded-md transition ${
              ratingFilter === "4_PLUS" ? "bg-white text-indigo-600 shadow-xs font-bold" : "text-gray-600 hover:text-black"
            }`}
          >
            Top Rated (4★+)
          </button>
          <button
            onClick={() => {
              setRatingFilter("FAST_LEAD");
              setCurrentPage(1);
            }}
            className={`px-3 py-1.5 rounded-md transition ${
              ratingFilter === "FAST_LEAD" ? "bg-white text-indigo-600 shadow-xs font-bold" : "text-gray-600 hover:text-black"
            }`}
          >
            Fast Lead (&le;3d)
          </button>
        </div>
      </div>

      {/* Suppliers Table */}
      <div className="bg-white rounded-xl shadow-xs border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead className="bg-gray-50 text-xs font-semibold text-gray-500 uppercase tracking-wider border-b border-gray-100">
              <tr>
                <th className="p-4">Vendor ID</th>
                <th className="p-4">Supplier Name</th>
                <th className="p-4">Contact / Phone</th>
                <th className="p-4">Standard Lead Time</th>
                <th className="p-4">Pricing & Quality Rating</th>
                {canEdit && <th className="p-4 text-right">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {paginatedSuppliers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-gray-400">
                    No suppliers found matching current filter.
                  </td>
                </tr>
              ) : (
                paginatedSuppliers.map((s) => (
                  <tr key={s.id} className="hover:bg-gray-50/70 transition">
                    <td className="p-4 font-bold text-gray-600 text-xs">#{s.id}</td>
                    <td className="p-4">
                      <div className="font-semibold text-gray-800">{s.name}</div>
                      <div className="text-2xs text-gray-400">Raw materials vendor</div>
                    </td>
                    <td className="p-4 text-xs text-gray-600">
                      <div className="flex items-center gap-1.5 text-gray-700">
                        <FiPhone size={13} className="text-gray-400" />
                        <span>{s.contact || "No contact logged"}</span>
                      </div>
                    </td>
                    <td className="p-4">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                          s.leadTimeDays <= 2
                            ? "bg-emerald-100 text-emerald-800"
                            : s.leadTimeDays <= 4
                            ? "bg-blue-100 text-blue-800"
                            : "bg-amber-100 text-amber-800"
                        }`}
                      >
                        <FiClock size={11} /> {s.leadTimeDays} {s.leadTimeDays === 1 ? "day" : "days"}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-1 text-amber-500 font-semibold text-xs">
                        {"★".repeat(Math.min(5, Math.max(1, Math.round(s.pricingScore || 0))))}
                        <span className="text-gray-600 ml-1">({Number(s.pricingScore || 0).toFixed(1)})</span>
                      </div>
                    </td>
                    {canEdit && (
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => openEdit(s)}
                            className="p-1.5 text-amber-600 hover:bg-amber-50 rounded-lg transition"
                            title="Edit Supplier"
                          >
                            <FiEdit3 size={16} />
                          </button>
                          <button
                            onClick={() => deleteSupplier(s.id, s.name)}
                            className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition"
                            title="Delete Supplier"
                          >
                            <FiTrash2 size={16} />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))
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

      {/* Modal: Add/Edit Supplier */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <h2 className="text-lg font-bold text-gray-800">
                {editingId ? "Edit Supplier Partner" : "Register New Supplier"}
              </h2>
              <button onClick={() => setModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <FiX size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Company / Supplier Name *</label>
                <input
                  type="text"
                  placeholder="e.g. Ceylon Flour Mills Ltd."
                  className="w-full border px-3 py-2 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Contact Details / Phone / Email</label>
                <input
                  type="text"
                  placeholder="e.g. 011-2345678 or sales@supplier.com"
                  className="w-full border px-3 py-2 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                  value={form.contact}
                  onChange={(e) => setForm({ ...form, contact: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Delivery Lead Time (Days) *</label>
                  <input
                    type="number"
                    min="1"
                    className="w-full border px-3 py-2 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                    value={form.leadTimeDays}
                    onChange={(e) => setForm({ ...form, leadTimeDays: Math.max(1, Number(e.target.value)) })}
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Rating (1 to 5) *</label>
                  <input
                    type="number"
                    min="1"
                    max="5"
                    step="0.1"
                    className="w-full border px-3 py-2 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                    value={form.pricingScore}
                    onChange={(e) => setForm({ ...form, pricingScore: Number(e.target.value) })}
                    required
                  />
                </div>
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
                  {editingId ? "Save Changes" : "Register Vendor"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
