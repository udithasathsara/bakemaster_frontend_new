import { useEffect, useState } from "react";
import api from "../services/api";

export default function Suppliers() {
  const [suppliers, setSuppliers] = useState([]);
  useEffect(() => {
    api.get("/suppliers").then((res) => setSuppliers(res.data));
  }, []);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Suppliers</h1>
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 text-gray-600">
            <tr>
              <th className="p-3 text-left">ID</th>
              <th className="p-3 text-left">Name</th>
              <th className="p-3 text-left">Contact</th>
              <th className="p-3 text-left">Lead Time (Days)</th>
              <th className="p-3 text-left">Rating</th>
            </tr>
          </thead>
          <tbody>
            {suppliers.map((s) => (
              <tr key={s.id} className="border-b hover:bg-gray-50">
                <td className="p-3">{s.id}</td>
                <td className="p-3 font-medium">{s.name}</td>
                <td className="p-3">{s.contact}</td>
                <td className="p-3">{s.leadTimeDays}</td>
                <td className="p-3 text-yellow-500">
                  {"★".repeat(Math.round(s.pricingScore))} ({s.pricingScore})
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
