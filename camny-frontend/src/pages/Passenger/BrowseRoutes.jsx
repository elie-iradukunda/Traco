import React, { useEffect, useState } from "react";
import { getAllPassengerRoutes } from "../../services/api";

const BrowseRoutes = () => {
  const [routes, setRoutes] = useState([]);

  useEffect(() => {
    getAllPassengerRoutes().then(res => setRoutes(res.data));
  }, []);

  return (
    <div>
      <h1>Available Routes</h1>
      <ul>
        {routes.map(r => (
          <li key={r.route_id}>
            {r.route_name} ({r.start_location} → {r.end_location}) - Fare: {r.fare_base} RWF
          </li>
        ))}
      </ul>
    </div>
  );
};

export default BrowseRoutes;
