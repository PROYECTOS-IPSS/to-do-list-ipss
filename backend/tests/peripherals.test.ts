jest.mock('expo-image-picker', () => ({
  requestCameraPermissionsAsync: jest.fn(),
  launchCameraAsync: jest.fn()
}));

jest.mock('expo-location', () => ({
  Accuracy: { High: 'high' },
  requestForegroundPermissionsAsync: jest.fn(),
  hasServicesEnabledAsync: jest.fn(),
  getProviderStatusAsync: jest.fn(),
  getCurrentPositionAsync: jest.fn()
}));

jest.mock('expo-audio', () => ({
  AudioModule: { requestRecordingPermissionsAsync: jest.fn() },
  RecordingPresets: { HIGH_QUALITY: 'high' },
  setAudioModeAsync: jest.fn(),
  useAudioRecorder: jest.fn(),
  useAudioRecorderState: jest.fn()
}));

import * as Location from 'expo-location';
import { AudioModule } from 'expo-audio';
import { getCurrentLocation, requestMicrophonePermission } from '../../mobile/src/services/peripherals';

type LocationModule = jest.Mocked<typeof Location>;
const locationApi = Location as LocationModule;

beforeEach(() => jest.clearAllMocks());

describe('mobile GPS service', () => {
  it('requests permission and returns a precise location when granted', async () => {
    jest.mocked(locationApi.requestForegroundPermissionsAsync).mockResolvedValue({ status: 'granted' } as never);
    jest.mocked(locationApi.hasServicesEnabledAsync).mockResolvedValue(true);
    jest.mocked(locationApi.getProviderStatusAsync).mockResolvedValue({ locationServicesEnabled: true, gpsAvailable: true, networkAvailable: true } as never);
    jest.mocked(locationApi.getCurrentPositionAsync).mockResolvedValue({
      coords: { latitude: 40.4, longitude: -3.7, accuracy: 12 },
      timestamp: Date.parse('2026-08-14T12:00:00.000Z')
    } as never);

    await expect(getCurrentLocation()).resolves.toEqual({
      latitude: 40.4,
      longitude: -3.7,
      accuracy: 12,
      timestamp: '2026-08-14T12:00:00.000Z'
    });
    expect(locationApi.getCurrentPositionAsync).toHaveBeenCalledWith({ accuracy: 'high', mayShowUserSettingsDialog: false });
  });

  it('rejects denied permission without querying services', async () => {
    jest.mocked(locationApi.requestForegroundPermissionsAsync).mockResolvedValue({ status: 'denied' } as never);

    await expect(getCurrentLocation()).rejects.toThrow('Location permission denied.');
    expect(locationApi.hasServicesEnabledAsync).not.toHaveBeenCalled();
  });

  it('rejects unavailable providers', async () => {
    jest.mocked(locationApi.requestForegroundPermissionsAsync).mockResolvedValue({ status: 'granted' } as never);
    jest.mocked(locationApi.hasServicesEnabledAsync).mockResolvedValue(false);

    await expect(getCurrentLocation()).rejects.toThrow('Location services are unavailable.');
    expect(locationApi.getProviderStatusAsync).not.toHaveBeenCalled();
    expect(locationApi.getCurrentPositionAsync).not.toHaveBeenCalled();
  });

  it('rejects provider status failures, GPS errors, and insufficient accuracy', async () => {
    jest.mocked(locationApi.requestForegroundPermissionsAsync).mockResolvedValue({ status: 'granted' } as never);
    jest.mocked(locationApi.hasServicesEnabledAsync).mockResolvedValue(true);
    jest.mocked(locationApi.getProviderStatusAsync).mockResolvedValue({ locationServicesEnabled: false, gpsAvailable: false, networkAvailable: false } as never);
    await expect(getCurrentLocation()).rejects.toThrow('Location services are unavailable.');

    jest.mocked(locationApi.getProviderStatusAsync).mockResolvedValue({ locationServicesEnabled: true, gpsAvailable: true, networkAvailable: true } as never);
    jest.mocked(locationApi.getCurrentPositionAsync).mockRejectedValueOnce(new Error('GPS timeout'));
    await expect(getCurrentLocation()).rejects.toThrow('GPS timeout');

    jest.mocked(locationApi.getCurrentPositionAsync).mockResolvedValueOnce({
      coords: { latitude: 40.4, longitude: -3.7, accuracy: 101 },
      timestamp: Date.now()
    } as never);
    await expect(getCurrentLocation()).rejects.toThrow('Location accuracy is insufficient.');
  });
});

describe('mobile microphone permission service', () => {
  it('returns granted microphone permission', async () => {
    jest.mocked(AudioModule.requestRecordingPermissionsAsync).mockResolvedValue({ granted: true } as never);
    await expect(requestMicrophonePermission()).resolves.toEqual({ granted: true });
  });

  it('returns denied microphone permission without starting recording', async () => {
    jest.mocked(AudioModule.requestRecordingPermissionsAsync).mockResolvedValue({ granted: false } as never);
    await expect(requestMicrophonePermission()).resolves.toEqual({ granted: false });
  });
});
