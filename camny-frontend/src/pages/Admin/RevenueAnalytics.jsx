import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import AdminLayout from "../../components/Admin/AdminLayout";
import { getRevenueAnalytics, getRoutePerformance } from "../../services/api";
import LogoutButton from "../../components/LogoutButton";

const RevenueAnalytics = () => {
  const navigate = useNavigate();
  const [analytics, setAnalytics] = useState(null);
  const [routePerformance, setRoutePerformance] = useState([]);
  const [period, setPeriod] = useState(30);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [period]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [analyticsRes, performanceRes] = await Promise.all([
        getRevenueAnalytics(period),
        getRoutePerformance()
      ]);
      setAnalytics(analyticsRes.data);
      setRoutePerformance(performanceRes.data || []);
    } catch (err) {
      console.error("Error loading analytics:", err);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-RW', {
      style: 'currency',
      currency: 'RWF',
      minimumFractionDigits: 0
    }).format(amount || 0);
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="p-6 flex justify-center items-center h-64">
          <div className="text-xl text-gray-500">Loading analytics...</div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="p-6 md:p-10 bg-gray-100 min-h-screen">
        <div className="flex justify-between items-center mb-8 border-b pb-3">
          <h1 className="text-3xl font-extrabold text-gray-800">📊 Revenue Analytics</h1>
          <div className="flex gap-4 items-center">
            <select
              value={period}
              onChange={(e) => setPeriod(parseInt(e.target.value))}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value={7}>Last 7 days</option>
              <option value={30}>Last 30 days</option>
              <option value={90}>Last 90 days</option>
              <option value={365}>Last year</option>
            </select>
            <LogoutButton />
          </div>
        </div>

        {analytics && (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white p-6 rounded-xl shadow-lg">
                <h3 className="text-sm font-medium opacity-90 mb-2">Total Revenue</h3>
                <p className="text-3xl font-bold">{formatCurrency(analytics.total?.total_revenue || 0)}</p>
                <p className="text-sm opacity-75 mt-2">{analytics.total?.paid_tickets || 0} paid tickets</p>
              </div>
              <div className="bg-gradient-to-br from-green-500 to-green-600 text-white p-6 rounded-xl shadow-lg">
                <h3 className="text-sm font-medium opacity-90 mb-2">Total Tickets</h3>
                <p className="text-3xl font-bold">{analytics.total?.total_tickets || 0}</p>
                <p className="text-sm opacity-75 mt-2">{analytics.total?.paid_tickets || 0} completed</p>
              </div>
              <div className="bg-gradient-to-br from-yellow-500 to-yellow-600 text-white p-6 rounded-xl shadow-lg">
                <h3 className="text-sm font-medium opacity-90 mb-2">Pending Payments</h3>
                <p className="text-3xl font-bold">{analytics.total?.pending_tickets || 0}</p>
                <p className="text-sm opacity-75 mt-2">Awaiting payment</p>
              </div>
              <div className="bg-gradient-to-br from-purple-500 to-purple-600 text-white p-6 rounded-xl shadow-lg">
                <h3 className="text-sm font-medium opacity-90 mb-2">Average Ticket</h3>
                <p className="text-3xl font-bold">
                  {formatCurrency(
                    analytics.total?.total_revenue / (analytics.total?.paid_tickets || 1) || 0
                  )}
                </p>
                <p className="text-sm opacity-75 mt-2">Per ticket</p>
              </div>
            </div>

            {/* Revenue Chart (Simple Bar Chart) */}
            <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
              <h2 className="text-2xl font-bold text-gray-800 mb-6">Revenue by Day</h2>
              {analytics.byDay && analytics.byDay.length > 0 ? (
                <div className="space-y-4">
                  {analytics.byDay.map((day, index) => {
                    const maxRevenue = Math.max(...analytics.byDay.map(d => parseFloat(d.revenue || 0)));
                    const percentage = maxRevenue > 0 ? (parseFloat(day.revenue || 0) / maxRevenue) * 100 : 0;
                    return (
                      <div key={index} className="flex items-center gap-4">
                        <div className="w-24 text-sm text-gray-600">
                          {new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </div>
                        <div className="flex-1 bg-gray-200 rounded-full h-8 relative overflow-hidden">
                          <div
                            className="bg-gradient-to-r from-blue-500 to-blue-600 h-full rounded-full flex items-center justify-end pr-2 transition-all duration-500"
                            style={{ width: `${percentage}%` }}
                          >
                            <span className="text-white text-xs font-semibold">
                              {formatCurrency(day.revenue)}
                            </span>
                          </div>
                        </div>
                        <div className="w-20 text-right text-sm font-semibold text-gray-700">
                          {day.ticket_count} tickets
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-8">No revenue data for this period</p>
              )}
            </div>

            {/* Top Routes by Revenue */}
            <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
              <h2 className="text-2xl font-bold text-gray-800 mb-6">Top Routes by Revenue</h2>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">Route</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">Revenue</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">Tickets</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">Avg Fare</th>
                    </tr>
                  </thead>
                  <tbody>
                    {analytics.byRoute && analytics.byRoute.length > 0 ? (
                      analytics.byRoute.map((route, index) => (
                        <tr key={route.route_id} className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="py-3 px-4">
                            <div>
                              <p className="font-semibold text-gray-900">{route.route_name}</p>
                              <p className="text-sm text-gray-600">
                                {route.start_location} → {route.end_location}
                              </p>
                            </div>
                          </td>
                          <td className="py-3 px-4 font-semibold text-green-600">
                            {formatCurrency(route.revenue || 0)}
                          </td>
                          <td className="py-3 px-4 text-gray-700">{route.ticket_count || 0}</td>
                          <td className="py-3 px-4 text-gray-600">
                            {formatCurrency((route.revenue || 0) / (route.ticket_count || 1))}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="4" className="text-center py-8 text-gray-500">
                          No route data available
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Route Performance */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-2xl font-bold text-gray-800 mb-6">Route Performance</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {routePerformance.slice(0, 9).map((route) => (
                  <div
                    key={route.route_id}
                    className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                  >
                    <h3 className="font-semibold text-gray-900 mb-2">{route.route_name}</h3>
                    <p className="text-sm text-gray-600 mb-4">
                      {route.start_location} → {route.end_location}
                    </p>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Revenue:</span>
                        <span className="font-semibold text-green-600">
                          {formatCurrency(route.revenue || 0)}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Tickets:</span>
                        <span className="font-semibold">{route.completed_tickets || 0}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Passengers:</span>
                        <span className="font-semibold">{route.unique_passengers || 0}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </AdminLayout>
  );
};

export default RevenueAnalytics;

