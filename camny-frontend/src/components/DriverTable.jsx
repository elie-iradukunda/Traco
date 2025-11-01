import React from "react";
import { Edit, Trash2, Send, Car } from "lucide-react";

const DriverTable = ({
  drivers,
  routes,
  selectedRoute,
  setSelectedRoute,
  handleEdit,
  handleInitiateDelete,
  handleInitiateAssignment,
  getRouteName
}) => {
  return (
    <div className="bg-white p-6 rounded-xl shadow-2xl border border-gray-100">
      <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center border-b pb-3">
        <Car className="w-5 h-5 mr-2 text-gray-600" />
        Current Fleet Roster ({drivers.length})
      </h2>

      <div className="overflow-x-auto rounded-lg border border-gray-200 shadow-sm">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50 sticky top-0">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Driver/User</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">License</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Status</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider hidden sm:table-cell">Current Route</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Assign Route</th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-100">
            {drivers.length > 0 ? (
              drivers.map((d) => (
                <tr key={d.driver_id} className="hover:bg-blue-50 transition duration-150">
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{d.full_name}</div>
                    <div className="text-xs text-gray-500">{d.email}</div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700 font-mono">{d.license_number}</td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        d.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>{d.status}</span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600 hidden sm:table-cell">
                    {getRouteName(d.current_route_id)}
                  </td>
                  <td className="px-4 py-3 space-y-2 lg:space-y-0 lg:flex lg:items-center lg:space-x-2">
                    <select
                      value={selectedRoute[d.driver_id] || ""}
                      onChange={(e) =>
                        setSelectedRoute({
                          ...selectedRoute,
                          [d.driver_id]: e.target.value,
                        })
                      }
                      className="w-full lg:w-3/5 border border-gray-300 text-sm p-1.5 rounded-lg focus:ring-blue-500"
                    >
                      <option value="" disabled>Select Route</option>
                      {routes.map((r) => (
                        <option key={r.route_id} value={r.route_id}>
                          {r.route_name}
                        </option>
                      ))}
                    </select>
                    <button
                      onClick={() => handleInitiateAssignment(d.driver_id)}
                      disabled={!selectedRoute[d.driver_id]}
                      className="w-full lg:w-2/5 flex items-center justify-center bg-blue-500 text-white px-3 py-1.5 rounded-lg hover:bg-blue-600 transition disabled:bg-gray-400 text-sm font-medium shadow-sm"
                    >
                      <Send className="w-4 h-4 mr-1" />
                      Assign
                    </button>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-center space-x-2">
                    <button
                      onClick={() => handleEdit(d)}
                      className="text-yellow-600 hover:text-yellow-700 p-1 rounded-full hover:bg-yellow-100 transition"
                      title="Edit Driver"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleInitiateDelete(d.driver_id)}
                      className="text-red-600 hover:text-red-700 p-1 rounded-full hover:bg-red-100 transition"
                      title="Delete Driver"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="6" className="text-center p-8 text-gray-500 text-base">
                  No drivers found in the system. Use the form to onboard a new driver.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default DriverTable;
