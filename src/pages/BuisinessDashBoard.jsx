import { useState, useEffect, useContext } from "react";
import ShipmentForm from "../components/ShipmentForm";
import { AuthContext } from "../context/AuthContext";
import { getRoutes } from "../services/routeService";
import { getUserShipments } from "../services/shipmentService";
import { getBookings } from "../services/bookingService";
import { matchData } from "../utils/matching";
import { Link } from "react-router-dom";

const BusinessDashboard = () => {
  const { user } = useContext(AuthContext);
  const [matchCount, setMatchCount] = useState(0);

  useEffect(() => {
    const fetchMatches = async () => {
      if (!user?.uid) return;
      try {
        const routes = await getRoutes();
        const shipments = await getUserShipments(user.uid);
        const bookings = await getBookings();
        
        const result = matchData(routes, shipments, bookings);
        const unbookedMatches = result.filter(m => {
          return !bookings.some(
            (b) =>
              b.routeId === m.route.id &&
              b.shipmentId === m.ship.id &&
              (b.status === "pending" || b.status === "accepted")
          );
        });
        
        setMatchCount(unbookedMatches.length);
      } catch (error) {
        console.error("Error fetching match data", error);
      }
    };
    fetchMatches();
  }, [user]);

  return (
    <div className="dashboard-container">
      {matchCount > 0 && (
        <div className="alert" style={{ backgroundColor: "rgba(33, 150, 243, 0.1)", border: "1px solid #2196f3", color: "var(--text-primary)" }}>
          <strong>⚠️ Match Found!</strong> You have {matchCount} unbooked match{matchCount > 1 ? "es" : ""} for your shipments. <Link to="/bookings" style={{ color: "#2196f3", textDecoration: "underline" }}>Go to Bookings</Link> to book the driver.
        </div>
      )}
      <div className="dashboard-panel">
        <h2>Business Dashboard</h2>
        <p className="auth-subtitle">Add shipments and monitor your logistics.</p>
        <ShipmentForm />
      </div>
    </div>
  );
};

export default BusinessDashboard;