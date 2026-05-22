import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const Navbar = () => {
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();

  return (
    <nav className="bg-indigo-700 text-white shadow-lg sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
        <Link to="/" className="text-2xl font-bold">
          🧁 BakeMaster
        </Link>
        <div className="flex gap-4 items-center">
          {user ? (
            <>
              <Link to="/dashboard" className="hover:underline">
                Dashboard
              </Link>
              <Link to="/inventory" className="hover:underline">
                Inventory
              </Link>
              <Link to="/orders" className="hover:underline">
                Orders
              </Link>
              <Link to="/production" className="hover:underline">
                Production
              </Link>
              <Link to="/customers" className="hover:underline">
                Customers
              </Link>
              <Link to="/suppliers" className="hover:underline">
                Suppliers
              </Link>
              <span className="text-sm bg-white/20 px-3 py-1 rounded-full">
                {user.username} ({user.role.replace("ROLE_", "")})
              </span>
              <button
                onClick={() => {
                  logout();
                  navigate("/login");
                }}
                className="bg-red-500 px-4 py-1 rounded hover:bg-red-600"
              >
                Logout
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="hover:underline">
                Login
              </Link>
              <Link to="/register" className="hover:underline">
                Register
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
