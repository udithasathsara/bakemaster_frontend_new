// src/pages/Customers.jsx
import React, { useEffect, useState, useMemo } from "react";
import api from "../services/api";
import LoadingSpinner from "../components/LoadingSpinner";
import Pagination from "../components/Pagination";
import {
  FiPlus,
  FiTrash2,
  FiEdit3,
  FiChevronDown,
  FiChevronUp,
  FiX,
  FiSearch,
  FiUsers,
  FiAward,
  FiShoppingBag,
  FiPhone,
  FiMail,
  FiRefreshCw,
  FiClock,
} from "react-icons/fi";
import { showSuccess, showError, showConfirm } from "../services/swal";
import { useAuth } from "../context/AuthContext";

export default function Customers() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [tierFilter, setTierFilter] = useState("ALL");

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({
    name: "",
    phone: "",
    email: "",
    loyaltyPoints: 0,
  });

  const [expandedId, setExpandedId] = useState(null);
  const [ordersMap, setOrdersMap] = useState({});
  const [ordersLoading, setOrdersLoading] = useState(false);

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  const { isManager } = useAuth();
  const canManage = isManager;

  const fetchCustomers = async () => {
    setLoading(true);
    try {
      const res = await api.get("/customers");
      setCustomers(res.data);
    } catch (err) {
      showError(err.response?.data?.message || "Failed to load customers");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  const openAdd = () => {
    setEditingId(null);
    setForm({ name: "", phone: "", email: "", loyaltyPoints: 0 });
    setModalOpen(true);
  };

  const openEdit = (cust) => {
    setEditingId(cust.id);
    setForm({
      name: cust.name,
      phone: cust.phone || "",
      email: cust.email || "",
      loyaltyPoints: cust.loyaltyPoints || 0,
    });
    setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        name: form.name,
        phone: form.phone,
        email: form.email,
        loyaltyPoints: Number(form.loyaltyPoints || 0),
      };

      if (editingId) {
        await api.put(`/customers/${editingId}`, payload);
        showSuccess("Customer profile updated!");
      } else {
        await api.post("/customers", payload);
        showSuccess("New customer registered!");
      }
      setModalOpen(false);
      fetchCustomers();
    } catch (err) {
      showError(err.response?.data?.message || "Error saving customer");
    }
  };

  const deleteCustomer = async (id, name) => {
    const result = await showConfirm(`Delete customer "${name}"? Their order records will be preserved.`);
    if (result.isConfirmed) {
      try {
        await api.delete(`/customers/${id}`);
        showSuccess("Customer deleted");
        fetchCustomers();
      } catch (err) {
        showError(err.response?.data?.message || "Error deleting customer");
      }
    }
  };

  const toggleExpand = async (customer) => {
    if (expandedId === customer.id) {
      setExpandedId(null);
      return;
    }
    setExpandedId(customer.id);
    if (!ordersMap[customer.id]) {
      setOrdersLoading(true);
      try {
        const res = await api.get(`/customers/${customer.id}/orders`);
        setOrdersMap((prev) => ({ ...prev, [customer.id]: res.data }));
      } catch (err) {
        console.error("Failed to load customer orders", err);
      } finally {
        setOrdersLoading(false);
      }
    }
  };

  const getTier = (points = 0) => {
    if (points >= 200) return { label: "Platinum VIP", color: "bg-purple-100 text-purple-800 border-purple-200", icon: "👑" };
    if (points >= 100) return { label: "Gold Club", color: "bg-amber-100 text-amber-800 border-amber-200", icon: "⭐" };
    if (points >= 50) return { label: "Silver Regular", color: "bg-slate-100 text-slate-800 border-slate-200", icon: "🥈" };
    return { label: "Standard", color: "bg-gray-100 text-gray-700 border-gray-200", icon: "🏷️" };
  };

  const filteredCustomers = useMemo(() => {
    return customers.filter((c) => {
      const searchLower = search.toLowerCase();
      const matchSearch =
        c.name.toLowerCase().includes(searchLower) ||
        (c.phone && c.phone.toLowerCase().includes(searchLower)) ||
        (c.email && c.email.toLowerCase().includes(searchLower));

      if (!matchSearch) return false;
      if (tierFilter === "VIP" && (c.loyaltyPoints || 0) < 100) return false;
      if (tierFilter === "STANDARD" && (c.loyaltyPoints || 0) >= 100) return false;
      return true;
    });
  }, [customers, search, tierFilter]);

  const totalPages = Math.ceil(filteredCustomers.length / itemsPerPage);
  const paginatedCustomers = filteredCustomers.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const totalPoints = customers.reduce((acc, c) => acc + (c.loyaltyPoints || 0), 0);
  const vipCount = customers.filter((c) => (c.loyaltyPoints || 0) >= 100).length;

  if (loading && customers.length === 0) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Customer CRM & Loyalty</h1>
          <p className="text-sm text-gray-500">
            Client profiles, purchase histories, contact information, and reward loyalty points
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchCustomers}
            className="flex items-center gap-2 bg-white border border-gray-200 px-3 py-2 rounded-lg text-sm text-gray-700 hover:bg-gray-50 shadow-xs"
          >
            <FiRefreshCw className={loading ? "animate-spin" : ""} /> Refresh
          </button>
          <button
            onClick={openAdd}
            className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 text-sm font-medium shadow-sm transition"
          >
            <FiPlus /> New Customer
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl shadow-xs border border-gray-100 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Total Customers</p>
            <h3 className="text-2xl font-bold text-gray-800 mt-1">{customers.length}</h3>
            <p className="text-2xs text-gray-400 mt-0.5">Registered client database</p>
          </div>
          <div className="p-3 rounded-xl bg-indigo-50 text-indigo-600">
            <FiUsers size={22} />
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl shadow-xs border border-gray-100 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">VIP Club Members</p>
            <h3 className="text-2xl font-bold text-amber-600 mt-1">{vipCount}</h3>
            <p className="text-2xs text-gray-400 mt-0.5">&ge;100 loyalty points</p>
          </div>
          <div className="p-3 rounded-xl bg-amber-50 text-amber-600">
            <FiAward size={22} />
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl shadow-xs border border-gray-100 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Total Loyalty Points</p>
            <h3 className="text-2xl font-bold text-purple-600 mt-1">{totalPoints}</h3>
            <p className="text-2xs text-gray-400 mt-0.5">Distributed to patrons</p>
          </div>
          <div className="p-3 rounded-xl bg-purple-50 text-purple-600">
            <FiShoppingBag size={22} />
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl shadow-xs border border-gray-100 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Average Points</p>
            <h3 className="text-2xl font-bold text-emerald-600 mt-1">
              {customers.length > 0 ? (totalPoints / customers.length).toFixed(0) : 0}
            </h3>
            <p className="text-2xs text-gray-400 mt-0.5">Points per customer</p>
          </div>
          <div className="p-3 rounded-xl bg-emerald-50 text-emerald-600">
            <FiAward size={22} />
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl shadow-xs border border-gray-100 flex flex-wrap items-center justify-between gap-4">
        <div className="relative flex-1 min-w-[240px]">
          <FiSearch className="absolute left-3 top-3 text-gray-400" />
          <input
            type="text"
            placeholder="Search by customer name, phone, or email..."
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
              setTierFilter("ALL");
              setCurrentPage(1);
            }}
            className={`px-3 py-1.5 rounded-md transition ${
              tierFilter === "ALL" ? "bg-white text-indigo-600 shadow-xs font-bold" : "text-gray-600 hover:text-black"
            }`}
          >
            All Clients
          </button>
          <button
            onClick={() => {
              setTierFilter("VIP");
              setCurrentPage(1);
            }}
            className={`px-3 py-1.5 rounded-md transition ${
              tierFilter === "VIP" ? "bg-white text-indigo-600 shadow-xs font-bold" : "text-gray-600 hover:text-black"
            }`}
          >
            VIP Members (100+ pts)
          </button>
          <button
            onClick={() => {
              setTierFilter("STANDARD");
              setCurrentPage(1);
            }}
            className={`px-3 py-1.5 rounded-md transition ${
              tierFilter === "STANDARD" ? "bg-white text-indigo-600 shadow-xs font-bold" : "text-gray-600 hover:text-black"
            }`}
          >
            Standard
          </button>
        </div>
      </div>

      {/* Customer Table */}
      <div className="bg-white rounded-xl shadow-xs border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead className="bg-gray-50 text-xs font-semibold text-gray-500 uppercase tracking-wider border-b border-gray-100">
              <tr>
                <th className="p-4">Customer</th>
                <th className="p-4">Contact Info</th>
                <th className="p-4">Loyalty Tier</th>
                <th className="p-4">Points</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {paginatedCustomers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-12 text-gray-400">
                    No customers found matching current criteria.
                  </td>
                </tr>
              ) : (
                paginatedCustomers.map((c) => {
                  const tier = getTier(c.loyaltyPoints);
                  const isExpanded = expandedId === c.id;
                  const customerOrders = ordersMap[c.id] || [];
                  const initials = c.name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")
                    .slice(0, 2)
                    .toUpperCase();

                  return (
                    <React.Fragment key={c.id}>
                      <tr
                        className="hover:bg-gray-50/70 transition cursor-pointer"
                        onClick={() => toggleExpand(c)}
                      >
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center text-xs shadow-xs">
                              {initials}
                            </div>
                            <div>
                              <div className="font-semibold text-gray-800">{c.name}</div>
                              <div className="text-2xs text-gray-400">Client #{c.id}</div>
                            </div>
                          </div>
                        </td>

                        <td className="p-4 text-xs text-gray-600">
                          <div className="space-y-0.5">
                            {c.phone && (
                              <div className="flex items-center gap-1.5 text-gray-700">
                                <FiPhone size={12} className="text-gray-400" />
                                <span>{c.phone}</span>
                              </div>
                            )}
                            {c.email && (
                              <div className="flex items-center gap-1.5 text-gray-500">
                                <FiMail size={12} className="text-gray-400" />
                                <span>{c.email}</span>
                              </div>
                            )}
                            {!c.phone && !c.email && <span className="text-gray-400">No contact logged</span>}
                          </div>
                        </td>

                        <td className="p-4">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${tier.color}`}>
                            <span>{tier.icon}</span> {tier.label}
                          </span>
                        </td>

                        <td className="p-4 font-bold text-gray-800">
                          {c.loyaltyPoints || 0} pts
                        </td>

                        <td className="p-4 text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => openEdit(c)}
                              className="p-1.5 text-amber-600 hover:bg-amber-50 rounded-lg transition"
                              title="Edit Customer"
                            >
                              <FiEdit3 size={16} />
                            </button>
                            {canManage && (
                              <button
                                onClick={() => deleteCustomer(c.id, c.name)}
                                className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition"
                                title="Delete Customer"
                              >
                                <FiTrash2 size={16} />
                              </button>
                            )}
                            <button
                              onClick={() => toggleExpand(c)}
                              className="p-1.5 text-gray-400 hover:text-gray-600 rounded ml-1"
                            >
                              {isExpanded ? <FiChevronUp size={16} /> : <FiChevronDown size={16} />}
                            </button>
                          </div>
                        </td>
                      </tr>

                      {/* Order History Accordion */}
                      {isExpanded && (
                        <tr className="bg-gray-50/70">
                          <td colSpan={5} className="p-4">
                            <div className="bg-white p-4 rounded-xl border border-gray-100 max-w-2xl space-y-3">
                              <h4 className="font-bold text-xs text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
                                <FiShoppingBag className="text-indigo-600" /> Order History for {c.name}
                              </h4>

                              {ordersLoading && !ordersMap[c.id] ? (
                                <p className="text-xs text-gray-400 py-3">Loading order history...</p>
                              ) : customerOrders.length === 0 ? (
                                <p className="text-xs text-gray-400 py-3">No orders placed by this customer yet.</p>
                              ) : (
                                <div className="divide-y divide-gray-100 space-y-2 text-xs">
                                  {customerOrders.map((o) => (
                                    <div key={o.id} className="pt-2 flex justify-between items-start">
                                      <div>
                                        <div className="font-bold text-gray-800 flex items-center gap-2">
                                          Order #{o.id} – <span className="text-indigo-600">{o.channel}</span>
                                          <span className="text-2xs font-normal px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                                            {o.status}
                                          </span>
                                        </div>
                                        <div className="text-gray-500 mt-1 space-y-0.5">
                                          {o.items?.map((it) => (
                                            <span key={it.id} className="inline-block mr-3 text-2xs">
                                              • {it.productName} (x{it.quantity})
                                            </span>
                                          ))}
                                        </div>
                                      </div>
                                      <div className="text-right">
                                        <span className="font-bold text-gray-800 text-xs">
                                          Rs.{Number(o.totalAmount || 0).toFixed(2)}
                                        </span>
                                        <div className="text-2xs text-gray-400">{o.orderDate || "N/A"}</div>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
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

      {/* Modal: Add/Edit Customer */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <h2 className="text-lg font-bold text-gray-800">
                {editingId ? "Edit Customer Profile" : "Register New Customer"}
              </h2>
              <button onClick={() => setModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <FiX size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Customer Name *</label>
                <input
                  type="text"
                  placeholder="e.g. Anoma Jayasinghe"
                  className="w-full border px-3 py-2 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Phone Number</label>
                <input
                  type="text"
                  placeholder="e.g. 077-1234567"
                  className="w-full border px-3 py-2 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Email Address</label>
                <input
                  type="email"
                  placeholder="e.g. anoma@gmail.com"
                  className="w-full border px-3 py-2 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Loyalty Points</label>
                <input
                  type="number"
                  min="0"
                  className="w-full border px-3 py-2 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                  value={form.loyaltyPoints}
                  onChange={(e) => setForm({ ...form, loyaltyPoints: Math.max(0, Number(e.target.value)) })}
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
                  {editingId ? "Save Profile" : "Register Customer"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
