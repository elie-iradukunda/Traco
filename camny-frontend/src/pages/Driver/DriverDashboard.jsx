import React, { useEffect, useState } from "react";
import { getDriverAssignments } from "../../services/api";

const DriverDashboard = () => {
  const [assignments, setAssignments] = useState([]);
  const driverId = 1; // Example driver ID

  useEffect(() => {
    getDriverAssignments(driverId).then(res => setAssignments(res.data));
  }, []);

  return (
    <div>
      <h1>Driver Dashboard</h1>
      <ul>
        {assignments.map(a => (
          <li key={a.assignment_id}>
            Route: {a.route_name} - Vehicle: {a.plate_number} - Status: {a.accepted ? "Accepted" : "Pending"}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default DriverDashboard;
