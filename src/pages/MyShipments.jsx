import { useState, useEffect, useContext } from "react";
import { getUserShipments } from "../services/shipmentService";
import { AuthContext } from "../context/AuthContext";

const MyShipments = () => {
  const [shipments, setShipments] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user } = useContext(AuthContext);

  useEffect(() => {
    const fetchShipments = async () => {
      try {
        const data = await getUserShipments(user.uid);
        setShipments(data.reverse());
      } catch (error) {
        console.error("Error fetching shipments", error);
      } finally {
        setLoading(false);
      }
    };
    if (user?.uid) fetchShipments();
  }, [user]);

  return (
    <div className="dashboard-container">
      <div className="dashboard-panel">
        <h2>My Shipments</h2>
        <p className="auth-subtitle">Manage your added shipments here.</p>
        
        {loading ? (
          <p>Loading shipments...</p>
        ) : shipments.length === 0 ? (
          <p>You have not created any shipments yet.</p>
        ) : (
          <div className="matches-grid">
            {shipments.map(s => (
              <div key={s.id} className="card booking-card">
                <div className="card-body">
                  <p><strong>From:</strong> {s.from}</p>
                  <p><strong>To:</strong> {s.to}</p>
                  <p><strong>Date:</strong> {s.date || "N/A"}</p>
                  <p><strong>Weight:</strong> {s.weight} kg</p>
                  {s.space && <p><strong>Space:</strong> {s.space} m³</p>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default MyShipments;
