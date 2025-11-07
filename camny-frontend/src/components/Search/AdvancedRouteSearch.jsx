import React, { useState } from "react";

const AdvancedRouteSearch = ({ onSearch, routes = [] }) => {
  const [filters, setFilters] = useState({
    startLocation: "",
    endLocation: "",
    minFare: "",
    maxFare: "",
    hasVehicle: null,
    sortBy: "route_name"
  });

  const handleFilterChange = (key, value) => {
    setFilters({ ...filters, [key]: value });
  };

  const handleSearch = () => {
    onSearch(filters);
  };

  const handleReset = () => {
    const resetFilters = {
      startLocation: "",
      endLocation: "",
      minFare: "",
      maxFare: "",
      hasVehicle: null,
      sortBy: "route_name"
    };
    setFilters(resetFilters);
    onSearch(resetFilters);
  };

  // Get unique locations from routes
  const startLocations = [...new Set(routes.map(r => r.start_location).filter(Boolean))];
  const endLocations = [...new Set(routes.map(r => r.end_location).filter(Boolean))];

  return (
    <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
      <h3 className="text-xl font-bold text-gray-900 mb-4">🔍 Advanced Search</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Start Location */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">From</label>
          <select
            value={filters.startLocation}
            onChange={(e) => handleFilterChange("startLocation", e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Locations</option>
            {startLocations.map((loc, idx) => (
              <option key={idx} value={loc}>{loc}</option>
            ))}
          </select>
        </div>

        {/* End Location */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">To</label>
          <select
            value={filters.endLocation}
            onChange={(e) => handleFilterChange("endLocation", e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Locations</option>
            {endLocations.map((loc, idx) => (
              <option key={idx} value={loc}>{loc}</option>
            ))}
          </select>
        </div>

        {/* Fare Range */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Fare Range (RWF)</label>
          <div className="flex gap-2">
            <input
              type="number"
              placeholder="Min"
              value={filters.minFare}
              onChange={(e) => handleFilterChange("minFare", e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <input
              type="number"
              placeholder="Max"
              value={filters.maxFare}
              onChange={(e) => handleFilterChange("maxFare", e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Vehicle Availability */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Vehicle Status</label>
          <select
            value={filters.hasVehicle === null ? "" : filters.hasVehicle ? "true" : "false"}
            onChange={(e) => handleFilterChange("hasVehicle", e.target.value === "" ? null : e.target.value === "true")}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Routes</option>
            <option value="true">With Vehicle</option>
            <option value="false">Without Vehicle</option>
          </select>
        </div>

        {/* Sort By */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Sort By</label>
          <select
            value={filters.sortBy}
            onChange={(e) => handleFilterChange("sortBy", e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="route_name">Route Name</option>
            <option value="fare_base">Fare (Low to High)</option>
            <option value="fare_base_desc">Fare (High to Low)</option>
            <option value="distance_km">Distance</option>
          </select>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-4 mt-6">
        <button
          onClick={handleSearch}
          className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold transition-colors shadow-md"
        >
          Search
        </button>
        <button
          onClick={handleReset}
          className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-semibold transition-colors"
        >
          Reset
        </button>
      </div>
    </div>
  );
};

export default AdvancedRouteSearch;

