-- Preserve existing whole-second values while allowing fractional seconds.
ALTER TABLE "TaskAudio"
  ALTER COLUMN "duration" TYPE DOUBLE PRECISION
  USING "duration"::double precision;
