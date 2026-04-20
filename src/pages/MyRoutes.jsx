import { useState, useEffect, useContext } from "react";
import { getUserRoutes } from "../services/routeService";
import { AuthContext } from "../context/AuthContext";

const MyRoutes = () => {
  const [routes, setRoutes] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user } = useContext(AuthContext);

  useEffect(() => {
    const fetchRoutes = async () => {
      try {
        const data = await getUserRoutes(user.uid);
        setRoutes(data.reverse());
      } catch (error) {
        console.error("Error fetching routes", error);
      } finally {
        setLoading(false);
      }
    };
    if (user?.uid) fetchRoutes();
  }, [user]);

  return (
    <div className="dashboard-container">
      <div className="dashboard-panel">
        <h2>My Routes</h2>
        <p className="auth-subtitle">Manage your added routes here.</p>
        
        {loading ? (
          <p>Loading routes...</p>
        ) : routes.length === 0 ? (
          <p>You have not created any routes yet.</p>
        ) : (
          <div className="matches-grid">
            {routes.map(r => (
              <div key={r.id} className="card booking-card">
                <div className="card-body">
                  <p><strong>From:</strong> {r.from}</p>
                  <p><strong>To:</strong> {r.to}</p>
                  <p><strong>Date:</strong> {r.date || "N/A"}</p>
                  {r.stops?.length > 0 && (
                    <p><strong>Stops:</strong> {r.stops.join(" ➔ ")}</p>
                  )}
                  <p><strong>Capacity:</strong> {r.capacity} kg</p>
                  {r.space && <p><strong>Space:</strong> {r.space} m³</p>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default MyRoutes;
