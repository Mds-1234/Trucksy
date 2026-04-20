import { useState, useEffect, useContext } from "react";
import { getUserBookings, updateBookingStatus, createBooking, updateBookingStops, updateBookingDeliveryReached, getBookings } from "../services/bookingService";
import { getRoutes, deleteRoute } from "../services/routeService";
import { getUserShipments, deleteShipment } from "../services/shipmentService";
import { matchData } from "../utils/matching";
import { AuthContext } from "../context/AuthContext";

const getRouteNodes = (booking) => {
  const [routeFrom, routeTo] = (booking.routeDetails || " ➔ ").split(" ➔ ");
  return [routeFrom, ...(booking.routeStops || []), routeTo];
};

const getRouteGroupKey = (booking) => booking.routeId;
const getShipmentToNode = (booking) => (booking.shipDetails || " ➔ ").split(" ➔ ")[1];
const getCurrentTruckNode = (booking) => {
  const nodes = getRouteNodes(booking);
  const completedStops = booking.completedStops || [];
  if (completedStops.length === 0) return nodes[0] || "N/A";

  const maxCompletedIdx = Math.max(...completedStops);
  const currentNode = nodes[maxCompletedIdx + 1];
  return currentNode || nodes[nodes.length - 1] || "N/A";
};
const isDestinationReached = (booking) => {
  const shipmentTo = getShipmentToNode(booking);
  return shipmentTo && shipmentTo === getCurrentTruckNode(booking);
};
const canAcceptBookingWithContext = (pendingBooking, bookingPool, routeIds) => {
  if (!routeIds.has(pendingBooking.routeId)) return false;
  const allAccepted = bookingPool.filter(
    b => b.routeId === pendingBooking.routeId && b.status === "accepted"
  );
  const nodes = getRouteNodes(pendingBooking);

  const remaining = Array(nodes.length > 1 ? nodes.length - 1 : 0).fill(null).map(() => ({
    weight: Number(pendingBooking.routeCapacity) || 0,
    space: Number(pendingBooking.routeSpace) || 0
  }));

  allAccepted.forEach(b => {
    const [bFrom, bTo] = (b.shipDetails || " ➔ ").split(" ➔ ");
    const bFromIdx = nodes.indexOf(bFrom);
    const bToIdx = nodes.indexOf(bTo);
    const bWeight = Number(b.shipWeight) || 0;
    const bSpace = Number(b.shipSpace) || 0;

    if (bFromIdx !== -1 && bToIdx !== -1 && bFromIdx < bToIdx) {
      for (let i = bFromIdx; i < bToIdx; i++) {
        if (remaining[i]) {
          remaining[i].weight -= bWeight;
          remaining[i].space -= bSpace;
        }
      }
    }
  });

  const [pFrom, pTo] = (pendingBooking.shipDetails || " ➔ ").split(" ➔ ");
  const pFromIdx = nodes.indexOf(pFrom);
  const pToIdx = nodes.indexOf(pTo);
  const pWeight = Number(pendingBooking.shipWeight) || 0;
  const pSpace = Number(pendingBooking.shipSpace) || 0;

  if (pFromIdx !== -1 && pToIdx !== -1 && pFromIdx < pToIdx) {
    let minW = Infinity;
    let minS = Infinity;
    for (let i = pFromIdx; i < pToIdx; i++) {
      if (remaining[i]) {
        if (remaining[i].weight < minW) minW = remaining[i].weight;
        if (remaining[i].space < minS) minS = remaining[i].space;
      }
    }
    return minW >= pWeight && minS >= pSpace;
  }
  return false;
};

const Bookings = () => {
  const [bookings, setBookings] = useState([]);
  const [availableMatches, setAvailableMatches] = useState([]);
  const [activeRouteIds, setActiveRouteIds] = useState(new Set());
  const [bookingInFlight, setBookingInFlight] = useState({});
  const [driverTab, setDriverTab] = useState("pending");
  const [rejectedCount, setRejectedCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const { user } = useContext(AuthContext);

  useEffect(() => {
    const fetchData = async () => {
      if (!user?.uid) return;
      try {
        let bookingsData = await getUserBookings(user.uid, user.role);
        const routes = await getRoutes();
        const allRouteIds = new Set(routes.map((r) => r.id));
        
        const statusWeight = {
          "accepted": 1,
          "pending": 2,
          "rejected": 3,
          "completed": 4
        };

        const stalePending = bookingsData.filter(
          (b) => b.status === "pending" && !allRouteIds.has(b.routeId)
        );
        if (stalePending.length > 0) {
          await Promise.all(stalePending.map((b) => updateBookingStatus(b.id, "rejected")));
          const staleIds = new Set(stalePending.map((b) => b.id));
          bookingsData = bookingsData.map((b) => (
            staleIds.has(b.id) ? { ...b, status: "rejected" } : b
          ));
        }

        if (user.role === "driver") {
          const myRouteIds = new Set(routes.filter(r => r.uid === user.uid).map(r => r.id));
          const impossiblePending = bookingsData.filter(
            (b) =>
              b.status === "pending" &&
              !canAcceptBookingWithContext(b, bookingsData, myRouteIds)
          );
          if (impossiblePending.length > 0) {
            await Promise.all(impossiblePending.map((b) => updateBookingStatus(b.id, "rejected")));
            const impossibleIds = new Set(impossiblePending.map((b) => b.id));
            bookingsData = bookingsData.map((b) => (
              impossibleIds.has(b.id) ? { ...b, status: "rejected" } : b
            ));
          }
        }
        
        const sortedBookings = bookingsData.reverse().sort((a, b) => statusWeight[a.status] - statusWeight[b.status]);
        const userVisibleBookings = user.role === "driver"
          ? sortedBookings.filter(
              (b) => b.status !== "completed" && b.status !== "rejected"
            )
          : sortedBookings;
        setBookings(userVisibleBookings);

        if (user.role === "business") {
          const shipments = await getUserShipments(user.uid);
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
          setAvailableMatches(unbookedMatches.reverse());
          setRejectedCount(
            userVisibleBookings.filter((b) => b.status === "rejected").length
          );
        }

        if (user.role === "driver") {
          const myRouteIds = new Set(routes.filter(r => r.uid === user.uid).map(r => r.id));
          setActiveRouteIds(myRouteIds);
        }
      } catch (error) {
        console.error("Error fetching data", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [user]);

  const canAcceptBooking = (pendingBooking) => {
    return canAcceptBookingWithContext(pendingBooking, bookings, activeRouteIds);
  };

  const handleUpdateStatus = async (id, newStatus) => {
    try {
      await updateBookingStatus(id, newStatus);
      
      const statusWeight = {
        "accepted": 1,
        "pending": 2,
        "rejected": 3,
        "completed": 4
      };
      
      const updatedList = bookings.map(b => b.id === id ? { ...b, status: newStatus } : b);
      const activeList = updatedList.filter(b => b.status !== "completed").sort((a, b) => statusWeight[a.status] - statusWeight[b.status]);
      setBookings(activeList);
      
      if (newStatus === "completed") {
        const booking = bookings.find(b => b.id === id);
        if (booking) {
          await deleteRoute(booking.routeId);
          await deleteShipment(booking.shipmentId);
        }
      }
    } catch (error) {
      console.error(`Failed to ${newStatus} trip`, error);
      alert("Failed to update status.");
    }
  };

  const getGroupedAcceptedBookings = () => {
    const grouped = {};
    bookings
      .filter(b => b.status === "accepted" && activeRouteIds.has(b.routeId))
      .forEach((booking) => {
        const key = getRouteGroupKey(booking);
        if (!grouped[key]) grouped[key] = [];
        grouped[key].push(booking);
      });
    return Object.values(grouped);
  };

  const handleUpdateStatusForGroup = async (groupBookings, newStatus) => {
    try {
      await Promise.all(groupBookings.map(b => updateBookingStatus(b.id, newStatus)));
      const groupIds = new Set(groupBookings.map(b => b.id));

      const statusWeight = {
        accepted: 1,
        pending: 2,
        completed: 3
      };

      const updatedList = bookings.map((b) => (
        groupIds.has(b.id) ? { ...b, status: newStatus } : b
      ));
      const activeList = updatedList
        .filter(b => b.status !== "completed")
        .sort((a, b) => statusWeight[a.status] - statusWeight[b.status]);
      setBookings(activeList);

      if (newStatus === "completed") {
        await Promise.all(groupBookings.map(b => deleteShipment(b.shipmentId)));
        const routeId = groupBookings[0]?.routeId;
        if (routeId) {
          await deleteRoute(routeId);
          setActiveRouteIds((prev) => {
            const next = new Set(prev);
            next.delete(routeId);
            return next;
          });
        }
      }
    } catch (error) {
      console.error(`Failed to ${newStatus} grouped trip`, error);
      alert("Failed to update grouped trip status.");
    }
  };

  const handleCompleteStopForGroup = async (groupBookings, stopIndex) => {
    try {
      const updatesAfterStop = groupBookings.map((booking) => {
        const newCompleted = booking.completedStops?.includes(stopIndex)
          ? booking.completedStops
          : [...(booking.completedStops || []), stopIndex];
        return { booking, newCompleted };
      });

      await Promise.all(updatesAfterStop.map(({ booking, newCompleted }) =>
        updateBookingStops(booking.id, newCompleted)
      ));

      const groupIds = new Set(groupBookings.map(b => b.id));
      const updatedList = bookings.map((booking) => {
        if (!groupIds.has(booking.id)) return booking;
        const update = updatesAfterStop.find((item) => item.booking.id === booking.id);
        if (!update) return booking;
        return { ...booking, completedStops: update.newCompleted };
      });

      const reachedDestinationBookings = updatedList.filter(
        (booking) => groupIds.has(booking.id) &&
          booking.status === "accepted" &&
          isDestinationReached(booking)
      );

      if (reachedDestinationBookings.length > 0) {
        await Promise.all(reachedDestinationBookings.map((booking) =>
          updateBookingDeliveryReached(booking.id, true)
        ));
      }

      const completedIds = new Set(reachedDestinationBookings.map((booking) => booking.id));
      setBookings(updatedList.map((booking) => (
        completedIds.has(booking.id) ? { ...booking, deliveryReached: true } : booking
      )));
    } catch (error) {
      console.error("Failed to complete grouped stop", error);
      alert("Failed to complete stop.");
    }
  };

  const handleBookNow = async (match) => {
    const matchKey = `${match.route.id}__${match.ship.id}`;
    if (bookingInFlight[matchKey]) return;

    setBookingInFlight(prev => ({ ...prev, [matchKey]: true }));
    try {
      const bookingData = {
        routeId: match.route.id,
        shipmentId: match.ship.id,
        driverUid: match.route.uid || "legacy_driver",
        businessUid: user.uid,
        driverName: match.route.driverName || "Driver",
        businessName: user.name || "Business",
        driverContact: match.route.contact || "",
        businessContact: user.contact || "",
        tripDate: match.route.date || match.ship.date || "",
        routeDetails: `${match.route.from} ➔ ${match.route.to}`,
        shipDetails: `${match.ship.from} ➔ ${match.ship.to}`,
        routeStops: match.route.stops || [],
        completedStops: [],
        deliveryReached: false,
        routeSpace: match.route.space || "",
        shipSpace: match.ship.space || "",
        routeCapacity: match.route.capacity || 0,
        shipWeight: match.ship.weight || 0,
        status: "pending"
      };
      
      await createBooking(bookingData);
      
      const updatedBookings = await getUserBookings(user.uid, user.role);
      
      const statusWeight = {
        "accepted": 1,
        "pending": 2,
        "completed": 3
      };
      
      const sortedBookings = updatedBookings.reverse().sort((a, b) => statusWeight[a.status] - statusWeight[b.status]);
      const activeBookings = sortedBookings.filter(
        (b) => user.role === "driver"
          ? b.status !== "completed" && b.status !== "rejected"
          : b.status !== "completed"
      );
      setBookings(activeBookings);
      setAvailableMatches(availableMatches.filter(m => m !== match));
    } catch (error) {
      console.error("Booking failed", error);
      alert("Failed to book.");
    } finally {
      setBookingInFlight(prev => {
        const next = { ...prev };
        delete next[matchKey];
        return next;
      });
    }
  };

  const pendingBookings = bookings.filter(b => b.status === "pending");
  const actionablePendingBookings = pendingBookings.filter(canAcceptBooking);
  const groupedAcceptedBookings = getGroupedAcceptedBookings();

  return (
    <div className="dashboard-container">
      <div className="dashboard-panel">
        <h2>{user?.role === "driver" ? "Trip Requests & Schedule" : "Bookings"}</h2>
        <p className="auth-subtitle">
          {user?.role === "driver" ? "Manage incoming booking requests and active trips." : "Find matches and track the status of your drivers."}
        </p>
        {user?.role === "business" && rejectedCount > 0 && (
          <div className="alert" style={{ backgroundColor: "rgba(255, 152, 0, 0.1)", border: "1px solid #ff9800", color: "var(--text-primary)" }}>
            <strong>Booking Not Accepted:</strong> {rejectedCount} booking request{rejectedCount > 1 ? "s were" : " was"} not accepted. Please book another available match.
          </div>
        )}
        
        {loading ? (
          <p>Loading bookings...</p>
        ) : bookings.length === 0 && availableMatches.length === 0 ? (
          <p>No active bookings or matches found.</p>
        ) : (
          <>
            {user?.role === "driver" && (
              <div style={{ display: "flex", gap: "10px", marginBottom: "16px" }}>
                <button
                  className="btn"
                  onClick={() => setDriverTab("pending")}
                  style={{
                    background: driverTab === "pending" ? "var(--primary-color)" : "transparent",
                    border: "1px solid var(--primary-color)"
                  }}
                >
                  Pending ({actionablePendingBookings.length})
                </button>
                <button
                  className="btn"
                  onClick={() => setDriverTab("active")}
                  style={{
                    background: driverTab === "active" ? "#2196f3" : "transparent",
                    border: "1px solid #2196f3"
                  }}
                >
                  Active Bookings ({groupedAcceptedBookings.length})
                </button>
              </div>
            )}

            <div className="matches-grid">
              {user?.role === "business" && availableMatches.map((match, idx) => {
                const matchKey = `${match.route.id}__${match.ship.id}`;
                const isLoading = !!bookingInFlight[matchKey];
                return (
                  <div key={`match-${idx}`} className="card booking-card" style={{ border: "1px solid var(--primary-color)" }}>
                    <div className="card-header" style={{ borderBottom: "1px solid rgba(255,255,255,0.1)", paddingBottom: "10px" }}>
                      <h4>Status: <span style={{ color: "var(--text-secondary)" }}>AVAILABLE MATCH</span></h4>
                    </div>
                    <div className="card-body" style={{ marginTop: "10px" }}>
                      <p><strong>Route:</strong> {match.route.from} ➔ {match.route.to} (Capacity: {match.route.capacity}kg{match.route.space ? `, Space: ${match.route.space}m³` : ""})</p>
                      <p><strong>Date:</strong> {match.route.date || "N/A"}</p>
                      {match.route.stops?.length > 0 && <p><strong>Stops:</strong> {match.route.stops.join(" ➔ ")}</p>}
                      <hr style={{ margin: "10px 0", borderColor: "rgba(255,255,255,0.1)" }} />
                      <p><strong>Shipment:</strong> {match.ship.from} ➔ {match.ship.to} (Weight: {match.ship.weight}kg{match.ship.space ? `, Space: ${match.ship.space}m³` : ""})</p>
                      <hr style={{ margin: "10px 0", borderColor: "rgba(255,255,255,0.1)" }} />
                      <p><strong>Driver:</strong> {match.route.driverName || "Driver"} ({match.route.contact || "N/A"})</p>
                    </div>
                    <div className="card-footer" style={{ marginTop: "15px", paddingTop: "15px", borderTop: "1px solid rgba(255,255,255,0.1)" }}>
                      <button
                        className="btn btn-primary w-100"
                        onClick={() => handleBookNow(match)}
                        disabled={isLoading}
                      >
                        {isLoading ? "Booking..." : "Book Now"}
                      </button>
                    </div>
                  </div>
                );
              })}

              {user?.role === "driver" && driverTab === "pending" && actionablePendingBookings.map(booking => (
                <div key={booking.id} className="card booking-card">
                  <div className="card-header" style={{ borderBottom: "1px solid rgba(255,255,255,0.1)", paddingBottom: "10px" }}>
                    <h4>Status: <span style={{ color: "var(--primary-color)" }}>PENDING</span></h4>
                  </div>
                  <div className="card-body" style={{ marginTop: "10px" }}>
                    <p><strong>Route:</strong> {booking.routeDetails} {booking.routeSpace ? `(Space: ${booking.routeSpace}m³)` : ""}</p>
                    <p><strong>Date:</strong> {booking.tripDate || "N/A"}</p>
                    {booking.routeStops?.length > 0 && <p><strong>Stops:</strong> {booking.routeStops.join(" ➔ ")}</p>}
                    <hr style={{ margin: "10px 0", borderColor: "rgba(255,255,255,0.1)" }} />
                    <p><strong>Shipment:</strong> {booking.shipDetails} {booking.shipSpace ? `(Space: ${booking.shipSpace}m³)` : ""}</p>
                    <hr style={{ margin: "10px 0", borderColor: "rgba(255,255,255,0.1)" }} />
                    <p><strong>Business:</strong> {booking.businessName} ({booking.businessContact})</p>
                  </div>
                  <div className="card-footer" style={{ marginTop: "15px", paddingTop: "15px", borderTop: "1px solid rgba(255,255,255,0.1)" }}>
                    <button
                      className="btn btn-primary w-100"
                      onClick={() => handleUpdateStatus(booking.id, "accepted")}
                      style={{ background: "#2196f3", borderColor: "#2196f3" }}
                    >
                      Accept Booking
                    </button>
                  </div>
                </div>
              ))}
              {user?.role === "driver" && driverTab === "pending" && actionablePendingBookings.length === 0 && (
                <p>No pending requests fit your remaining route capacity.</p>
              )}

              {user?.role === "driver" && driverTab === "active" && groupedAcceptedBookings.map((group) => {
                const lead = group[0];
                const completedStops = lead.completedStops || [];
                const canCompleteTrip = (lead.routeStops?.length || 0) === completedStops.length;
                const tripSegments = [...new Set(group.map(b => b.shipDetails))];

                return (
                  <div key={lead.routeId} className="card booking-card">
                    <div className="card-header" style={{ borderBottom: "1px solid rgba(255,255,255,0.1)", paddingBottom: "10px" }}>
                      <h4>Status: <span style={{ color: "#2196f3" }}>ACTIVE TRIP</span></h4>
                    </div>
                    <div className="card-body" style={{ marginTop: "10px" }}>
                      <p><strong>Route:</strong> {lead.routeDetails} {lead.routeSpace ? `(Space: ${lead.routeSpace}m³)` : ""}</p>
                      <p><strong>Date:</strong> {lead.tripDate || "N/A"}</p>
                      {lead.routeStops?.length > 0 && <p><strong>Stops:</strong> {lead.routeStops.join(" ➔ ")}</p>}
                      <hr style={{ margin: "10px 0", borderColor: "rgba(255,255,255,0.1)" }} />
                      <p><strong>Trip Segments:</strong> {tripSegments.join(", ")}</p>
                      <p><strong>Businesses:</strong> {group.map(b => b.businessName).join(", ")}</p>
                      <p><strong>Deliveries in this trip:</strong> {group.length}</p>
                    </div>
                    <div className="card-footer" style={{ marginTop: "15px", paddingTop: "15px", borderTop: "1px solid rgba(255,255,255,0.1)" }}>
                      {lead.routeStops?.length > 0 && (
                        <div style={{ marginBottom: "15px", padding: "10px", background: "rgba(0,0,0,0.2)", borderRadius: "4px" }}>
                          <p style={{ marginBottom: "10px", fontWeight: "bold" }}>Shared Intermediate Stops Checklist:</p>
                          {lead.routeStops.map((stop, idx) => {
                            const isCompleted = completedStops.includes(idx);
                            return (
                              <div key={idx} style={{ display: "flex", alignItems: "center", marginBottom: "5px" }}>
                                <input
                                  type="checkbox"
                                  checked={isCompleted}
                                  disabled={isCompleted}
                                  onChange={() => handleCompleteStopForGroup(group, idx)}
                                  style={{ marginRight: "10px", width: "16px", height: "16px" }}
                                />
                                <span style={{ textDecoration: isCompleted ? "line-through" : "none", color: isCompleted ? "var(--text-secondary)" : "inherit" }}>
                                  {stop}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      )}
                      <button
                        className="btn btn-primary w-100"
                        onClick={() => handleUpdateStatusForGroup(group, "completed")}
                        style={{ background: "#4caf50", borderColor: "#4caf50" }}
                        disabled={!canCompleteTrip}
                      >
                        {canCompleteTrip ? "Complete Trip (All Businesses)" : "Complete All Stops First"}
                      </button>
                    </div>
                  </div>
                );
              })}

              {user?.role === "business" && bookings.map(booking => (
                <div key={booking.id} className="card booking-card" style={{ opacity: booking.status === "completed" ? 0.6 : 1 }}>
                  <div className="card-header" style={{ borderBottom: "1px solid rgba(255,255,255,0.1)", paddingBottom: "10px" }}>
                    <h4>
                      Status:{" "}
                      <span style={{ color: (booking.status === "completed" || booking.deliveryReached) ? "#4caf50" : booking.status === "accepted" ? "#2196f3" : booking.status === "rejected" ? "#ff9800" : "var(--primary-color)" }}>
                        {(booking.status === "accepted" && booking.deliveryReached) ? "COMPLETED FOR YOU" : booking.status.toUpperCase()}
                      </span>
                    </h4>
                  </div>
                  <div className="card-body" style={{ marginTop: "10px" }}>
                    <p><strong>Route:</strong> {booking.routeDetails} {booking.routeSpace ? `(Space: ${booking.routeSpace}m³)` : ""}</p>
                    <p><strong>Date:</strong> {booking.tripDate || "N/A"}</p>
                    {booking.routeStops?.length > 0 && <p><strong>Stops:</strong> {booking.routeStops.join(" ➔ ")}</p>}
                    <hr style={{ margin: "10px 0", borderColor: "rgba(255,255,255,0.1)" }} />
                    <p><strong>Shipment:</strong> {booking.shipDetails} {booking.shipSpace ? `(Space: ${booking.shipSpace}m³)` : ""}</p>
                    <hr style={{ margin: "10px 0", borderColor: "rgba(255,255,255,0.1)" }} />
                    <p><strong>Driver:</strong> {booking.driverName} ({booking.driverContact})</p>
                    {(booking.status === "accepted" || booking.status === "completed") && (
                      <>
                        <p><strong>Truck Current Location:</strong> {(booking.status === "completed" || booking.deliveryReached) ? getShipmentToNode(booking) : getCurrentTruckNode(booking)}</p>
                        <p>
                          <strong>Trip Progress:</strong>{" "}
                          {(booking.status === "completed" || booking.deliveryReached)
                            ? "Completed for your business"
                            : `Remaining (destination: ${getShipmentToNode(booking) || "N/A"})`}
                        </p>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default Bookings;
