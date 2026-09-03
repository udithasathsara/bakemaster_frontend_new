// src/pages/Inventory.jsx
import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";
import { FiPlus, FiTrash2, FiEdit3, FiShoppingCart, FiX } from "react-icons/fi";
import { showSuccess, showError, showConfirm } from "../services/swal";

export default function Inventory() {
  const [ingredients, setIngredients] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({
    name: "",
    quantity: 0,
    unit: "",
    expiryDate: "",
    reorderThreshold: 0,
  });
  const { isAdmin } = useAuth();

  const fetchData = () =>
    api.get("/inventory").then((res) => setIngredients(res.data));

  useEffect(() => {
    fetchData();
  }, []);

  const openAdd = () => {
    setEditingId(null);
    setForm({
      name: "",
      quantity: 0,
      unit: "",
      expiryDate: "",
      reorderThreshold: 0,
    });
    setModalOpen(true);
  };

  const openEdit = (ing) => {
    setEditingId(ing.id);
    setForm({
      name: ing.name,
      quantity: ing.quantity,
      unit: ing.unit,
      expiryDate: ing.expiryDate,
      reorderThreshold: ing.reorderThreshold,
    });
    setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingId) {
        await api.put(`/inventory/${editingId}/stock?qty=${form.quantity}`);
        showSuccess("Ingredient updated");
      } else {
        await api.post("/inventory", form);
        showSuccess("Ingredient added");
      }
      setModalOpen(false);
      fetchData();
    } catch (err) {
      showError(err.response?.data?.message || "Error");
    }
  };

  const updateStockQuick = async (id, qty) => {
    if (!qty) return;
    await api.put(`/inventory/${id}/stock?qty=${qty}`);
    showSuccess("Stock updated");
    fetchData();
  };

  const deleteIngredient = async (id) => {
    const result = await showConfirm("Delete this ingredient?");
    if (result.isConfirmed) {
      await api.delete(`/inventory/${id}`);
      showSuccess("Deleted");
      fetchData();
    }
  };

  const generatePO = async () => {
    try {
      const res = await api.post("/inventory/generate-po");
      showSuccess(`PO #${res.data.id} generated`);
    } catch (err) {
      showError(err.response?.data?.message || "Error");
    }
  };

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Inventory</h1>
        <div className="flex gap-2">
          {isAdmin && (
            <button
              onClick={generatePO}
              className="flex items-center gap-1 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
            >
              <FiShoppingCart /> Generate PO
            </button>
          )}
          <button
            onClick={openAdd}
            className="flex items-center gap-1 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700"
          >
            <FiPlus /> Add Ingredient
          </button>
        </div>
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
              {editingId ? "Edit Ingredient" : "New Ingredient"}
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
                type="number"
                placeholder="Quantity"
                className="w-full border p-2 rounded"
                value={form.quantity}
                onChange={(e) =>
                  setForm({ ...form, quantity: +e.target.value })
                }
                required
              />
              <input
                type="text"
                placeholder="Unit"
                className="w-full border p-2 rounded"
                value={form.unit}
                onChange={(e) => setForm({ ...form, unit: e.target.value })}
                required
              />
              <input
                type="date"
                className="w-full border p-2 rounded"
                value={form.expiryDate}
                onChange={(e) =>
                  setForm({ ...form, expiryDate: e.target.value })
                }
                required
              />
              <input
                type="number"
                placeholder="Reorder threshold"
                className="w-full border p-2 rounded"
                value={form.reorderThreshold}
                onChange={(e) =>
                  setForm({ ...form, reorderThreshold: +e.target.value })
                }
                required
              />
              <button
                type="submit"
                className="w-full bg-indigo-600 text-white py-2 rounded-lg hover:bg-indigo-700"
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
              <th className="p-3 text-left">Name</th>
              <th className="p-3 text-left">Stock</th>
              <th className="p-3 text-left">Expiry</th>
              <th className="p-3 text-left">Status</th>
              <th className="p-3 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {ingredients.map((ing) => {
              const lowStock = ing.quantity <= ing.reorderThreshold;
              return (
                <tr key={ing.id} className="border-b hover:bg-gray-50">
                  <td className="p-3 font-medium">{ing.name}</td>
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      <span>
                        {ing.quantity} {ing.unit}
                      </span>
                      <div className="flex-1 h-2 bg-gray-200 rounded-full max-w-[100px]">
                        <div
                          className={`h-2 rounded-full ${lowStock ? "bg-red-500" : "bg-green-500"}`}
                          style={{
                            width: `${Math.min(100, (ing.quantity / (ing.reorderThreshold * 2)) * 100)}%`,
                          }}
                        ></div>
                      </div>
                    </div>
                  </td>
                  <td className="p-3 text-sm">{ing.expiryDate}</td>
                  <td className="p-3">
                    {lowStock ? (
                      <span className="text-red-600 text-xs font-semibold">
                        ⚠ Low
                      </span>
                    ) : (
                      <span className="text-green-600 text-xs">OK</span>
                    )}
                  </td>
                  <td className="p-3">
                    <div className="flex gap-2 items-center">
                      <input
                        type="number"
                        className="w-16 border p-1 text-sm"
                        placeholder="Qty"
                        id={`qty-${ing.id}`}
                      />
                      <button
                        onClick={() =>
                          updateStockQuick(
                            ing.id,
                            document.getElementById(`qty-${ing.id}`).value,
                          )
                        }
                        className="p-1 text-blue-600 hover:bg-blue-100 rounded"
                        title="Quick update stock"
                      >
                        <FiEdit3 />
                      </button>
                      {isAdmin && (
                        <>
                          <button
                            onClick={() => openEdit(ing)}
                            className="p-1 text-yellow-600 hover:bg-yellow-100 rounded"
                            title="Edit"
                          >
                            <FiEdit3 />
                          </button>
                          <button
                            onClick={() => deleteIngredient(ing.id)}
                            className="p-1 text-red-600 hover:bg-red-100 rounded"
                            title="Delete"
                          >
                            <FiTrash2 />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
