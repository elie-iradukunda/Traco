import React, { useEffect, useState } from "react";
import { getPassengerTickets } from "../../services/api";

const MyTickets = () => {
  const [tickets, setTickets] = useState([]);
  const passengerId = 3; // Example passenger ID

  useEffect(() => {
    getPassengerTickets(passengerId).then(res => setTickets(res.data));
  }, []);

  return (
    <div>
      <h1>My Tickets</h1>
      <ul>
        {tickets.map(t => (
          <li key={t.ticket_id}>
            Route: {t.route_name} - Vehicle: {t.plate_number} - Seat: {t.seat_number} - Date: {t.travel_date}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default MyTickets;
