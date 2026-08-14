import { useEffect, useState } from 'react';
import { Alert, Button, Image, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAudioPlayer } from 'expo-audio';
import { useAuth } from '../../src/auth/AuthProvider';
import { attachmentsApi } from '../../src/services/attachments';
import { requestMicrophonePermission, takePhoto, RecordingPresets, setAudioModeAsync, useAudioRecorder, useAudioRecorderState } from '../../src/services/peripherals';
import { tasksApi, type Task } from '../../src/services/tasks';

type Attachment = { id: string; url: string; filename: string; duration?: number };

export default function TaskDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { token } = useAuth();
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const recorderState = useAudioRecorderState(recorder);
  const [task, setTask] = useState<Task>();
  const [images, setImages] = useState<Attachment[]>([]);
  const [audios, setAudios] = useState<Attachment[]>([]);
  const [error, setError] = useState<string>();
  const [photoUri, setPhotoUri] = useState<string>();
  const player = useAudioPlayer(audios[0]?.url ?? null);

  useEffect(() => {
    if (!id || !token) return;
    void Promise.all([tasksApi.get(token, id), attachmentsApi.images(token, id), attachmentsApi.audios(token, id)])
      .then(([loadedTask, loadedImages, loadedAudios]) => { setTask(loadedTask); setImages(loadedImages); setAudios(loadedAudios); })
      .catch((e: unknown) => setError(e instanceof Error ? e.message : 'Unable to load task attachments.'));
  }, [id, token]);

  const addPhoto = async () => {
    try { const photo = await takePhoto(); if (photo && token && id) { const image = await attachmentsApi.uploadImage(token, id, photo.uri); setImages((current) => [image, ...current]); setPhotoUri(photo.uri); } }
    catch (e) { Alert.alert('Camera unavailable', e instanceof Error ? e.message : 'Unable to capture photo.'); }
  };

  const removeImage = async (imageId: string) => { if (!token || !id) return; try { await attachmentsApi.deleteImage(token, id, imageId); setImages((current) => current.filter((image) => image.id !== imageId)); } catch { Alert.alert('Error', 'Unable to delete image.'); } };
  const removeAudio = async (audioId: string) => { if (!token || !id) return; try { await attachmentsApi.deleteAudio(token, id, audioId); setAudios((current) => current.filter((audio) => audio.id !== audioId)); } catch { Alert.alert('Error', 'Unable to delete audio.'); } };

  const toggleRecording = async () => {
    try { if (recorderState.isRecording) { await recorder.stop(); if (recorder.uri && token && id) { const audio = await attachmentsApi.uploadAudio(token, id, recorder.uri, recorder.currentTime); setAudios((current) => [audio, ...current]); } } else { const permission = await requestMicrophonePermission(); if (!permission.granted) throw new Error('Microphone permission denied.'); await setAudioModeAsync({ playsInSilentMode: true, allowsRecording: true }); await recorder.prepareToRecordAsync(); recorder.record(); } }
    catch (e) { Alert.alert('Audio unavailable', e instanceof Error ? e.message : 'Unable to record audio.'); }
  };

  if (error) return <Text>{error}</Text>;
  if (!task) return <Text>Loading...</Text>;
  return <View><Text>{task.title}</Text>{task.description && <Text>{task.description}</Text>}<Text>{task.completed ? 'Completed' : 'Pending'}</Text><Button title="Edit" onPress={() => router.back()} /><Button title="Add photograph" onPress={() => void addPhoto()} />{photoUri && <Image source={{ uri: photoUri }} style={{ width: 200, height: 200 }} />}{images.length === 0 && <Text>No images.</Text>}{images.map((image) => <View key={image.id}><Text>{image.filename}</Text><Button title="Delete image" onPress={() => void removeImage(image.id)} /></View>)}<Button title={recorderState.isRecording ? 'Stop recording' : 'Record voice note'} onPress={() => void toggleRecording()} /><Text>{Math.round(recorderState.durationMillis / 1000)}s</Text>{audios.length === 0 && <Text>No audio notes.</Text>}{audios.map((audio) => <View key={audio.id}><Text>{audio.filename}</Text><Button title="Play voice note" onPress={() => player.play()} /><Button title="Delete audio" onPress={() => void removeAudio(audio.id)} /></View>)}</View>;
}
