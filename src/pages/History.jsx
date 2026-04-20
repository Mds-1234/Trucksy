import { useState, useEffect, useContext } from "react";
import { getUserBookings } from "../services/bookingService";
import { AuthContext } from "../context/AuthContext";

const History = () => {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user } = useContext(AuthContext);

  useEffect(() => {
    const fetchHistory = async () => {
      if (!user?.uid) return;
      try {
        const bookingsData = await getUserBookings(user.uid, user.role);
        
        const completedTrips = bookingsData.filter(b => b.status === "completed").reverse();
        setHistory(completedTrips);
      } catch (error) {
        console.error("Error fetching history", error);
      } finally {
        setLoading(false);
      }
    };
    fetchHistory();
  }, [user]);

  return (
    <div className="dashboard-container">
      <div className="dashboard-panel">
        <h2>Trip History</h2>
        <p className="auth-subtitle">Review all of your completed trips and bookings.</p>
        
        {loading ? (
          <p>Loading history...</p>
        ) : history.length === 0 ? (
          <p>You have no completed trips yet.</p>
        ) : (
          <div className="matches-grid">
            {history.map(booking => (
              <div key={booking.id} className="card booking-card" style={{ opacity: 0.8 }}>
                <div className="card-header" style={{ borderBottom: "1px solid rgba(255,255,255,0.1)", paddingBottom: "10px" }}>
                  <h4>Status: <span style={{ color: "#4caf50" }}>{booking.status.toUpperCase()}</span></h4>
                </div>
                <div className="card-body" style={{ marginTop: "10px" }}>
                  <p><strong>Route:</strong> {booking.routeDetails}</p>
                  <hr style={{ margin: "10px 0", borderColor: "rgba(255,255,255,0.1)" }} />
                  <p><strong>Shipment:</strong> {booking.shipDetails}</p>
                  <hr style={{ margin: "10px 0", borderColor: "rgba(255,255,255,0.1)" }} />
                  {user?.role === "business" ? (
                    <p><strong>Driver:</strong> {booking.driverName} ({booking.driverContact})</p>
                  ) : (
                    <p><strong>Business:</strong> {booking.businessName} ({booking.businessContact})</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default History;
