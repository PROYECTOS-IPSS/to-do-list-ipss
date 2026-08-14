export const MAX_LOCATION_ACCURACY_METERS = 100;

export type TaskLocation = {
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: string;
};

export const validateLocation = (location: TaskLocation): TaskLocation => {
  const timestamp = new Date(location.timestamp);
  if (!Number.isFinite(location.latitude) || location.latitude < -90 || location.latitude > 90) {
    throw new Error('Invalid latitude.');
  }
  if (!Number.isFinite(location.longitude) || location.longitude < -180 || location.longitude > 180) {
    throw new Error('Invalid longitude.');
  }
  if (!Number.isFinite(location.accuracy) || location.accuracy < 0) {
    throw new Error('Invalid location accuracy.');
  }
  if (location.accuracy > MAX_LOCATION_ACCURACY_METERS) {
    throw new Error(`Location accuracy is insufficient. Try again when it is at most ${MAX_LOCATION_ACCURACY_METERS} meters.`);
  }
  if (!Number.isFinite(timestamp.getTime())) {
    throw new Error('Invalid location timestamp.');
  }
  return { ...location, timestamp: timestamp.toISOString() };
};
