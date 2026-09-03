import { useEffect, useState } from "react";
import api from "../services/api";

export default function PurchaseOrders() {
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [expandedId, setExpandedId] = useState(null);

  useEffect(() => {
    api.get("/purchase-orders").then((res) => setPurchaseOrders(res.data));
    api.get("/suppliers").then((res) => setSuppliers(res.data));
  }, []);

  const getSupplierName = (id) =>
    suppliers.find((s) => s.id === id)?.name || "Unknown";

  const toggleExpand = (id) => {
    setExpandedId(expandedId === id ? null : id);
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Purchase Orders</h1>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 text-gray-600">
            <tr>
              <th className="p-3 text-left">PO #</th>
              <th className="p-3 text-left">Supplier</th>
              <th className="p-3 text-left">Date</th>
              <th className="p-3 text-left">Status</th>
              <th className="p-3 text-left">Items</th>
            </tr>
          </thead>
          <tbody>
            {purchaseOrders.map((po) => (
              <>
                <tr
                  key={po.id}
                  className="border-b hover:bg-gray-50 cursor-pointer"
                  onClick={() => toggleExpand(po.id)}
                >
                  <td className="p-3 font-medium">#{po.id}</td>
                  <td className="p-3">{getSupplierName(po.supplierId)}</td>
                  <td className="p-3">{po.orderDate}</td>
                  <td className="p-3">
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-semibold ${
                        po.status === "SENT"
                          ? "bg-green-100 text-green-800"
                          : "bg-yellow-100 text-yellow-800"
                      }`}
                    >
                      {po.status}
                    </span>
                  </td>
                  <td className="p-3 text-sm">{po.items.length} item(s)</td>
                </tr>
                {expandedId === po.id && (
                  <tr key={`exp-${po.id}`}>
                    <td colSpan={5} className="p-4 bg-gray-50">
                      <h4 className="font-semibold mb-2">
                        Ordered Ingredients
                      </h4>
                      <ul className="space-y-1 text-sm">
                        {po.items.map((item) => (
                          <li key={item.id}>
                            • {item.ingredientName} – {item.quantity}
                          </li>
                        ))}
                      </ul>
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
