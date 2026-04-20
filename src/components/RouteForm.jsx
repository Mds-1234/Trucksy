import { useState, useContext } from "react";
import { addRoute } from "../services/routeService";
import { AuthContext } from "../context/AuthContext";

const RouteForm = () => {
  const [form, setForm] = useState({
    from: "",
    to: "",
    date: "",
    capacity: "",
    space: "",
    stops: []
  });
  const [stopInput, setStopInput] = useState("");
  const [loading, setLoading] = useState(false);
  const { user } = useContext(AuthContext);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await addRoute({ 
        ...form, 
        uid: user.uid, 
        driverName: user.name, 
        contact: user.contact 
      });
      alert("Route added successfully!");
      setForm({ from: "", to: "", date: "", capacity: "", space: "", stops: [] });
      setStopInput("");
    } catch {
      alert("Failed to add route");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="auth-form" style={{ marginTop: "1rem" }}>
      <div className="form-group">
        <label>Origin</label>
        <input 
          placeholder="From"
          required
          value={form.from}
          onChange={(e) => setForm({ ...form, from: e.target.value })} 
        />
      </div>

      <div className="form-group">
        <label>Intermediate Stops</label>
        <div style={{ display: "flex", gap: "10px", marginBottom: "10px" }}>
          <input 
            placeholder="Add a stop (e.g., Agra)"
            value={stopInput}
            onChange={(e) => setStopInput(e.target.value)}
            style={{ flex: 1 }}
          />
          <button 
            type="button" 
            className="btn btn-primary"
            onClick={() => {
              if (stopInput.trim() !== "") {
                setForm({ ...form, stops: [...form.stops, stopInput.trim()] });
                setStopInput("");
              }
            }}
          >
            Add Stop
          </button>
        </div>
        {form.stops.length > 0 && (
          <ul style={{ listStyleType: "none", padding: 0, margin: "0 0 1rem 0" }}>
            {form.stops.map((stop, index) => (
              <li key={index} style={{ display: "flex", justifyContent: "space-between", padding: "5px", background: "rgba(255,255,255,0.05)", marginBottom: "5px", borderRadius: "4px" }}>
                <span>{index + 1}. {stop}</span>
                <button 
                  type="button" 
                  style={{ background: "none", border: "none", color: "var(--primary-color)", cursor: "pointer" }}
                  onClick={() => {
                    const newStops = form.stops.filter((_, i) => i !== index);
                    setForm({ ...form, stops: newStops });
                  }}
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="form-group">
        <label>Destination</label>
        <input 
          placeholder="To"
          required
          value={form.to}
          onChange={(e) => setForm({ ...form, to: e.target.value })} 
        />
      </div>

      <div className="form-group">
        <label>Trip Date</label>
        <input
          type="date"
          required
          value={form.date}
          onChange={(e) => setForm({ ...form, date: e.target.value })}
        />
      </div>

      <div className="form-group">
        <label>Capacity (kg)</label>
        <input 
          placeholder="e.g. 5000"
          type="number"
          required
          value={form.capacity}
          onChange={(e) => setForm({ ...form, capacity: Number(e.target.value) })} 
        />
      </div>

      <div className="form-group">
        <label>Space (Cubic Meters)</label>
        <input 
          placeholder="e.g. 25"
          type="number"
          required
          value={form.space}
          onChange={(e) => setForm({ ...form, space: Number(e.target.value) })} 
        />
      </div>

      <button className="btn btn-primary" disabled={loading}>
        {loading ? "Adding..." : "Add Route"}
      </button>
    </form>
  );
};

export default RouteForm;