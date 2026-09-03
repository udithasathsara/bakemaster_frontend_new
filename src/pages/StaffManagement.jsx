// src/pages/StaffManagement.jsx
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
  FiUsers,
  FiClock,
  FiCheckCircle,
  FiMail,
  FiPhone,
  FiRefreshCw,
} from "react-icons/fi";
import { showSuccess, showError, showConfirm } from "../services/swal";
import { useAuth } from "../context/AuthContext";

const STAFF_ROLES = [
  { value: "BAKER", label: "Master Baker", color: "bg-amber-100 text-amber-800 border-amber-200" },
  { value: "DECORATOR", label: "Cake Decorator", color: "bg-pink-100 text-pink-800 border-pink-200" },
  { value: "DELIVERY", label: "Delivery Driver", color: "bg-blue-100 text-blue-800 border-blue-200" },
  { value: "CASHIER", label: "POS / Cashier", color: "bg-emerald-100 text-emerald-800 border-emerald-200" },
  { value: "MANAGER", label: "Floor Manager", color: "bg-purple-100 text-purple-800 border-purple-200" },
];

export default function StaffManagement() {
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedRole, setSelectedRole] = useState("ALL");
  const [selectedStatus, setSelectedStatus] = useState("ALL");

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({
    name: "",
    role: "BAKER",
    phone: "",
    email: "",
    shiftStart: "08:00",
    shiftEnd: "16:00",
    active: true,
  });

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  const { isManager } = useAuth();
  const canEdit = isManager;

  useEffect(() => {
    fetchStaff();
  }, []);

  const fetchStaff = async () => {
    setLoading(true);
    try {
      const res = await api.get("/staff");
      setStaff(res.data);
    } catch (err) {
      showError(err.response?.data?.message || "Failed to load staff roster");
    } finally {
      setLoading(false);
    }
  };

  const openAdd = () => {
    setEditingId(null);
    setForm({
      name: "",
      role: "BAKER",
      phone: "",
      email: "",
      shiftStart: "08:00",
      shiftEnd: "16:00",
      active: true,
    });
    setModalOpen(true);
  };

  const openEdit = (s) => {
    setEditingId(s.id);
    setForm({
      name: s.name,
      role: s.role,
      phone: s.phone || "",
      email: s.email || "",
      shiftStart: s.shiftStart ? s.shiftStart.slice(0, 5) : "08:00",
      shiftEnd: s.shiftEnd ? s.shiftEnd.slice(0, 5) : "16:00",
      active: s.active,
    });
    setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        name: form.name,
        role: form.role,
        phone: form.phone,
        email: form.email,
        shiftStart: form.shiftStart ? form.shiftStart + ":00" : null,
        shiftEnd: form.shiftEnd ? form.shiftEnd + ":00" : null,
        active: form.active,
      };

      if (editingId) {
        await api.put(`/staff/${editingId}`, payload);
        showSuccess("Staff member updated successfully!");
      } else {
        await api.post("/staff", payload);
        showSuccess("New staff member registered!");
      }
      setModalOpen(false);
      fetchStaff();
    } catch (err) {
      showError(err.response?.data?.message || "Failed to save staff record");
    }
  };

  const deleteStaff = async (id, name) => {
    const result = await showConfirm(`Remove "${name}" from staff roster?`);
    if (result.isConfirmed) {
      try {
        await api.delete(`/staff/${id}`);
        showSuccess("Staff member deleted");
        fetchStaff();
      } catch (err) {
        showError(err.response?.data?.message || "Failed to delete staff member");
      }
    }
  };

  const filteredStaff = useMemo(() => {
    return staff.filter((s) => {
      const searchLower = search.toLowerCase();
      const matchSearch =
        s.name.toLowerCase().includes(searchLower) ||
        (s.phone && s.phone.toLowerCase().includes(searchLower)) ||
        (s.email && s.email.toLowerCase().includes(searchLower));

      if (!matchSearch) return false;
      if (selectedRole !== "ALL" && s.role !== selectedRole) return false;
      if (selectedStatus === "ACTIVE" && !s.active) return false;
      if (selectedStatus === "INACTIVE" && s.active) return false;
      return true;
    });
  }, [staff, search, selectedRole, selectedStatus]);

  const totalPages = Math.ceil(filteredStaff.length / itemsPerPage);
  const paginatedStaff = filteredStaff.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const getRoleMeta = (roleVal) => {
    return (
      STAFF_ROLES.find((r) => r.value === roleVal) || {
        label: roleVal,
        color: "bg-gray-100 text-gray-800 border-gray-200",
      }
    );
  };

  const activeStaffCount = staff.filter((s) => s.active).length;
  const bakersCount = staff.filter((s) => s.role === "BAKER").length;
  const decoratorsCount = staff.filter((s) => s.role === "DECORATOR").length;

  if (loading && staff.length === 0) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Staff & Kitchen Team</h1>
          <p className="text-sm text-gray-500">
            Workforce scheduling, bakery stations, shifts, and active personnel
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchStaff}
            className="flex items-center gap-2 bg-white border border-gray-200 px-3 py-2 rounded-lg text-sm text-gray-700 hover:bg-gray-50 shadow-xs"
          >
            <FiRefreshCw className={loading ? "animate-spin" : ""} /> Refresh
          </button>
          {canEdit && (
            <button
              onClick={openAdd}
              className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 text-sm font-medium shadow-sm transition"
            >
              <FiPlus /> Add Staff Member
            </button>
          )}
        </div>
      </div>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl shadow-xs border border-gray-100 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Total Staff</p>
            <h3 className="text-2xl font-bold text-gray-800 mt-1">{staff.length}</h3>
            <p className="text-2xs text-gray-400 mt-0.5">Enrolled personnel</p>
          </div>
          <div className="p-3 rounded-xl bg-indigo-50 text-indigo-600">
            <FiUsers size={22} />
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl shadow-xs border border-gray-100 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Active On Roster</p>
            <h3 className="text-2xl font-bold text-emerald-600 mt-1">{activeStaffCount}</h3>
            <p className="text-2xs text-gray-400 mt-0.5">Available for shifts</p>
          </div>
          <div className="p-3 rounded-xl bg-emerald-50 text-emerald-600">
            <FiCheckCircle size={22} />
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl shadow-xs border border-gray-100 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Bakers</p>
            <h3 className="text-2xl font-bold text-amber-600 mt-1">{bakersCount}</h3>
            <p className="text-2xs text-gray-400 mt-0.5">Oven & dough section</p>
          </div>
          <div className="p-3 rounded-xl bg-amber-50 text-amber-600">
            <FiClock size={22} />
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl shadow-xs border border-gray-100 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Decorators</p>
            <h3 className="text-2xl font-bold text-pink-600 mt-1">{decoratorsCount}</h3>
            <p className="text-2xs text-gray-400 mt-0.5">Finishing & cake design</p>
          </div>
          <div className="p-3 rounded-xl bg-pink-50 text-pink-600">
            <FiUsers size={22} />
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl shadow-xs border border-gray-100 flex flex-wrap items-center justify-between gap-4">
        <div className="relative flex-1 min-w-[240px]">
          <FiSearch className="absolute left-3 top-3 text-gray-400" />
          <input
            type="text"
            placeholder="Search staff by name, phone, or email..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full pl-9 pr-4 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex bg-gray-100 p-1 rounded-lg text-xs font-medium">
            <button
              onClick={() => {
                setSelectedRole("ALL");
                setCurrentPage(1);
              }}
              className={`px-3 py-1.5 rounded-md transition ${
                selectedRole === "ALL" ? "bg-white text-indigo-600 shadow-xs font-bold" : "text-gray-600 hover:text-black"
              }`}
            >
              All Roles
            </button>
            {STAFF_ROLES.map((r) => (
              <button
                key={r.value}
                onClick={() => {
                  setSelectedRole(r.value);
                  setCurrentPage(1);
                }}
                className={`px-3 py-1.5 rounded-md transition ${
                  selectedRole === r.value ? "bg-white text-indigo-600 shadow-xs font-bold" : "text-gray-600 hover:text-black"
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>

          <select
            value={selectedStatus}
            onChange={(e) => {
              setSelectedStatus(e.target.value);
              setCurrentPage(1);
            }}
            className="border px-3 py-2 rounded-lg text-xs bg-white outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
          >
            <option value="ALL">All Status</option>
            <option value="ACTIVE">Active Only</option>
            <option value="INACTIVE">Inactive</option>
          </select>
        </div>
      </div>

      {/* Staff Table */}
      <div className="bg-white rounded-xl shadow-xs border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead className="bg-gray-50 text-xs font-semibold text-gray-500 uppercase tracking-wider border-b border-gray-100">
              <tr>
                <th className="p-4">Staff Member</th>
                <th className="p-4">Station / Role</th>
                <th className="p-4">Contact Details</th>
                <th className="p-4">Working Shift</th>
                <th className="p-4">Status</th>
                {canEdit && <th className="p-4 text-right">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {paginatedStaff.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-gray-400">
                    No staff records found.
                  </td>
                </tr>
              ) : (
                paginatedStaff.map((s) => {
                  const roleMeta = getRoleMeta(s.role);
                  const initials = s.name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")
                    .slice(0, 2)
                    .toUpperCase();

                  return (
                    <tr key={s.id} className="hover:bg-gray-50/70 transition">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-amber-100 text-amber-800 font-bold flex items-center justify-center text-xs shadow-xs">
                            {initials}
                          </div>
                          <div>
                            <div className="font-semibold text-gray-800">{s.name}</div>
                            <div className="text-2xs text-gray-400">Staff #{s.id}</div>
                          </div>
                        </div>
                      </td>

                      <td className="p-4">
                        <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold border ${roleMeta.color}`}>
                          {roleMeta.label}
                        </span>
                      </td>

                      <td className="p-4 text-xs text-gray-600">
                        <div className="space-y-0.5">
                          {s.phone && (
                            <div className="flex items-center gap-1 text-gray-700">
                              <FiPhone size={12} className="text-gray-400" />
                              {s.phone}
                            </div>
                          )}
                          {s.email && (
                            <div className="flex items-center gap-1 text-gray-500">
                              <FiMail size={12} className="text-gray-400" />
                              {s.email}
                            </div>
                          )}
                          {!s.phone && !s.email && <span className="text-gray-400">No contact logged</span>}
                        </div>
                      </td>

                      <td className="p-4">
                        <div className="flex items-center gap-1.5 text-xs text-gray-700 font-medium">
                          <FiClock size={13} className="text-indigo-500" />
                          <span>
                            {s.shiftStart ? s.shiftStart.slice(0, 5) : "08:00"} –{" "}
                            {s.shiftEnd ? s.shiftEnd.slice(0, 5) : "16:00"}
                          </span>
                        </div>
                      </td>

                      <td className="p-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                            s.active
                              ? "bg-emerald-100 text-emerald-800"
                              : "bg-rose-100 text-rose-800"
                          }`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${s.active ? "bg-emerald-600" : "bg-rose-600"}`} />
                          {s.active ? "Active" : "Inactive"}
                        </span>
                      </td>

                      {canEdit && (
                        <td className="p-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => openEdit(s)}
                              className="p-1.5 text-amber-600 hover:bg-amber-50 rounded-lg transition"
                              title="Edit Details"
                            >
                              <FiEdit3 size={16} />
                            </button>
                            <button
                              onClick={() => deleteStaff(s.id, s.name)}
                              className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition"
                              title="Delete Record"
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

      {/* Modal: Add/Edit Staff */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <h2 className="text-lg font-bold text-gray-800">
                {editingId ? "Edit Staff Details" : "Register New Staff"}
              </h2>
              <button onClick={() => setModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <FiX size={20} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Full Name *</label>
                <input
                  type="text"
                  placeholder="e.g. Ruwan Silva"
                  className="w-full border px-3 py-2 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Bakery Role / Station *</label>
                <select
                  className="w-full border px-3 py-2 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                  value={form.role}
                  onChange={(e) => setForm({ ...form, role: e.target.value })}
                >
                  {STAFF_ROLES.map((r) => (
                    <option key={r.value} value={r.value}>
                      {r.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Phone Number</label>
                  <input
                    type="text"
                    placeholder="077-1234567"
                    className="w-full border px-3 py-2 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Email</label>
                  <input
                    type="email"
                    placeholder="staff@bakemaster.com"
                    className="w-full border px-3 py-2 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Shift Start</label>
                  <input
                    type="time"
                    className="w-full border px-3 py-2 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                    value={form.shiftStart}
                    onChange={(e) => setForm({ ...form, shiftStart: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Shift End</label>
                  <input
                    type="time"
                    className="w-full border px-3 py-2 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                    value={form.shiftEnd}
                    onChange={(e) => setForm({ ...form, shiftEnd: e.target.value })}
                  />
                </div>
              </div>

              <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={form.active}
                  onChange={(e) => setForm({ ...form, active: e.target.checked })}
                  className="w-4 h-4 text-indigo-600 rounded"
                />
                <span className="font-medium">Active (Assigned to active floor shifts)</span>
              </label>

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
                  {editingId ? "Save Changes" : "Register Staff"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}