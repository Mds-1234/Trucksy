import { useContext } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";

const Navbar = () => {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  const isActive = (path) => location.pathname === path ? "nav-link active" : "nav-link";

  return (
    <nav className="navbar">
      <div className="navbar-container">
        <Link to="/" className="navbar-logo">
          Trucksy
        </Link>
        <div className="navbar-links">
          {user ? (
            <>
              <Link to="/dashboard" className={isActive("/dashboard")}>Dashboard</Link>
              
              {user.role === "driver" && (
                <Link to="/my-routes" className={isActive("/my-routes")}>My Routes</Link>
              )}
              {user.role === "business" && (
                <Link to="/my-shipments" className={isActive("/my-shipments")}>My Shipments</Link>
              )}
              <Link to="/bookings" className={isActive("/bookings")}>Bookings</Link>
              <Link to="/history" className={isActive("/history")}>History</Link>
              
              <span className="navbar-user" style={{ marginLeft: "1rem" }}>
                Welcome, {user.name ? user.name : "User"} ({user.role})
              </span>
              <button className="btn btn-logout" onClick={handleLogout} style={{ marginLeft: "1rem" }}>
                Logout
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className={isActive("/login")}>Login</Link>
              <Link to="/signup" className={isActive("/signup")}>Sign Up</Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
