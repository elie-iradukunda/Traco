import React, { useEffect, useState } from "react";
import AdminLayout from "../../components/Admin/AdminLayout";
import { getDriverAssignmentsAdmin } from "../../services/api";

const DriverAssignments = () => {
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAssignments();
  }, []);

  const fetchAssignments = async () => {
    try {
      setLoading(true);
      const res = await getDriverAssignmentsAdmin();
      setAssignments(res.data || []);
    } catch (err) {
      console.error("Error fetching assignments:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AdminLayout>
      <div className="p-6">
        <h1 className="text-3xl font-bold mb-6">Driver Assignments</h1>

        {loading ? (
          <div className="text-center py-12">Loading assignments...</div>
        ) : assignments.length === 0 ? (
          <div className="text-center py-12 text-gray-500">No driver assignments found</div>
        ) : (
          <div className="space-y-6">
            {assignments.map((assignment, index) => (
              <div
                key={`driver-${assignment.driver_id}-vehicle-${assignment.vehicle_id || 0}-route-${assignment.route_id || 0}-${index}`}
                className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-blue-600"
              >
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Driver Info */}
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 mb-2">Driver</h3>
                    <div className="space-y-1 text-sm">
                      <p className="font-semibold">{assignment.driver_name || "N/A"}</p>
                      <p className="text-gray-600">{assignment.driver_email || "N/A"}</p>
                      <p className="text-gray-600">{assignment.driver_phone || "N/A"}</p>
                      <p className="text-gray-500">License: {assignment.license_number || "N/A"}</p>
                      <span
                        className={`inline-block px-2 py-1 rounded text-xs font-semibold ${
                          assignment.driver_status === "active"
                            ? "bg-green-100 text-green-800"
                            : "bg-gray-100 text-gray-800"
                        }`}
                      >
                        {assignment.driver_status || "N/A"}
                      </span>
                    </div>
                  </div>

                  {/* Vehicle Info */}
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 mb-2">Vehicle</h3>
                    <div className="space-y-1 text-sm">
                      <p className="font-semibold">
                        {assignment.plate_number || "No vehicle assigned"}
                      </p>
                      {assignment.vehicle_model && (
                        <p className="text-gray-600">Model: {assignment.vehicle_model}</p>
                      )}
                      {assignment.capacity && (
                        <p className="text-gray-600">Capacity: {assignment.capacity} seats</p>
                      )}
                      <span
                        className={`inline-block px-2 py-1 rounded text-xs font-semibold ${
                          assignment.vehicle_status === "active"
                            ? "bg-green-100 text-green-800"
                            : "bg-gray-100 text-gray-800"
                        }`}
                      >
                        {assignment.vehicle_status || "N/A"}
                      </span>
                    </div>
                  </div>

                  {/* Route Info */}
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 mb-2">Route</h3>
                    {assignment.route_name ? (
                      <div className="space-y-1 text-sm">
                        <p className="font-semibold">{assignment.route_name}</p>
                        <p className="text-gray-600">
                          {assignment.start_location} → {assignment.end_location}
                        </p>
                        {assignment.expected_start_time && (
                          <p className="text-blue-600 font-medium">
                            Start: {new Date(assignment.expected_start_time).toLocaleString()}
                          </p>
                        )}
                        {assignment.fare_base && (
                          <p className="text-gray-600">Fare: {assignment.fare_base} RWF</p>
                        )}
                        <p className="text-green-600 font-semibold">
                          Passengers: {assignment.total_passengers || 0}
                        </p>
                      </div>
                    ) : (
                      <p className="text-gray-500">No route assigned</p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default DriverAssignments;

