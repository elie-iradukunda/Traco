# GPS Tracking System Database Migration

Run this SQL to create/update the GPS tracking system:

## 1. Create or Update vehicle_tracking table

```sql
CREATE TABLE IF NOT EXISTS vehicle_tracking (
  tracking_id SERIAL PRIMARY KEY,
  vehicle_id INTEGER REFERENCES vehicles(vehicle_id) ON DELETE CASCADE,
  driver_id INTEGER REFERENCES drivers(driver_id) ON DELETE SET NULL,
  current_location VARCHAR(255),
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  speed DECIMAL(5, 2),
  heading DECIMAL(5, 2),
  estimated_arrival VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_vehicle_tracking_vehicle ON vehicle_tracking(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_vehicle_tracking_created ON vehicle_tracking(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_vehicle_tracking_driver ON vehicle_tracking(driver_id);
```

## 2. Create vehicle_location_live table (for current position)

```sql
CREATE TABLE IF NOT EXISTS vehicle_location_live (
  vehicle_id INTEGER PRIMARY KEY REFERENCES vehicles(vehicle_id) ON DELETE CASCADE,
  driver_id INTEGER REFERENCES drivers(driver_id) ON DELETE SET NULL,
  current_location VARCHAR(255),
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  speed DECIMAL(5, 2),
  heading DECIMAL(5, 2),
  estimated_arrival VARCHAR(255),
  last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_vehicle_location_live_driver ON vehicle_location_live(driver_id);
CREATE INDEX IF NOT EXISTS idx_vehicle_location_live_updated ON vehicle_location_live(last_updated DESC);
```

## 3. Add GPS tracking columns to vehicles table (optional)

```sql
ALTER TABLE vehicles 
ADD COLUMN IF NOT EXISTS gps_enabled BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS last_known_latitude DECIMAL(10, 8),
ADD COLUMN IF NOT EXISTS last_known_longitude DECIMAL(11, 8),
ADD COLUMN IF NOT EXISTS last_location_update TIMESTAMP;
```

## Notes

- `vehicle_tracking`: Historical tracking data (keeps all location updates)
- `vehicle_location_live`: Current/live location (one row per vehicle, gets updated)
- Use latitude/longitude for map display
- `speed` is in km/h
- `heading` is in degrees (0-360)
- Passengers can query `vehicle_location_live` to see real-time vehicle locations
