// src/pages/Suppliers.jsx
import { useEffect, useState } from "react";
import api from "../services/api";
import toast from "react-hot-toast";
import { FiPlus, FiTrash2, FiEdit3, FiX } from "react-icons/fi";

export default function Suppliers() {
  const [suppliers, setSuppliers] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({
    name: "",
    contact: "",
    leadTimeDays: 0,
    pricingScore: 0,
  });

  const fetchData = () =>
    api.get("/suppliers").then((res) => setSuppliers(res.data));
  useEffect(() => {
    fetchData();
  }, []);

  const openAdd = () => {
    setEditingId(null);
    setForm({ name: "", contact: "", leadTimeDays: 0, pricingScore: 0 });
    setModalOpen(true);
  };
  const openEdit = (sup) => {
    setEditingId(sup.id);
    setForm({
      name: sup.name,
      contact: sup.contact,
      leadTimeDays: sup.leadTimeDays,
      pricingScore: sup.pricingScore,
    });
    setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingId) {
        await api.put(`/suppliers/${editingId}`, form);
        toast.success("Supplier updated");
      } else {
        await api.post("/suppliers", form);
        toast.success("Supplier added");
      }
      setModalOpen(false);
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || "Error");
    }
  };

  const deleteSupplier = async (id) => {
    if (!window.confirm("Delete supplier?")) return;
    await api.delete(`/suppliers/${id}`);
    toast.success("Deleted");
    fetchData();
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Suppliers</h1>
        <button
          onClick={openAdd}
          className="flex items-center gap-1 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700"
        >
          <FiPlus /> Add Supplier
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
              {editingId ? "Edit Supplier" : "New Supplier"}
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
                placeholder="Contact"
                className="w-full border p-2 rounded"
                value={form.contact}
                onChange={(e) => setForm({ ...form, contact: e.target.value })}
              />
              <input
                type="number"
                placeholder="Lead Time (days)"
                className="w-full border p-2 rounded"
                value={form.leadTimeDays}
                onChange={(e) =>
                  setForm({ ...form, leadTimeDays: +e.target.value })
                }
              />
              <input
                type="number"
                placeholder="Pricing Score (1-5)"
                className="w-full border p-2 rounded"
                value={form.pricingScore}
                onChange={(e) =>
                  setForm({ ...form, pricingScore: +e.target.value })
                }
                min="1"
                max="5"
                step="0.1"
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
              <th className="p-3 text-left">Contact</th>
              <th className="p-3 text-left">Lead Time</th>
              <th className="p-3 text-left">Rating</th>
              <th className="p-3 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {suppliers.map((s) => (
              <tr key={s.id} className="border-b hover:bg-gray-50">
                <td className="p-3">{s.id}</td>
                <td className="p-3 font-medium">{s.name}</td>
                <td className="p-3">{s.contact}</td>
                <td className="p-3">{s.leadTimeDays} days</td>
                <td className="p-3 text-yellow-500">
                  {"★".repeat(Math.round(s.pricingScore))} ({s.pricingScore})
                </td>
                <td className="p-3 flex gap-2">
                  <button
                    onClick={() => openEdit(s)}
                    className="p-1 text-blue-600 hover:bg-blue-100 rounded"
                  >
                    <FiEdit3 />
                  </button>
                  <button
                    onClick={() => deleteSupplier(s.id)}
                    className="p-1 text-red-600 hover:bg-red-100 rounded"
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
