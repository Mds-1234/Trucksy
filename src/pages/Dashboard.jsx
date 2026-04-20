import { useContext } from "react";
import { AuthContext } from "../context/AuthContext";
import DriverDashboard from "./DriverDashBoard";
import BusinessDashboard from "./BuisinessDashBoard";

const Dashboard = () => {
  const { user } = useContext(AuthContext);

  if (!user) return <p>Loading...</p>;

  return (
    <div className="dashboard-container">
      {user.role === "business" ? <BusinessDashboard /> : <DriverDashboard />}
    </div>
  );
};

export default Dashboard;