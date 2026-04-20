import { useState, useContext, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";

const Signup = () => {
  const [form, setForm] = useState({
    name: "",
    contact: "",
    email: "",
    password: "",
    role: "driver"
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { user, signupUser } = useContext(AuthContext);

  useEffect(() => {
    if (user) {
      navigate("/dashboard");
    }
  }, [user, navigate]);

  const handleSignup = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await signupUser(form.email, form.password, form.role, form.name, form.contact);
      navigate("/dashboard");
    } catch (err) {
      console.error(err);
      setError(`Failed to create account: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h2>Create Account</h2>
        <p className="auth-subtitle">Join Trucksy to get started</p>
        
        {error && <div className="alert alert-error">{error}</div>}
        
        <form onSubmit={handleSignup} className="auth-form">
          <div className="form-group">
            <label>Full Name</label>
            <input 
              type="text"
              placeholder="John Doe" 
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })} 
            />
          </div>

          <div className="form-group">
            <label>Contact Number</label>
            <input 
              type="tel"
              placeholder="+1 234 567 8900" 
              required
              value={form.contact}
              onChange={(e) => setForm({ ...form, contact: e.target.value })} 
            />
          </div>

          <div className="form-group">
            <label>Email Address</label>
            <input 
              type="email"
              placeholder="you@example.com" 
              required
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })} 
            />
          </div>
          
          <div className="form-group">
            <label>Password</label>
            <input 
              type="password" 
              placeholder="••••••••" 
              required
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })} 
            />
          </div>
          
          <div className="form-group">
            <label>I am a...</label>
            <select 
              className="form-select"
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value })}
            >
              <option value="driver">Driver</option>
              <option value="business">Business</option>
            </select>
          </div>
          
          <button type="submit" className="btn btn-primary w-100" disabled={loading}>
            {loading ? "Signing up..." : "Sign Up"}
          </button>
        </form>
        
        <p className="auth-switch">
          Already have an account? <Link to="/login">Log in</Link>
        </p>
      </div>
    </div>
  );
};

export default Signup;