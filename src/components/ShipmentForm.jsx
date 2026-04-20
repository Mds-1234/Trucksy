import { useState, useContext } from "react";
import { addShipment } from "../services/shipmentService";
import { AuthContext } from "../context/AuthContext";

const ShipmentForm = () => {
  const [form, setForm] = useState({
    from: "",
    to: "",
    date: "",
    weight: "",
    space: ""
  });
  const [loading, setLoading] = useState(false);
  const { user } = useContext(AuthContext);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await addShipment({ 
        ...form, 
        uid: user.uid, 
        businessName: user.name, 
        contact: user.contact 
      });
      alert("Shipment added successfully!");
      setForm({ from: "", to: "", date: "", weight: "", space: "" });
    } catch {
      alert("Failed to add shipment");
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
        <label>Weight (kg)</label>
        <input 
          placeholder="e.g. 2000"
          type="number"
          required
          value={form.weight}
          onChange={(e) => setForm({ ...form, weight: Number(e.target.value) })} 
        />
      </div>

      <div className="form-group">
        <label>Space (Cubic Meters)</label>
        <input 
          placeholder="e.g. 15"
          type="number"
          required
          value={form.space}
          onChange={(e) => setForm({ ...form, space: Number(e.target.value) })} 
        />
      </div>

      <button className="btn btn-primary" disabled={loading}>
        {loading ? "Adding..." : "Add Shipment"}
      </button>
    </form>
  );
};

export default ShipmentForm;