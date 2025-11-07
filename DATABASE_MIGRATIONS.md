# Database Migration SQL

Run these SQL commands to add the required columns for the new features:

## 1. Add columns to tickets table

```sql
ALTER TABLE tickets 
ADD COLUMN IF NOT EXISTS qr_code VARCHAR(100),
ADD COLUMN IF NOT EXISTS boarding_status VARCHAR(50) DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS journey_status VARCHAR(50),
ADD COLUMN IF NOT EXISTS boarding_confirmed_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS transaction_id VARCHAR(100);
```

## 2. Add expected_start_time to routes table

```sql
ALTER TABLE routes 
ADD COLUMN IF NOT EXISTS expected_start_time TIMESTAMP;
```

## 3. (Optional) Create vehicle_tracking table for location history

```sql
CREATE TABLE IF NOT EXISTS vehicle_tracking (
  tracking_id SERIAL PRIMARY KEY,
  vehicle_id INTEGER REFERENCES vehicles(vehicle_id),
  driver_id INTEGER REFERENCES drivers(driver_id),
  current_location VARCHAR(255),
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  estimated_arrival VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_vehicle_tracking_vehicle ON vehicle_tracking(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_vehicle_tracking_created ON vehicle_tracking(created_at DESC);
```

## Notes

- `qr_code`: Unique identifier for ticket scanning
- `boarding_status`: 'pending', 'confirmed', 'denied'
- `journey_status`: 'pending', 'in_progress', 'completed', 'cancelled'
- `expected_start_time`: When the route/vehicle is expected to depart
- These columns are added with IF NOT EXISTS to prevent errors if they already exist

