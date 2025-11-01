export const mockData = {
  users: [
    { user_id: 1, full_name: "John Doe", role: "driver" },
    { user_id: 2, full_name: "Jane Smith", role: "passenger" },
    { user_id: 3, full_name: "Mike Johnson", role: "company_admin" },
  ],
  routes: [
    { route_id: 1, route_name: "Kigali - Huye", driver_id: 1 },
    { route_id: 2, route_name: "Kigali - Musanze", driver_id: 2 },
  ],
  tickets: [
    { ticket_id: 1, passenger_id: 2, route_id: 1, status: "booked" },
    { ticket_id: 2, passenger_id: 2, route_id: 2, status: "boarded" },
  ],
  notifications: [
    { notification_id: 1, user_id: 2, message: "Ticket confirmed", read_status: false },
  ],
};
