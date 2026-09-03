// src/pages/Customers.jsx
import { useEffect, useState } from "react";
import api from "../services/api";
import {
  FiPlus,
  FiTrash2,
  FiEdit3,
  FiChevronDown,
  FiChevronUp,
  FiX,
} from "react-icons/fi";
import { showSuccess, showError, showConfirm } from "../services/swal";

export default function Customers() {
  const [customers, setCustomers] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({
    name: "",
    phone: "",
    email: "",
    loyaltyPoints: 0,
  });
  const [expandedId, setExpandedId] = useState(null);
  const [orders, setOrders] = useState([]);

  const fetchCustomers = () =>
    api.get("/customers").then((res) => setCustomers(res.data));
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
      phone: cust.phone,
      email: cust.email,
      loyaltyPoints: cust.loyaltyPoints,
    });
    setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingId) {
        await api.put(`/customers/${editingId}`, form);
        showSuccess("Customer updated");
      } else {
        await api.post("/customers", form);
        showSuccess("Customer added");
      }
      setModalOpen(false);
      fetchCustomers();
    } catch (err) {
      showError(err.response?.data?.message || "Error");
    }
  };

  const deleteCustomer = async (id) => {
    const result = await showConfirm("Delete this customer?");
    if (result.isConfirmed) {
      try {
        await api.delete(`/customers/${id}`);
        showSuccess("Customer deleted");
        fetchCustomers();
      } catch (err) {
        showError(err.response?.data?.message || "Error deleting");
      }
    }
  };

  const toggleExpand = async (customer) => {
    if (expandedId === customer.id) {
      setExpandedId(null);
      return;
    }
    setExpandedId(customer.id);
    const res = await api.get(`/customers/${customer.id}/orders`);
    setOrders(res.data);
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Customers</h1>
        <button
          onClick={openAdd}
          className="flex items-center gap-1 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700"
        >
          <FiPlus /> Add Customer
        </button>
      </div>

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-xl w-full max-w-md shadow-lg relative">
            <button
              onClick={() => setModalOpen(false)}
              className="absolute top-2 right-2 text-gray-500 hover:text-black"
            >
              <FiX size={20} />
            </button>
            <h2 className="text-xl font-bold mb-4">
              {editingId ? "Edit Customer" : "New Customer"}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-3">
              <input
                type="text"
                placeholder="Name"
                className="w-full border p-2 rounded"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
              />
              <input
                type="text"
                placeholder="Phone"
                className="w-full border p-2 rounded"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />
              <input
                type="email"
                placeholder="Email"
                className="w-full border p-2 rounded"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
              <input
                type="number"
                placeholder="Loyalty Points"
                className="w-full border p-2 rounded"
                value={form.loyaltyPoints}
                onChange={(e) =>
                  setForm({ ...form, loyaltyPoints: +e.target.value })
                }
              />
              <button
                type="submit"
                className="w-full bg-indigo-600 text-white py-2 rounded-lg"
              >
                {editingId ? "Update" : "Save"}
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
              <th className="p-3 text-left">Name</th>
              <th className="p-3 text-left">Phone</th>
              <th className="p-3 text-left">Email</th>
              <th className="p-3 text-left">Loyalty</th>
              <th className="p-3 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {customers.map((c) => (
              <>
                <tr
                  key={c.id}
                  className="border-b hover:bg-gray-50 cursor-pointer"
                  onClick={() => toggleExpand(c)}
                >
                  <td className="p-3">{c.id}</td>
                  <td className="p-3 font-medium">{c.name}</td>
                  <td className="p-3">{c.phone}</td>
                  <td className="p-3">{c.email}</td>
                  <td className="p-3">⭐ {c.loyaltyPoints}</td>
                  <td className="p-3" onClick={(e) => e.stopPropagation()}>
                    <div className="flex gap-2">
                      <button
                        onClick={() => openEdit(c)}
                        className="p-1 text-blue-600 hover:bg-blue-100 rounded"
                      >
                        <FiEdit3 />
                      </button>
                      <button
                        onClick={() => deleteCustomer(c.id)}
                        className="p-1 text-red-600 hover:bg-red-100 rounded"
                      >
                        <FiTrash2 />
                      </button>
                      <span className="ml-2">
                        {expandedId === c.id ? (
                          <FiChevronUp />
                        ) : (
                          <FiChevronDown />
                        )}
                      </span>
                    </div>
                  </td>
                </tr>
                {expandedId === c.id && (
                  <tr key={`exp-${c.id}`}>
                    <td colSpan={6} className="p-4 bg-gray-50">
                      <h4 className="font-semibold mb-2">Order History</h4>
                      {orders.length ? (
                        <div className="space-y-2">
                          {orders.map((o) => (
                            <div
                              key={o.id}
                              className="bg-white p-3 rounded shadow-sm flex justify-between"
                            >
                              <span>
                                Order #{o.id} – {o.status} ({o.orderDate})
                              </span>
                              <ul className="text-sm">
                                {o.items.map((i) => (
                                  <li key={i.id}>
                                    • {i.productName} x{i.quantity}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-gray-500">No orders found.</p>
                      )}
                    </td>
                  </tr>
                )}
              </>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
