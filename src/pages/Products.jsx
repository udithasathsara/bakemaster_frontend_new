// src/pages/Products.jsx
import { useEffect, useState } from "react";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";
import {
  FiPlus,
  FiEdit3,
  FiTrash2,
  FiX,
  FiSearch,
  FiRefreshCw,
  FiPackage,
  FiLayers,
  FiEye,
} from "react-icons/fi";
import { showSuccess, showError, showConfirm } from "../services/swal";

const CATEGORIES = ["ALL", "CAKE", "CUPCAKE", "PASTRY", "BREAD", "COOKIE"];

export default function Products() {
  const [products, setProducts] = useState([]);
  const [ingredients, setIngredients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState("ALL");
  const [search, setSearch] = useState("");
  const [maxProducibleMap, setMaxProducibleMap] = useState({});

  const [modalOpen, setModalOpen] = useState(false);
  const [recipeModalOpen, setRecipeModalOpen] = useState(false);
  const [viewingProduct, setViewingProduct] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    name: "",
    category: "CAKE",
    sellingPrice: 0,
    costPrice: 0,
    shelfLifeDays: 3,
    description: "",
    imageUrl: "",
    active: true,
    recipeItems: [],
  });

  const { user } = useAuth();
  const canEdit = user?.isManager;
  const canDelete = user?.isAdmin;

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const url =
        selectedCategory === "ALL"
          ? "/products"
          : `/products?category=${selectedCategory}`;
      const [prodRes, ingRes] = await Promise.all([
        api.get(url),
        api.get("/inventory"),
      ]);
      setProducts(prodRes.data);
      setIngredients(ingRes.data);
    } catch (err) {
      showError("Failed to load products or ingredients");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, [selectedCategory]);

  const fetchMaxProducible = async (productId) => {
    try {
      const res = await api.get(`/products/${productId}/max-producible`);
      setMaxProducibleMap((prev) => ({
        ...prev,
        [productId]: res.data.maxProducibleUnits,
      }));
    } catch (err) {
      console.error(err);
    }
  };

  const openAdd = () => {
    setEditingId(null);
    setForm({
      name: "",
      category: "CAKE",
      sellingPrice: 0,
      costPrice: 0,
      shelfLifeDays: 3,
      description: "",
      imageUrl: "",
      active: true,
      recipeItems: [],
    });
    setModalOpen(true);
  };

  const openEdit = (prod) => {
    setEditingId(prod.id);
    setForm({
      name: prod.name,
      category: prod.category,
      sellingPrice: prod.sellingPrice,
      costPrice: prod.costPrice || 0,
      shelfLifeDays: prod.shelfLifeDays || 1,
      description: prod.description || "",
      imageUrl: prod.imageUrl || "",
      active: prod.active,
      recipeItems: (prod.recipeItems || []).map((ri) => ({
        ingredientId: ri.ingredientId || ri.ingredient?.id,
        ingredientName: ri.ingredientName || ri.ingredient?.name,
        quantityRequired: ri.quantityRequired,
        unit: ri.unit || ri.ingredient?.unit || "kg",
      })),
    });
    setModalOpen(true);
  };

  const openRecipeView = (prod) => {
    setViewingProduct(prod);
    fetchMaxProducible(prod.id);
    setRecipeModalOpen(true);
  };

  const addRecipeItem = () => {
    if (ingredients.length === 0) return;
    const firstIng = ingredients[0];
    setForm((prev) => ({
      ...prev,
      recipeItems: [
        ...prev.recipeItems,
        {
          ingredientId: firstIng.id,
          ingredientName: firstIng.name,
          quantityRequired: 0.1,
          unit: firstIng.unit,
        },
      ],
    }));
  };

  const updateRecipeItem = (index, field, value) => {
    const updated = [...form.recipeItems];
    if (field === "ingredientId") {
      const ing = ingredients.find((i) => i.id === Number(value));
      if (ing) {
        updated[index].ingredientId = ing.id;
        updated[index].ingredientName = ing.name;
        updated[index].unit = ing.unit;
      }
    } else {
      updated[index][field] = value;
    }
    setForm({ ...form, recipeItems: updated });
  };

  const removeRecipeItem = (index) => {
    setForm({
      ...form,
      recipeItems: form.recipeItems.filter((_, i) => i !== index),
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const sellingPriceNum = Number(form.sellingPrice);
    if (isNaN(sellingPriceNum) || sellingPriceNum <= 0) {
      showError("Please enter a valid selling price greater than 0");
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        name: form.name.trim(),
        category: form.category,
        sellingPrice: sellingPriceNum,
        costPrice: Number(form.costPrice) || 0.0,
        shelfLifeDays: Number(form.shelfLifeDays) || 3,
        description: form.description ? form.description.trim() : "",
        imageUrl: form.imageUrl ? form.imageUrl.trim() : "",
        active: form.active !== undefined ? form.active : true,
        recipeItems: (form.recipeItems || []).map((item) => ({
          ingredientId: Number(item.ingredientId),
          quantityRequired: Number(item.quantityRequired) || 0.0,
          unit: item.unit || "kg",
        })),
      };

      if (editingId) {
        await api.put(`/products/${editingId}`, payload);
        showSuccess("Product and recipe updated successfully");
      } else {
        await api.post("/products", payload);
        showSuccess("New product created successfully");
      }
      setModalOpen(false);
      fetchProducts();
    } catch (err) {
      showError(err.response?.data?.message || "Failed to save product");
    } finally {
      setSubmitting(false);
    }
  };

  const deleteProduct = async (id, name) => {
    const result = await showConfirm(
      `Are you sure you want to delete ${name}?`,
    );
    if (result.isConfirmed) {
      try {
        await api.delete(`/products/${id}`);
        showSuccess("Product removed");
        fetchProducts();
      } catch (err) {
        showError(err.response?.data?.message || "Failed to delete product");
      }
    }
  };

  const filteredProducts = products.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">
            Products & Recipes
          </h1>
          <p className="text-sm text-gray-500">
            Manage bakery menu items, bill of materials (recipes), and
            producible capacity
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchProducts}
            className="flex items-center gap-2 bg-white border border-gray-200 px-3 py-2 rounded-lg text-sm text-gray-700 hover:bg-gray-50 shadow-sm"
          >
            <FiRefreshCw className={loading ? "animate-spin" : ""} /> Refresh
          </button>
          {canEdit && (
            <button
              onClick={openAdd}
              className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 text-sm font-medium shadow-sm transition"
            >
              <FiPlus /> New Product
            </button>
          )}
        </div>
      </div>

      {/* Category Tabs & Search */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition ${
                selectedCategory === cat
                  ? "bg-indigo-600 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
        <div className="relative min-w-[240px]">
          <FiSearch className="absolute left-3 top-3 text-gray-400" />
          <input
            type="text"
            placeholder="Search products..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
          />
        </div>
      </div>

      {/* Product Grid */}
      {loading ? (
        <div className="text-center py-16 text-gray-400">
          Loading bakery products...
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="text-center py-16 text-gray-400 bg-white rounded-xl border border-gray-100">
          No products found in this category.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProducts.map((prod) => {
            const margin =
              prod.sellingPrice > 0
                ? (
                    ((prod.sellingPrice - (prod.costPrice || 0)) /
                      prod.sellingPrice) *
                    100
                  ).toFixed(0)
                : 0;

            return (
              <div
                key={prod.id}
                className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden flex flex-col justify-between hover:shadow-md transition"
              >
                {/* Product Image / Placeholder */}
                <div className="h-44 bg-gray-100 relative overflow-hidden">
                  {prod.imageUrl ? (
                    <img
                      src={prod.imageUrl}
                      alt={prod.name}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = "https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=500&auto=format&fit=crop&q=60";
                      }}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-4xl bg-indigo-50/50">
                      {prod.category === "BREAD"
                        ? "🥖"
                        : prod.category === "COOKIE"
                        ? "🍪"
                        : prod.category === "PASTRY"
                        ? "🥐"
                        : prod.category === "CUPCAKE"
                        ? "🧁"
                        : "🎂"}
                    </div>
                  )}
                  <span className="absolute top-3 left-3 bg-white/90 backdrop-blur-xs text-indigo-700 text-xs font-bold px-2.5 py-1 rounded-full shadow-xs">
                    {prod.category}
                  </span>
                  <span className="absolute top-3 right-3 bg-emerald-600 text-white text-xs font-bold px-2.5 py-1 rounded-full shadow-xs">
                    Rs.{Number(prod.sellingPrice).toFixed(2)}
                  </span>
                </div>

                {/* Content */}
                <div className="p-5 flex-1 flex flex-col justify-between">
                  <div>
                    <h3 className="font-bold text-gray-800 text-lg mb-1">
                      {prod.name}
                    </h3>
                    <p className="text-xs text-gray-500 line-clamp-2 mb-3">
                      {prod.description || "No description provided."}
                    </p>

                    {/* Metadata stats */}
                    <div className="grid grid-cols-2 gap-2 text-xs py-2 border-y border-gray-100 mb-3">
                      <div>
                        <span className="text-gray-400">Cost Price: </span>
                        <span className="font-semibold text-gray-700">
                          Rs.{Number(prod.costPrice || 0).toFixed(2)}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-400">Margin: </span>
                        <span className="font-semibold text-emerald-600">
                          {margin}%
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-400">Shelf Life: </span>
                        <span className="font-semibold text-gray-700">
                          {prod.shelfLifeDays} days
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-400">Recipe: </span>
                        <span className="font-semibold text-indigo-600">
                          {prod.recipeItems?.length || 0} ingredients
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Producible capacity check */}
                  <div className="flex items-center justify-between pt-1">
                    <div className="text-xs">
                      {maxProducibleMap[prod.id] !== undefined ? (
                        <span className="font-semibold text-indigo-700 bg-indigo-50 px-2 py-1 rounded">
                          Can bake: {maxProducibleMap[prod.id]} units
                        </span>
                      ) : (
                        <button
                          onClick={() => fetchMaxProducible(prod.id)}
                          className="text-xs text-indigo-600 hover:underline flex items-center gap-1 font-medium"
                        >
                          <FiLayers /> Check Capacity
                        </button>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => openRecipeView(prod)}
                        className="p-1.5 text-gray-600 hover:bg-gray-100 rounded-lg"
                        title="View Recipe / Bill of Materials"
                      >
                        <FiEye size={16} />
                      </button>
                      {canEdit && (
                        <button
                          onClick={() => openEdit(prod)}
                          className="p-1.5 text-amber-600 hover:bg-amber-50 rounded-lg"
                          title="Edit Product"
                        >
                          <FiEdit3 size={16} />
                        </button>
                      )}
                      {canDelete && (
                        <button
                          onClick={() => deleteProduct(prod.id, prod.name)}
                          className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg"
                          title="Delete Product"
                        >
                          <FiTrash2 size={16} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Recipe Details Modal */}
      {recipeModalOpen && viewingProduct && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <div>
                <h2 className="text-lg font-bold text-gray-800">
                  {viewingProduct.name} - Recipe Details
                </h2>
                <p className="text-xs text-gray-500">
                  Bill of Materials (Ingredients per unit)
                </p>
              </div>
              <button
                onClick={() => setRecipeModalOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <FiX size={20} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="bg-indigo-50 p-3 rounded-xl flex items-center justify-between text-xs text-indigo-900">
                <span className="font-medium">Current Producible Limit:</span>
                <span className="font-bold text-sm">
                  {maxProducibleMap[viewingProduct.id] ?? "Calculating..."}{" "}
                  units
                </span>
              </div>

              <div className="border border-gray-100 rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-gray-50 text-gray-500 font-semibold uppercase">
                    <tr>
                      <th className="p-3">Ingredient</th>
                      <th className="p-3">Quantity Required</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {!viewingProduct.recipeItems ||
                    viewingProduct.recipeItems.length === 0 ? (
                      <tr>
                        <td
                          colSpan={2}
                          className="p-4 text-center text-gray-400"
                        >
                          No ingredients mapped to this recipe yet.
                        </td>
                      </tr>
                    ) : (
                      viewingProduct.recipeItems.map((item, idx) => (
                        <tr key={idx} className="hover:bg-gray-50">
                          <td className="p-3 font-medium text-gray-800">
                            {item.ingredientName ||
                              `Ingredient #${item.ingredientId}`}
                          </td>
                          <td className="p-3 text-gray-600">
                            {item.quantityRequired} {item.unit}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
              <div className="text-right">
                <button
                  onClick={() => setRecipeModalOpen(false)}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-xs font-semibold hover:bg-gray-200"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit Product Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl shadow-xl overflow-hidden max-h-[90vh] flex flex-col">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <h2 className="text-lg font-bold text-gray-800">
                {editingId ? "Edit Product & Recipe" : "Create New Product"}
              </h2>
              <button
                onClick={() => setModalOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <FiX size={20} />
              </button>
            </div>

            <form
              onSubmit={handleSubmit}
              className="p-6 overflow-y-auto space-y-4 flex-1"
            >
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Product Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Red Velvet Cake"
                    className="w-full border px-3 py-2 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Category *
                  </label>
                  <select
                    className="w-full border px-3 py-2 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                    value={form.category}
                    onChange={(e) =>
                      setForm({ ...form, category: e.target.value })
                    }
                  >
                    <option value="CAKE">CAKE</option>
                    <option value="CUPCAKE">CUPCAKE</option>
                    <option value="PASTRY">PASTRY</option>
                    <option value="BREAD">BREAD</option>
                    <option value="COOKIE">COOKIE</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Selling Price (Rs.) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    placeholder="e.g. 45.00"
                    className="w-full border px-3 py-2 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                    value={form.sellingPrice}
                    onChange={(e) =>
                      setForm({ ...form, sellingPrice: e.target.value })
                    }
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Cost Price (Rs.)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="e.g. 15.00"
                    className="w-full border px-3 py-2 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                    value={form.costPrice}
                    onChange={(e) =>
                      setForm({ ...form, costPrice: e.target.value })
                    }
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Shelf Life (Days)
                  </label>
                  <input
                    type="number"
                    min="1"
                    placeholder="e.g. 3"
                    className="w-full border px-3 py-2 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                    value={form.shelfLifeDays}
                    onChange={(e) =>
                      setForm({ ...form, shelfLifeDays: e.target.value })
                    }
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Product Image
                </label>

                <div className="flex gap-4 items-start bg-gray-50 p-3 rounded-xl border border-gray-200/80">
                  <div className="w-20 h-20 rounded-lg bg-gray-200 border overflow-hidden shrink-0 flex items-center justify-center text-gray-400">
                    {form.imageUrl ? (
                      <img
                        src={form.imageUrl}
                        alt="Preview"
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.src = "https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=500&auto=format&fit=crop&q=60";
                        }}
                      />
                    ) : (
                      <span className="text-3xl">🍰</span>
                    )}
                  </div>

                  <div className="flex-1 space-y-2">
                    <input
                      type="text"
                      placeholder="Paste image URL (https://... or data:image/...)"
                      className="w-full border px-3 py-1.5 rounded-lg text-xs outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                      value={form.imageUrl}
                      onChange={(e) =>
                        setForm({ ...form, imageUrl: e.target.value })
                      }
                    />

                    <div className="flex flex-wrap items-center gap-2">
                      <label className="cursor-pointer bg-white border border-gray-300 hover:bg-gray-100 text-gray-700 px-2.5 py-1 rounded-md text-xs font-medium inline-flex items-center gap-1 shadow-2xs">
                        📁 Upload Photo
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              const reader = new FileReader();
                              reader.onload = (event) => {
                                const img = new Image();
                                img.onload = () => {
                                  const canvas = document.createElement("canvas");
                                  const maxDim = 500;
                                  let w = img.width;
                                  let h = img.height;
                                  if (w > maxDim || h > maxDim) {
                                    if (w > h) {
                                      h = Math.round((h * maxDim) / w);
                                      w = maxDim;
                                    } else {
                                      w = Math.round((w * maxDim) / h);
                                      h = maxDim;
                                    }
                                  }
                                  canvas.width = w;
                                  canvas.height = h;
                                  const ctx = canvas.getContext("2d");
                                  ctx.drawImage(img, 0, 0, w, h);
                                  const compressedDataUrl = canvas.toDataURL("image/jpeg", 0.8);
                                  setForm((prev) => ({ ...prev, imageUrl: compressedDataUrl }));
                                };
                                img.src = event.target.result;
                              };
                              reader.readAsDataURL(file);
                            }
                          }}
                        />
                      </label>

                      {form.imageUrl && (
                        <button
                          type="button"
                          onClick={() => setForm({ ...form, imageUrl: "" })}
                          className="text-xs text-rose-600 hover:text-rose-800 font-medium"
                        >
                          Clear
                        </button>
                      )}
                    </div>

                    {/* Quick presets */}
                    <div className="text-2xs text-gray-400 flex flex-wrap items-center gap-1">
                      <span>Presets:</span>
                      <button
                        type="button"
                        onClick={() =>
                          setForm({
                            ...form,
                            imageUrl:
                              "https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=500&auto=format&fit=crop&q=60",
                          })
                        }
                        className="px-1.5 py-0.5 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded"
                      >
                        🎂 Choc Cake
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setForm({
                            ...form,
                            imageUrl:
                              "https://images.unsplash.com/photo-1565958011703-44f9829ba187?w=500&auto=format&fit=crop&q=60",
                          })
                        }
                        className="px-1.5 py-0.5 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded"
                      >
                        🍰 Berry Cake
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setForm({
                            ...form,
                            imageUrl:
                              "https://images.unsplash.com/photo-1576618148400-f54bed99fcfd?w=500&auto=format&fit=crop&q=60",
                          })
                        }
                        className="px-1.5 py-0.5 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded"
                      >
                        🧁 Cupcake
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setForm({
                            ...form,
                            imageUrl:
                              "https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=500&auto=format&fit=crop&q=60",
                          })
                        }
                        className="px-1.5 py-0.5 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded"
                      >
                        🥐 Croissant
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setForm({
                            ...form,
                            imageUrl:
                              "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=500&auto=format&fit=crop&q=60",
                          })
                        }
                        className="px-1.5 py-0.5 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded"
                      >
                        🥖 Baguette
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setForm({
                            ...form,
                            imageUrl:
                              "https://images.unsplash.com/photo-1499636136210-6f4ee915583e?w=500&auto=format&fit=crop&q=60",
                          })
                        }
                        className="px-1.5 py-0.5 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded"
                      >
                        🍪 Cookie
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  rows={2}
                  placeholder="Brief description of the bakery item..."
                  className="w-full border px-3 py-2 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                  value={form.description}
                  onChange={(e) =>
                    setForm({ ...form, description: e.target.value })
                  }
                />
              </div>

              {/* Bill of Materials (Recipe Items) */}
              <div className="border-t border-gray-100 pt-4">
                <div className="flex justify-between items-center mb-3">
                  <div>
                    <h3 className="text-sm font-bold text-gray-800">
                      Recipe / Bill of Materials
                    </h3>
                    <p className="text-xs text-gray-500">
                      Raw ingredients needed per single product unit
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={addRecipeItem}
                    className="flex items-center gap-1 text-xs font-semibold text-indigo-600 bg-indigo-50 px-2.5 py-1.5 rounded-lg hover:bg-indigo-100"
                  >
                    <FiPlus /> Add Ingredient
                  </button>
                </div>

                {form.recipeItems.length === 0 ? (
                  <p className="text-xs text-gray-400 py-3 text-center bg-gray-50 rounded-lg">
                    No recipe ingredients added yet. Click &quot;Add
                    Ingredient&quot; above.
                  </p>
                ) : (
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {form.recipeItems.map((item, index) => (
                      <div
                        key={index}
                        className="flex items-center gap-2 bg-gray-50 p-2 rounded-lg"
                      >
                        <select
                          className="flex-1 border px-2 py-1.5 rounded text-xs bg-white"
                          value={item.ingredientId}
                          onChange={(e) =>
                            updateRecipeItem(
                              index,
                              "ingredientId",
                              e.target.value,
                            )
                          }
                        >
                          {ingredients.map((ing) => (
                            <option key={ing.id} value={ing.id}>
                              {ing.name} ({ing.unit})
                            </option>
                          ))}
                        </select>
                        <input
                          type="number"
                          step="any"
                          min="0.001"
                          placeholder="Qty"
                          className="w-24 border px-2 py-1.5 rounded text-xs bg-white"
                          value={item.quantityRequired}
                          onChange={(e) =>
                            updateRecipeItem(
                              index,
                              "quantityRequired",
                              e.target.value,
                            )
                          }
                          required
                        />
                        <span className="text-xs text-gray-500 w-12">
                          {item.unit}
                        </span>
                        <button
                          type="button"
                          onClick={() => removeRecipeItem(index)}
                          className="p-1 text-rose-500 hover:text-rose-700"
                        >
                          <FiX size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="pt-4 flex gap-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="flex-1 px-4 py-2 border rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50"
                >
                  {submitting
                    ? "Saving..."
                    : editingId
                      ? "Update Product"
                      : "Create Product"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
