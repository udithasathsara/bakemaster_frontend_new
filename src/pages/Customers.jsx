// src/pages/Customers.jsx
import { useEffect, useState } from "react";
import api from "../services/api";
import { FiChevronDown, FiChevronUp } from "react-icons/fi";

export default function Customers() {
  const [customers, setCustomers] = useState([]);
  const [expandedId, setExpandedId] = useState(null);
  const [orders, setOrders] = useState([]);

  useEffect(() => {
    api.get("/customers").then((res) => setCustomers(res.data));
  }, []);

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
      <h1 className="text-2xl font-bold mb-6">Customers</h1>
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 text-gray-600">
            <tr>
              <th className="p-3 text-left">ID</th>
              <th className="p-3 text-left">Name</th>
              <th className="p-3 text-left">Phone</th>
              <th className="p-3 text-left">Email</th>
              <th className="p-3 text-left">Loyalty</th>
              <th className="p-3 text-left"></th>
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
                  <td className="p-3">
                    {expandedId === c.id ? <FiChevronUp /> : <FiChevronDown />}
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
