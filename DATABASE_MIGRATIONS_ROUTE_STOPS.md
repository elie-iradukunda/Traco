# Database Migration for Route Stops/Sub-routes

Run this SQL to add route stops functionality:

```sql
-- Create route_stops table for sub-routes (districts, sectors)
CREATE TABLE IF NOT EXISTS route_stops (
  stop_id SERIAL PRIMARY KEY,
  route_id INTEGER REFERENCES routes(route_id) ON DELETE CASCADE,
  stop_name VARCHAR(255) NOT NULL,
  stop_order INTEGER NOT NULL, -- Order of stop in the route (1, 2, 3, etc.)
  distance_from_start_km DECIMAL(10, 2) DEFAULT 0, -- Distance from route start in km
  fare_from_start DECIMAL(10, 2) DEFAULT 0, -- Fare from route start to this stop
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(route_id, stop_order)
);

CREATE INDEX IF NOT EXISTS idx_route_stops_route ON route_stops(route_id);
CREATE INDEX IF NOT EXISTS idx_route_stops_order ON route_stops(route_id, stop_order);

-- Add columns to tickets for actual start and end stops
ALTER TABLE tickets 
ADD COLUMN IF NOT EXISTS start_stop_id INTEGER REFERENCES route_stops(stop_id),
ADD COLUMN IF NOT EXISTS end_stop_id INTEGER REFERENCES route_stops(stop_id),
ADD COLUMN IF NOT EXISTS actual_start_location VARCHAR(255),
ADD COLUMN IF NOT EXISTS actual_end_location VARCHAR(255),
ADD COLUMN IF NOT EXISTS calculated_fare DECIMAL(10, 2);
```

