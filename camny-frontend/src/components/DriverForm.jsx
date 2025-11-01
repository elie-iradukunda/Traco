import React from "react";
import { UserPlus, Edit, Save, X, ShieldCheck } from "lucide-react";

const DriverForm = ({
  users,
  drivers,
  newDriver,
  setNewDriver,
  editMode,
  selectedDriver,
  driverUser,
  handleCreateOrUpdate,
  resetForm,
  isSaving
}) => {

  const commonInputClasses = "w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 transition duration-150 text-gray-700 appearance-none";
  const labelClasses = "block text-sm font-medium text-gray-700 mb-1";

  return (
    <div className="bg-white p-6 rounded-xl shadow-2xl h-fit sticky top-4 border border-gray-100">
      <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center">
        {editMode ? <Edit className="w-5 h-5 mr-2 text-yellow-600" /> : <UserPlus className="w-5 h-5 mr-2 text-blue-600" />}
        {editMode ? `Edit Driver: ${driverUser?.full_name || selectedDriver?.driver_id}` : "Onboard New Driver"}
      </h2>

      <form onSubmit={handleCreateOrUpdate} className="space-y-4">

        {/* User Selection */}
        {!editMode ? (
          <div>
            <label className={labelClasses}>Select Associated User</label>
            <select
              value={newDriver.user_id}
              onChange={(e) => setNewDriver({ ...newDriver, user_id: e.target.value })}
              className={commonInputClasses}
              required
            >
              <option value="" disabled>Choose a user to become a driver</option>
              {users
                .filter(u => !drivers.some(d => d.user_id === u.user_id))
                .map((u) => (
                  <option key={u.user_id} value={u.user_id}>
                    {u.full_name} ({u.email})
                  </option>
              ))}
            </select>
          </div>
        ) : (
          <div className="p-3 bg-yellow-50 text-yellow-800 rounded-lg text-sm border border-yellow-200">
            Editing: **{driverUser?.full_name}** (User ID: {selectedDriver?.user_id})
          </div>
        )}

        {/* License Number */}
        <div>
          <label className={labelClasses}>License Number</label>
          <div className="relative">
            <ShieldCheck className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="e.g., ABC-12345"
              value={newDriver.license_number}
              onChange={(e) => setNewDriver({ ...newDriver, license_number: e.target.value })}
              className={`${commonInputClasses} pl-10`}
              required
            />
          </div>
        </div>

        {/* Status */}
        <div>
          <label className={labelClasses}>Status</label>
          <select
            value={newDriver.status}
            onChange={(e) => setNewDriver({ ...newDriver, status: e.target.value })}
            className={commonInputClasses}
          >
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="on_leave">On Leave</option>
          </select>
        </div>

        {/* Action Buttons */}
        <div className="flex space-x-3 pt-2">
          <button
            type="submit"
            disabled={isSaving}
            className={`flex-1 flex items-center justify-center py-2 px-4 rounded-lg text-white font-semibold transition duration-200 ${
              isSaving 
                ? 'bg-blue-400 cursor-not-allowed' 
                : 'bg-blue-600 hover:bg-blue-700 shadow-md hover:shadow-lg'
            }`}
          >
            {isSaving ? (
              <svg className="animate-spin h-5 w-5 mr-2 text-white" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            ) : editMode ? (
              <><Save className="w-5 h-5 mr-2" /> Update Driver</>
            ) : (
              <><UserPlus className="w-5 h-5 mr-2" /> Add Driver</>
            )}
          </button>
          
          {editMode && (
            <button
              type="button"
              onClick={resetForm}
              className="w-1/3 flex items-center justify-center py-2 px-4 border border-gray-300 rounded-lg text-gray-700 bg-gray-100 hover:bg-gray-200 transition duration-200 font-medium"
            >
              <X className="w-5 h-5 mr-1" /> Cancel
            </button>
          )}
        </div>
      </form>
    </div>
  );
};

export default DriverForm;
