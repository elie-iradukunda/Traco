# GPS Tracking System Implementation Guide

## Overview
This guide explains how to implement the GPS tracking system for vehicles that allows passengers to track vehicle locations in real-time.

## Database Setup

### Step 1: Run Database Migrations
Execute the SQL commands from `GPS_TRACKING_MIGRATION.md`:

```bash
# Connect to your PostgreSQL database and run the SQL commands
psql -U your_username -d your_database -f GPS_TRACKING_MIGRATION.md
```

This will create:
- `vehicle_tracking` - Historical tracking data
- `vehicle_location_live` - Current/live location (one row per vehicle)
- GPS-related columns in vehicles table (optional)

## Backend Implementation

### Files Created/Modified:

1. **backend/controllers/trackingController.js** (NEW)
   - Handles GPS tracking operations
   - Functions:
     - `updateVehicleLocation` - Update vehicle GPS position
     - `getVehicleLocation` - Get current location for a vehicle
     - `getAllVehicleLocations` - Get all vehicle locations
     - `getVehicleLocationHistory` - Get historical tracking data
     - `getMyVehicleLocation` - Get vehicle location by ticket ID

2. **backend/routes/tracking.js** (NEW)
   - API routes for GPS tracking
   - Endpoints:
     - `POST /api/tracking/update` - Update location (drivers)
     - `GET /api/tracking/vehicle/:vehicle_id` - Get vehicle location
     - `GET /api/tracking/all` - Get all vehicles
     - `GET /api/tracking/history/:vehicle_id` - Get location history
     - `GET /api/tracking/my-vehicle/:ticket_id` - Track by ticket (passengers)

3. **backend/index.js** (MODIFIED)
   - Added tracking routes: `app.use("/api/tracking", trackingRoutes);`

4. **backend/controllers/journeyController.js** (MODIFIED)
   - Enhanced `updateLocation` to support GPS coordinates
   - Now accepts: latitude, longitude, speed, heading
   - Stores data in both tracking tables

## Frontend Implementation

### Files Created/Modified:

1. **camny-frontend/src/pages/Passenger/TrackVehicle.jsx** (NEW)
   - Real-time vehicle tracking interface for passengers
   - Features:
     - Display current vehicle location
     - Show GPS coordinates on map
     - Auto-refresh every 10 seconds
     - Link to Google Maps
     - Display speed, heading, ETA

2. **camny-frontend/src/pages/Driver/DriverDashboard.jsx** (MODIFIED)
   - Added GPS location capture
   - Features:
     - Get current GPS position using browser Geolocation API
     - Display latitude/longitude
     - Send GPS coordinates with location updates
     - Manual or GPS-based location tracking

3. **camny-frontend/src/App.jsx** (MODIFIED)
   - Added route: `/passenger/track/:ticketId`

4. **camny-frontend/src/pages/Passenger/MyTickets.jsx** (MODIFIED)
   - Added "Track Vehicle" button for each ticket
   - Links to tracking page

5. **camny-frontend/src/services/api.js** (MODIFIED)
   - Added GPS tracking API functions

## How It Works

### For Drivers:

1. **Login to Driver Dashboard**
2. **Go to "Journey" Tab**
3. **Click "Get My GPS Location"** button
   - Browser will request location permission
   - GPS coordinates will be captured automatically
4. **Optionally enter location name** (e.g., "City Center")
5. **Click "Update Location"**
   - Location sent to all passengers with tickets
   - Data stored in tracking tables
6. **Optional: Enable "Auto Update"**
   - Automatically sends location every 30 minutes

### For Passengers:

1. **Login to Passenger Dashboard**
2. **Go to "My Tickets"**
3. **Click "Track Vehicle"** on any ticket
4. **View Real-Time Location:**
   - Current GPS coordinates
   - Location name
   - Speed & heading (if available)
   - Estimated arrival time
   - Last update timestamp
5. **Click "Open in Google Maps"** to view on map
6. **Enable "Auto-refresh"** for live updates every 10 seconds

## API Endpoints

### Driver Endpoints:
```
POST /driver/update-location
Body: {
  vehicle_id: number,
  current_location: string,
  latitude: number,
  longitude: number,
  speed: number (optional),
  heading: number (optional),
  estimated_arrival: string (optional)
}
```

### Passenger Endpoints:
```
GET /api/tracking/my-vehicle/:ticket_id
Returns: {
  ticket: {...},
  location: {
    vehicle_id,
    latitude,
    longitude,
    current_location,
    speed,
    heading,
    estimated_arrival,
    last_updated
  }
}
```

### Admin Endpoints:
```
GET /api/tracking/all
Returns: Array of all vehicle locations

GET /api/tracking/vehicle/:vehicle_id
Returns: Current location for specific vehicle

GET /api/tracking/history/:vehicle_id?limit=50&offset=0
Returns: Historical tracking data
```

## Testing

### Test Driver Location Update:
1. Login as driver
2. Get GPS location
3. Update location
4. Check console for success message
5. Verify passengers receive notification

### Test Passenger Tracking:
1. Login as passenger
2. Go to My Tickets
3. Click Track Vehicle on a ticket
4. Verify location displays
5. Test auto-refresh
6. Click Google Maps link

### Test Database:
```sql
-- Check live locations
SELECT * FROM vehicle_location_live;

-- Check tracking history
SELECT * FROM vehicle_tracking ORDER BY created_at DESC LIMIT 10;

-- Check vehicle assignments
SELECT v.plate_number, vl.current_location, vl.last_updated 
FROM vehicles v
LEFT JOIN vehicle_location_live vl ON v.vehicle_id = vl.vehicle_id;
```

## Browser Geolocation

The system uses the browser's Geolocation API:
- **Requires HTTPS** in production (or localhost for development)
- **User must grant permission** for location access
- **Works on mobile and desktop** browsers
- **Accuracy:** Typically 5-30 meters

### Geolocation Options Used:
```javascript
{
  enableHighAccuracy: true,  // Use GPS if available
  timeout: 10000,            // 10 second timeout
  maximumAge: 0              // Don't use cached position
}
```

## Notifications

When a driver updates location:
- All passengers with tickets on that vehicle receive a notification
- Notification includes: current location and ETA
- Stored in `notifications` table
- Visible in passenger dashboard

## Security

- **Authentication Required:** All tracking endpoints require valid JWT token
- **Authorization:** Drivers can only update their assigned vehicle
- **Privacy:** Passengers can only track vehicles for their tickets

## Performance Considerations

1. **Auto-refresh:** 10 seconds for passengers (configurable)
2. **Auto-update:** 30 minutes for drivers (configurable)
3. **Database Indexes:** Created on vehicle_id and created_at
4. **Live Table:** One row per vehicle (updates in place)
5. **History Table:** Unlimited rows (consider cleanup job)

## Future Enhancements

1. **WebSocket Integration:** Real-time push instead of polling
2. **Map Integration:** Embed Google Maps/Leaflet on tracking page
3. **Route Visualization:** Draw path on map
4. **Speed Alerts:** Notify if vehicle speeding
5. **Geofencing:** Alert when vehicle enters/exits zones
6. **Battery Optimization:** Reduce GPS update frequency
7. **Offline Support:** Cache last known location
8. **Analytics:** Track average speeds, delays, etc.

## Troubleshooting

### GPS Not Working:
- Check browser console for errors
- Ensure HTTPS (or localhost)
- Grant location permission
- Check device GPS settings

### Location Not Updating:
- Verify database migrations ran
- Check network connectivity
- Verify driver is assigned to vehicle
- Check backend logs for errors

### Passengers Not Seeing Location:
- Verify driver has updated location
- Check ticket is for correct vehicle
- Verify database tables exist
- Check API endpoint responses

## Support

For issues or questions:
1. Check database migrations completed
2. Verify API endpoints in browser DevTools
3. Check backend console for errors
4. Review frontend console for errors
