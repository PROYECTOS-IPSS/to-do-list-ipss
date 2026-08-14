import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { AudioModule, RecordingPresets, setAudioModeAsync, useAudioRecorder, useAudioRecorderState } from 'expo-audio';

export const takePhoto = async () => {
  const permission = await ImagePicker.requestCameraPermissionsAsync();
  if (!permission.granted) throw new Error('Camera permission denied.');
  const result = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.8 });
  return result.canceled ? undefined : result.assets[0];
};

export const getCurrentLocation = async () => {
  const permission = await Location.requestForegroundPermissionsAsync();
  if (permission.status !== 'granted') throw new Error('Location permission denied.');
  return Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
};

export const requestMicrophonePermission = () => AudioModule.requestRecordingPermissionsAsync();
export { RecordingPresets, setAudioModeAsync, useAudioRecorder, useAudioRecorderState };
