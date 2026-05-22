import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";
import toast from "react-hot-toast";
import { FiPlus, FiTrash2, FiEdit3, FiShoppingCart, FiX } from "react-icons/fi";

export default function Inventory() {
  const [ingredients, setIngredients] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
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

  const handleAdd = async (e) => {
    e.preventDefault();
    try {
      await api.post("/inventory", form);
      toast.success("Ingredient added");
      setModalOpen(false);
      fetchData();
    } catch (err) {
      toast.error("Error");
    }
  };

  const updateStock = async (id, qty) => {
    if (!qty) return;
    await api.put(`/inventory/${id}/stock?qty=${qty}`);
    toast.success("Stock updated");
    fetchData();
  };

  const deleteIngredient = async (id) => {
    if (!window.confirm("Delete?")) return;
    await api.delete(`/inventory/${id}`);
    toast.success("Deleted");
    fetchData();
  };

  const generatePO = async () => {
    try {
      const res = await api.post("/inventory/generate-po");
      toast.success(`PO #${res.data.id} generated`);
    } catch (err) {
      toast.error(err.response?.data?.message || "Error");
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
            onClick={() => setModalOpen(true)}
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
            <h2 className="text-xl font-bold mb-4">New Ingredient</h2>
            <form onSubmit={handleAdd} className="space-y-3">
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
                placeholder="Unit (kg, litre)"
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
                Save
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
              <th className="p-3 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {ingredients.map((ing) => (
              <tr key={ing.id} className="border-b hover:bg-gray-50">
                <td className="p-3 font-medium">{ing.name}</td>
                <td className="p-3">
                  <div className="flex items-center gap-2">
                    <span>
                      {ing.quantity} {ing.unit}
                    </span>
                    <div className="flex-1 h-2 bg-gray-200 rounded-full max-w-[100px]">
                      <div
                        className={`h-2 rounded-full ${ing.quantity < ing.reorderThreshold ? "bg-red-500" : "bg-green-500"}`}
                        style={{
                          width: `${Math.min(100, (ing.quantity / (ing.reorderThreshold * 2)) * 100)}%`,
                        }}
                      ></div>
                    </div>
                  </div>
                </td>
                <td className="p-3 text-sm">{ing.expiryDate}</td>
                <td className="p-3 flex gap-2">
                  <input
                    type="number"
                    className="w-16 border p-1 text-sm"
                    placeholder="Qty"
                    id={`qty-${ing.id}`}
                  />
                  <button
                    onClick={() =>
                      updateStock(
                        ing.id,
                        document.getElementById(`qty-${ing.id}`).value,
                      )
                    }
                    className="p-1 text-blue-600 hover:bg-blue-100 rounded"
                  >
                    <FiEdit3 />
                  </button>
                  {isAdmin && (
                    <button
                      onClick={() => deleteIngredient(ing.id)}
                      className="p-1 text-red-600 hover:bg-red-100 rounded"
                    >
                      <FiTrash2 />
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
