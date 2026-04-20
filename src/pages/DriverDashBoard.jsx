import { useState, useEffect, useContext } from "react";
import RouteForm from "../components/RouteForm";
import { AuthContext } from "../context/AuthContext";
import { getUserRoutes } from "../services/routeService";
import { getShipments } from "../services/shipmentService";
import { getBookings, getUserBookings } from "../services/bookingService";
import { matchData } from "../utils/matching";
import { Link } from "react-router-dom";

const DriverDashboard = () => {
  const { user } = useContext(AuthContext);
  const [matchCount, setMatchCount] = useState(0);
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    const fetchMatchesAndBookings = async () => {
      if (!user?.uid) return;
      try {
        const routes = await getUserRoutes(user.uid);
        const shipments = await getShipments();
        const allBookings = await getBookings();
        
        const result = matchData(routes, shipments, allBookings);
        const unbookedMatches = result.filter(m => {
          return !allBookings.some(
            (b) =>
              b.routeId === m.route.id &&
              b.shipmentId === m.ship.id &&
              (b.status === "pending" || b.status === "accepted")
          );
        });
        
        setMatchCount(unbookedMatches.length);

        const userBookings = await getUserBookings(user.uid, user.role);
        const pending = userBookings.filter(b => b.status === "pending");
        setPendingCount(pending.length);

      } catch (error) {
        console.error("Error fetching match data", error);
      }
    };
    fetchMatchesAndBookings();
  }, [user]);

  return (
    <div className="dashboard-container">
      {pendingCount > 0 && (
        <div className="alert" style={{ backgroundColor: "rgba(76, 175, 80, 0.1)", border: "1px solid #4caf50", color: "var(--text-primary)" }}>
          <strong>🎉 Action Required!</strong> You have {pendingCount} pending booking request{pendingCount > 1 ? "s" : ""}. <Link to="/bookings" style={{ color: "#4caf50", textDecoration: "underline" }}>Go to Bookings</Link> to accept.
        </div>
      )}
      
      {matchCount > 0 && pendingCount === 0 && (
        <div className="alert" style={{ backgroundColor: "rgba(33, 150, 243, 0.1)", border: "1px solid #2196f3", color: "var(--text-primary)" }}>
          <strong>⚠️ Match Found!</strong> There {matchCount > 1 ? "are" : "is"} {matchCount} matching shipment{matchCount > 1 ? "s" : ""} for your routes in the system. A business may book you soon!
        </div>
      )}

      <div className="dashboard-panel">
        <h2>Driver Dashboard</h2>
        <p className="auth-subtitle">Add routes and manage your schedule.</p>
        <RouteForm />
      </div>
    </div>
  );
};

export default DriverDashboard;