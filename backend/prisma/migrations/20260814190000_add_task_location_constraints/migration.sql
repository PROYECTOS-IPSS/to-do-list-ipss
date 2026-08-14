-- Keep location optional while preventing partial or out-of-range new values.
ALTER TABLE "Task"
  ADD CONSTRAINT "Task_location_fields_complete_check"
  CHECK (
    ("latitude" IS NULL AND "longitude" IS NULL AND "locationAccuracy" IS NULL AND "locationTimestamp" IS NULL)
    OR
    ("latitude" IS NOT NULL AND "longitude" IS NOT NULL AND "locationAccuracy" IS NOT NULL AND "locationTimestamp" IS NOT NULL)
  ) NOT VALID;

ALTER TABLE "Task"
  ADD CONSTRAINT "Task_latitude_range_check"
  CHECK ("latitude" IS NULL OR ("latitude" >= -90 AND "latitude" <= 90)) NOT VALID;

ALTER TABLE "Task"
  ADD CONSTRAINT "Task_longitude_range_check"
  CHECK ("longitude" IS NULL OR ("longitude" >= -180 AND "longitude" <= 180)) NOT VALID;

ALTER TABLE "Task"
  ADD CONSTRAINT "Task_location_accuracy_check"
  CHECK ("locationAccuracy" IS NULL OR ("locationAccuracy" >= 0 AND "locationAccuracy" <= 100000)) NOT VALID;
