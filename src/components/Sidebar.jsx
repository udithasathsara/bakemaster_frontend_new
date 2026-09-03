import { NavLink } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  FiHome,
  FiPackage,
  FiFileText,
  FiTrello,
  FiUsers,
  FiTruck,
  FiLogOut,
  FiMenu,
  FiX,
  FiClipboard,
  FiUserCheck,
  FiBarChart2,
  FiLayers,
} from "react-icons/fi";
import { useState } from "react";

const links = [
  { to: "/dashboard", icon: FiHome, label: "Dashboard", always: true },
  {
    to: "/products",
    icon: FiLayers,
    label: "Products & Recipes",
    always: true,
  },
  { to: "/inventory", icon: FiPackage, label: "Inventory", always: true },
  { to: "/orders", icon: FiFileText, label: "Orders", always: true },
  {
    to: "/production",
    icon: FiTrello,
    label: "Production Board",
    always: true,
  },
  {
    to: "/production-planning",
    icon: FiClipboard,
    label: "Production Planning",
    always: true,
  },
  { to: "/customers", icon: FiUsers, label: "Customers", always: true },
  { to: "/suppliers", icon: FiTruck, label: "Suppliers", always: true },
  {
    to: "/purchase-orders",
    icon: FiClipboard,
    label: "Purchase Orders",
    always: true,
  },
  { to: "/staff", icon: FiUserCheck, label: "Staff Management", manager: true },
  { to: "/users", icon: FiUsers, label: "User Management", admin: true },
  { to: "/reports", icon: FiBarChart2, label: "Waste & Reports", manager: true },
];

export default function Sidebar() {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);

  const visibleLinks = links.filter((link) => {
    if (link.admin && !user?.isAdmin) return false;
    if (link.manager && !user?.isManager) return false;
    return true;
  });

  return (
    <>
      <button
        className="fixed top-4 left-4 z-50 md:hidden bg-white p-2 rounded shadow"
        onClick={() => setOpen(!open)}
      >
        {open ? <FiX size={24} /> : <FiMenu size={24} />}
      </button>

      <aside
        className={`fixed top-0 left-0 h-full w-64 bg-indigo-800 text-white p-6 transform transition-transform duration-200 ease-in-out z-40 ${open ? "translate-x-0" : "-translate-x-full"} md:translate-x-0`}
      >
        <div className="flex items-center gap-2 mb-8">
          <span className="text-3xl">🧁</span>
          <h1 className="text-2xl font-bold">BakeMaster</h1>
        </div>

        <div className="mb-4 px-3 py-2 bg-white/10 rounded-lg text-sm">
          <p className="font-medium">{user?.username}</p>
          <p className="text-xs opacity-75">
            {user?.role?.replace("ROLE_", "")}
          </p>
        </div>

        <nav className="flex flex-col gap-1">
          {visibleLinks.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              onClick={() => setOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-2 rounded-lg transition ${isActive ? "bg-indigo-600" : "hover:bg-indigo-700"}`
              }
            >
              <link.icon size={18} />
              {link.label}
            </NavLink>
          ))}
        </nav>

        <button
          onClick={logout}
          className="mt-8 flex items-center gap-2 px-4 py-2 w-full text-left rounded-lg hover:bg-red-600 transition"
        >
          <FiLogOut size={18} />
          Logout
        </button>
      </aside>

      {open && (
        <div
          className="fixed inset-0 bg-black/50 z-30 md:hidden"
          onClick={() => setOpen(false)}
        />
      )}
    </>
  );
}
