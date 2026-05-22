// src/pages/Dashboard.jsx
import { useEffect, useState } from "react";
import api from "../services/api";
import {
  FiAlertTriangle,
  FiClock,
  FiShoppingCart,
  FiLoader,
} from "react-icons/fi";

export default function Dashboard() {
  const [data, setData] = useState(null);

  useEffect(() => {
    api
      .get("/dashboard")
      .then((res) => setData(res.data))
      .catch(() => {});
  }, []);

  if (!data)
    return (
      <div className="flex justify-center p-12">
        <div className="animate-spin h-8 w-8 border-4 border-indigo-500 border-t-transparent rounded-full"></div>
      </div>
    );

  const stats = [
    {
      label: "Low Stock Items",
      value: data.lowStockAlerts.length,
      icon: FiAlertTriangle,
      color: "bg-amber-100 text-amber-700",
    },
    {
      label: "Expiring Soon",
      value: data.expiryAlerts.length,
      icon: FiClock,
      color: "bg-red-100 text-red-700",
    },
    {
      label: "Pending Orders",
      value: data.pendingOrders,
      icon: FiShoppingCart,
      color: "bg-blue-100 text-blue-700",
    },
    {
      label: "In Progress",
      value: data.ordersInProgress,
      icon: FiLoader,
      color: "bg-purple-100 text-purple-700",
    },
  ];

  // Dummy top products
  const topProducts = [
    { name: "Chocolate Cake", sold: 45 },
    { name: "Croissant", sold: 32 },
    { name: "Vanilla Cupcake", sold: 28 },
    { name: "Bagel", sold: 15 },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Dashboard Overview</h1>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        {stats.map((s, i) => (
          <div
            key={i}
            className="bg-white p-5 rounded-xl shadow-sm flex items-center gap-4"
          >
            <div className={`p-3 rounded-lg ${s.color}`}>
              <s.icon size={24} />
            </div>
            <div>
              <h3 className="text-2xl font-bold">{s.value}</h3>
              <p className="text-sm text-gray-500">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Alerts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        {data.lowStockAlerts.length > 0 && (
          <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-r-lg">
            <h3 className="font-bold text-amber-800 flex items-center gap-2">
              <FiAlertTriangle /> Low Stock Alerts
            </h3>
            <ul className="mt-2 list-disc ml-4 text-sm">
              {data.lowStockAlerts.map((i) => (
                <li key={i.id}>
                  {i.name} – {i.quantity} {i.unit}
                </li>
              ))}
            </ul>
          </div>
        )}
        {data.expiryAlerts.length > 0 && (
          <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r-lg">
            <h3 className="font-bold text-red-800 flex items-center gap-2">
              <FiClock /> Expiring Soon
            </h3>
            <ul className="mt-2 list-disc ml-4 text-sm">
              {data.expiryAlerts.map((i) => (
                <li key={i.id}>
                  {i.name} expires {i.expiryDate}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Top Products Chart */}
      <div className="bg-white p-6 rounded-xl shadow-sm">
        <h2 className="text-lg font-semibold mb-4">Top Selling Products</h2>
        <div className="space-y-3">
          {topProducts.map((p, i) => (
            <div key={i} className="flex items-center gap-3">
              <span className="w-32 text-sm text-gray-600">{p.name}</span>
              <div className="flex-1 h-4 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-indigo-500 rounded-full"
                  style={{ width: `${(p.sold / 50) * 100}%` }}
                ></div>
              </div>
              <span className="text-sm font-medium">{p.sold}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
