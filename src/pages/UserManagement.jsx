// src/pages/UserManagement.jsx
import { useEffect, useState, useMemo } from "react";
import api from "../services/api";
import LoadingSpinner from "../components/LoadingSpinner";
import Pagination from "../components/Pagination";
import {
  FiPlus,
  FiTrash2,
  FiEdit3,
  FiX,
  FiUserCheck,
  FiUserX,
  FiSearch,
  FiUsers,
  FiShield,
  FiCheckCircle,
  FiEye,
  FiEyeOff,
  FiRefreshCw,
  FiMail,
  FiPhone,
} from "react-icons/fi";
import { showSuccess, showError, showConfirm } from "../services/swal";
import { useAuth } from "../context/AuthContext";

const ROLES = [
  { value: "ROLE_SUPER_ADMIN", label: "Super Admin", color: "bg-purple-100 text-purple-800 border-purple-200" },
  { value: "ROLE_ADMIN", label: "Admin", color: "bg-blue-100 text-blue-800 border-blue-200" },
  { value: "ROLE_MANAGER", label: "Manager", color: "bg-amber-100 text-amber-800 border-amber-200" },
  { value: "ROLE_STAFF", label: "Staff", color: "bg-emerald-100 text-emerald-800 border-emerald-200" },
];

export default function UserManagement() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedRole, setSelectedRole] = useState("ALL");
  const [selectedStatus, setSelectedStatus] = useState("ALL");

  // Add Modal state
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [form, setForm] = useState({
    username: "",
    password: "",
    role: "ROLE_STAFF",
    fullName: "",
    email: "",
    phone: "",
  });

  // Edit Modal state
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [editForm, setEditForm] = useState({
    fullName: "",
    email: "",
    phone: "",
    role: "ROLE_STAFF",
    password: "",
  });

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  const { isSuperAdmin, isAdmin } = useAuth();
  const canManage = isSuperAdmin || isAdmin;

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await api.get("/users");
      setUsers(res.data);
    } catch (err) {
      showError(err.response?.data?.message || "Failed to load users from backend");
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await api.post("/users", form);
      showSuccess("User created successfully!");
      setAddModalOpen(false);
      setForm({
        username: "",
        password: "",
        role: "ROLE_STAFF",
        fullName: "",
        email: "",
        phone: "",
      });
      fetchUsers();
    } catch (err) {
      showError(err.response?.data?.message || "Error creating user");
    }
  };

  const openEditModal = (user) => {
    setEditingUser(user);
    setEditForm({
      fullName: user.fullName || "",
      email: user.email || "",
      phone: user.phone || "",
      role: user.role,
      password: "",
    });
    setEditModalOpen(true);
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        fullName: editForm.fullName,
        email: editForm.email,
        phone: editForm.phone,
        role: editForm.role,
      };
      if (editForm.password && editForm.password.trim().length >= 6) {
        payload.password = editForm.password;
      }
      await api.put(`/users/${editingUser.id}`, payload);
      showSuccess("User updated successfully!");
      setEditModalOpen(false);
      fetchUsers();
    } catch (err) {
      showError(err.response?.data?.message || "Error updating user");
    }
  };

  const updateRoleDirectly = async (id, newRole) => {
    try {
      await api.put(`/users/${id}/role`, { role: newRole });
      showSuccess("User role updated");
      fetchUsers();
    } catch (err) {
      showError(err.response?.data?.message || "Error updating role");
    }
  };

  const toggleStatus = async (user) => {
    const action = user.active ? "deactivate" : "activate";
    const result = await showConfirm(`Are you sure you want to ${action} user "${user.username}"?`);
    if (result.isConfirmed) {
      try {
        await api.put(`/users/${user.id}/toggle-status`);
        showSuccess(`User status ${action}d!`);
        fetchUsers();
      } catch (err) {
        showError(err.response?.data?.message || "Error updating user status");
      }
    }
  };

  const deleteUser = async (user) => {
    const result = await showConfirm(
      `Permanently delete user "${user.username}"? This action cannot be undone.`
    );
    if (result.isConfirmed) {
      try {
        await api.delete(`/users/${user.id}`);
        showSuccess("User deleted permanently");
        fetchUsers();
      } catch (err) {
        showError(err.response?.data?.message || "Error deleting user");
      }
    }
  };

  // Filter & Search
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const searchLower = search.toLowerCase();
      const matchSearch =
        u.username.toLowerCase().includes(searchLower) ||
        (u.fullName && u.fullName.toLowerCase().includes(searchLower)) ||
        (u.email && u.email.toLowerCase().includes(searchLower)) ||
        (u.phone && u.phone.toLowerCase().includes(searchLower));

      if (!matchSearch) return false;
      if (selectedRole !== "ALL" && u.role !== selectedRole) return false;
      if (selectedStatus === "ACTIVE" && !u.active) return false;
      if (selectedStatus === "INACTIVE" && u.active) return false;
      return true;
    });
  }, [users, search, selectedRole, selectedStatus]);

  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);
  const paginatedUsers = filteredUsers.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const getRoleMeta = (roleVal) => {
    return (
      ROLES.find((r) => r.value === roleVal) || {
        label: roleVal,
        color: "bg-gray-100 text-gray-800 border-gray-200",
      }
    );
  };

  if (loading && users.length === 0) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">User Management & Access Control</h1>
          <p className="text-sm text-gray-500">
            Manage system administrators, managers, and kitchen staff authentication & roles
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchUsers}
            className="flex items-center gap-2 bg-white border border-gray-200 px-3 py-2 rounded-lg text-sm text-gray-700 hover:bg-gray-50 shadow-xs"
          >
            <FiRefreshCw className={loading ? "animate-spin" : ""} /> Refresh
          </button>
          {canManage && (
            <button
              onClick={() => setAddModalOpen(true)}
              className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 text-sm font-medium shadow-sm transition"
            >
              <FiPlus /> Add New User
            </button>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl shadow-xs border border-gray-100 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Total Users</p>
            <h3 className="text-2xl font-bold text-gray-800 mt-1">{users.length}</h3>
            <p className="text-2xs text-gray-400 mt-0.5">Registered accounts</p>
          </div>
          <div className="p-3 rounded-xl bg-indigo-50 text-indigo-600">
            <FiUsers size={22} />
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl shadow-xs border border-gray-100 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Administrators</p>
            <h3 className="text-2xl font-bold text-blue-600 mt-1">
              {users.filter((u) => u.role === "ROLE_ADMIN" || u.role === "ROLE_SUPER_ADMIN").length}
            </h3>
            <p className="text-2xs text-gray-400 mt-0.5">Admins & Super Admins</p>
          </div>
          <div className="p-3 rounded-xl bg-blue-50 text-blue-600">
            <FiShield size={22} />
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl shadow-xs border border-gray-100 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Managers & Staff</p>
            <h3 className="text-2xl font-bold text-emerald-600 mt-1">
              {users.filter((u) => u.role === "ROLE_MANAGER" || u.role === "ROLE_STAFF").length}
            </h3>
            <p className="text-2xs text-gray-400 mt-0.5">Bakery floor team</p>
          </div>
          <div className="p-3 rounded-xl bg-emerald-50 text-emerald-600">
            <FiCheckCircle size={22} />
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl shadow-xs border border-gray-100 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Active Status</p>
            <h3 className="text-2xl font-bold text-gray-800 mt-1">
              {users.filter((u) => u.active).length}{" "}
              <span className="text-xs text-gray-400 font-normal">/ {users.length}</span>
            </h3>
            <p className="text-2xs text-gray-400 mt-0.5">Enabled login credentials</p>
          </div>
          <div className="p-3 rounded-xl bg-purple-50 text-purple-600">
            <FiUserCheck size={22} />
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl shadow-xs border border-gray-100 flex flex-wrap items-center justify-between gap-4">
        <div className="relative flex-1 min-w-[240px]">
          <FiSearch className="absolute left-3 top-3 text-gray-400" />
          <input
            type="text"
            placeholder="Search by username, name, email, or phone..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full pl-9 pr-4 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Role filter */}
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
            {ROLES.map((r) => (
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

          {/* Status filter */}
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
            <option value="INACTIVE">Inactive Only</option>
          </select>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-xl shadow-xs border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead className="bg-gray-50 text-xs font-semibold text-gray-500 uppercase tracking-wider border-b border-gray-100">
              <tr>
                <th className="p-4">User</th>
                <th className="p-4">Contact Info</th>
                <th className="p-4">System Role</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {paginatedUsers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-12 text-gray-400">
                    No users found matching current filters.
                  </td>
                </tr>
              ) : (
                paginatedUsers.map((user) => {
                  const roleMeta = getRoleMeta(user.role);
                  const initials = (user.fullName || user.username)
                    .split(" ")
                    .map((n) => n[0])
                    .join("")
                    .slice(0, 2)
                    .toUpperCase();

                  return (
                    <tr key={user.id} className="hover:bg-gray-50/70 transition">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center text-xs shadow-xs">
                            {initials}
                          </div>
                          <div>
                            <div className="font-semibold text-gray-800 flex items-center gap-2">
                              {user.fullName || user.username}
                              {user.fullName && (
                                <span className="text-xs text-gray-400 font-normal">(@{user.username})</span>
                              )}
                            </div>
                            <div className="text-2xs text-gray-400">ID #{user.id}</div>
                          </div>
                        </div>
                      </td>

                      <td className="p-4 text-xs text-gray-600">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-1 text-gray-700">
                            <FiMail size={12} className="text-gray-400" />
                            {user.email || "No email"}
                          </div>
                          {user.phone && (
                            <div className="flex items-center gap-1 text-gray-500">
                              <FiPhone size={12} className="text-gray-400" />
                              {user.phone}
                            </div>
                          )}
                        </div>
                      </td>

                      <td className="p-4">
                        {canManage ? (
                          <select
                            value={user.role}
                            onChange={(e) => updateRoleDirectly(user.id, e.target.value)}
                            className="border text-xs px-2 py-1 rounded bg-white font-semibold text-gray-700 outline-none focus:ring-1 focus:ring-indigo-500"
                          >
                            {ROLES.map((r) => (
                              <option key={r.value} value={r.value}>
                                {r.label}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold border ${roleMeta.color}`}>
                            {roleMeta.label}
                          </span>
                        )}
                      </td>

                      <td className="p-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                            user.active
                              ? "bg-emerald-100 text-emerald-800"
                              : "bg-rose-100 text-rose-800"
                          }`}
                        >
                          {user.active ? <FiUserCheck size={12} /> : <FiUserX size={12} />}
                          {user.active ? "Active" : "Inactive"}
                        </span>
                      </td>

                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {canManage && (
                            <button
                              onClick={() => openEditModal(user)}
                              className="p-1.5 text-amber-600 hover:bg-amber-50 rounded-lg transition"
                              title="Edit User Details"
                            >
                              <FiEdit3 size={16} />
                            </button>
                          )}

                          {canManage && (
                            <button
                              onClick={() => toggleStatus(user)}
                              className={`p-1.5 rounded-lg transition ${
                                user.active
                                  ? "text-gray-500 hover:bg-gray-100"
                                  : "text-emerald-600 hover:bg-emerald-50"
                              }`}
                              title={user.active ? "Deactivate User" : "Activate User"}
                            >
                              {user.active ? <FiUserX size={16} /> : <FiUserCheck size={16} />}
                            </button>
                          )}

                          {isSuperAdmin && (
                            <button
                              onClick={() => deleteUser(user)}
                              className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition"
                              title="Delete User"
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

      {totalPages > 1 && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
        />
      )}

      {/* Modal: Add User */}
      {addModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <h2 className="text-lg font-bold text-gray-800">Create New System User</h2>
              <button onClick={() => setAddModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <FiX size={20} />
              </button>
            </div>
            <form onSubmit={handleCreate} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Username *</label>
                <input
                  type="text"
                  placeholder="e.g. jdoe"
                  className="w-full border px-3 py-2 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                  value={form.username}
                  onChange={(e) => setForm({ ...form, username: e.target.value })}
                  required
                  minLength={3}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Password * (min 6 chars)</label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    className="w-full border px-3 py-2 pr-10 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    required
                    minLength={6}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <FiEyeOff size={16} /> : <FiEye size={16} />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">System Role *</label>
                <select
                  className="w-full border px-3 py-2 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                  value={form.role}
                  onChange={(e) => setForm({ ...form, role: e.target.value })}
                >
                  {ROLES.map((r) => (
                    <option key={r.value} value={r.value}>
                      {r.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Full Name</label>
                <input
                  type="text"
                  placeholder="e.g. John Doe"
                  className="w-full border px-3 py-2 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                  value={form.fullName}
                  onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Email</label>
                  <input
                    type="email"
                    placeholder="user@bakemaster.com"
                    className="w-full border px-3 py-2 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Phone</label>
                  <input
                    type="text"
                    placeholder="e.g. 0771234567"
                    className="w-full border px-3 py-2 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  />
                </div>
              </div>

              <div className="pt-3 flex gap-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setAddModalOpen(false)}
                  className="flex-1 px-4 py-2 border rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 shadow-sm"
                >
                  Create Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Edit User */}
      {editModalOpen && editingUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <h2 className="text-lg font-bold text-gray-800">Edit User: @{editingUser.username}</h2>
              <button onClick={() => setEditModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <FiX size={20} />
              </button>
            </div>
            <form onSubmit={handleUpdate} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Full Name</label>
                <input
                  type="text"
                  className="w-full border px-3 py-2 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                  value={editForm.fullName}
                  onChange={(e) => setEditForm({ ...editForm, fullName: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  className="w-full border px-3 py-2 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                  value={editForm.email}
                  onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Phone</label>
                <input
                  type="text"
                  className="w-full border px-3 py-2 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                  value={editForm.phone}
                  onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">System Role</label>
                <select
                  className="w-full border px-3 py-2 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                  value={editForm.role}
                  onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
                >
                  {ROLES.map((r) => (
                    <option key={r.value} value={r.value}>
                      {r.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Reset Password <span className="text-gray-400 font-normal">(Leave blank to keep current)</span>
                </label>
                <input
                  type="password"
                  placeholder="New password (optional)"
                  className="w-full border px-3 py-2 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                  value={editForm.password}
                  onChange={(e) => setEditForm({ ...editForm, password: e.target.value })}
                  minLength={6}
                />
              </div>

              <div className="pt-3 flex gap-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setEditModalOpen(false)}
                  className="flex-1 px-4 py-2 border rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 shadow-sm"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}