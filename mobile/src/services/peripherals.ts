import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { AudioModule, RecordingPresets, setAudioModeAsync, useAudioRecorder, useAudioRecorderState } from 'expo-audio';
import { validateLocation, type TaskLocation } from './location-validation';

export const takePhoto = async () => {
  const permission = await ImagePicker.requestCameraPermissionsAsync();
  if (!permission.granted) throw new Error('Camera permission denied.');
  const result = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.8 });
  return result.canceled ? undefined : result.assets[0];
};

export const getCurrentLocation = async (): Promise<TaskLocation> => {
  const permission = await Location.requestForegroundPermissionsAsync();
  if (permission.status !== 'granted') throw new Error('Location permission denied.');

  if (!await Location.hasServicesEnabledAsync()) {
    throw new Error('Location services are unavailable. Enable GPS and try again.');
  }

  const provider = await Location.getProviderStatusAsync();
  if (!provider.locationServicesEnabled || (!provider.gpsAvailable && !provider.networkAvailable)) {
    throw new Error('Location services are unavailable. Enable GPS and try again.');
  }

  const result = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High, mayShowUserSettingsDialog: false });
  return validateLocation({
    latitude: result.coords.latitude,
    longitude: result.coords.longitude,
    accuracy: result.coords.accuracy ?? Number.NaN,
    timestamp: new Date(result.timestamp).toISOString()
  });
};

export const requestMicrophonePermission = () => AudioModule.requestRecordingPermissionsAsync();
export { RecordingPresets, setAudioModeAsync, useAudioRecorder, useAudioRecorderState };
