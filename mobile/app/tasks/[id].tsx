import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Button, Image, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { File } from 'expo-file-system';
import { useAudioPlayer, useAudioPlayerStatus, type AudioSource } from 'expo-audio';
import { useAuth } from '../../src/auth/AuthProvider';
import { attachmentsApi } from '../../src/services/attachments';
import { requestMicrophonePermission, takePhoto, RecordingPresets, setAudioModeAsync, useAudioRecorder, useAudioRecorderState } from '../../src/services/peripherals';
import { tasksApi, type Task } from '../../src/services/tasks';

type ImageAttachment = { id: string; filename: string };
type AudioAttachment = { id: string; url: string; duration: number; mimeType: string; size: number; createdAt: string };
type PendingRecording = { uri: string; duration: number };
type AudioState = 'idle' | 'requesting_permission' | 'recording' | 'stopping' | 'preview' | 'playing' | 'uploading';

const formatDuration = (seconds: number) => {
  const safeSeconds = Math.max(0, Math.floor(seconds));
  return `${Math.floor(safeSeconds / 60)}:${String(safeSeconds % 60).padStart(2, '0')}`;
};

const discardFile = (uri: string) => {
  try {
    const file = new File(uri);
    if (file.exists) file.delete();
  } catch {
    // Temporary cache cleanup is best effort.
  }
};
const inspectRecordingFile = (uri: string | null) => {
  if (!uri) return { uri, exists: false, size: null, mime: null };
  try {
    const file = new File(uri);
    const info = file.exists ? file.info() : undefined;
    const extension = uri.split('.').pop()?.toLowerCase();
    const mime = extension === 'm4a' ? 'audio/mp4' : extension === 'mp4' ? 'audio/mp4' : extension === 'wav' ? 'audio/wav' : extension === 'mp3' ? 'audio/mpeg' : 'unknown';
    return { uri: file.uri, exists: file.exists, size: info?.size ?? null, mime, info };
  } catch (error) {
    return { uri, exists: false, size: null, mime: null, error: error instanceof Error ? error.message : String(error) };
  }
};

export default function TaskDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { token } = useAuth();
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const recorderState = useAudioRecorderState(recorder);
  const player = useAudioPlayer(null);
  const playerStatus = useAudioPlayerStatus(player);
  const [task, setTask] = useState<Task>();
  const [images, setImages] = useState<ImageAttachment[]>([]);
  const [audios, setAudios] = useState<AudioAttachment[]>([]);
  const [error, setError] = useState<string>();
  const [audioError, setAudioError] = useState<string>();
  const [photoUri, setPhotoUri] = useState<string>();
  const [audioState, setAudioState] = useState<AudioState>('idle');
  const [pendingRecording, setPendingRecording] = useState<PendingRecording>();
  const [playingKey, setPlayingKey] = useState<string>();
  const [loading, setLoading] = useState(true);
  const [imageLoading, setImageLoading] = useState(false);
  const [deletingAttachment, setDeletingAttachment] = useState<string>();
  const pendingRecordingRef = useRef<PendingRecording | undefined>(undefined);

  const loadData = useCallback(async () => {
    if (!id || !token) return;
    setLoading(true);
    setError(undefined);
    try {
      const [loadedTask, loadedImages, loadedAudios] = await Promise.all([tasksApi.get(token, id), attachmentsApi.images(token, id), attachmentsApi.audios(token, id)]);
      setTask(loadedTask); setImages(loadedImages); setAudios(loadedAudios);
    } catch {
      setError('No se pudo cargar la tarea. Comprueba tu conexión e inténtalo nuevamente.');
    } finally {
      setLoading(false);
    }
  }, [id, token]);

  useEffect(() => { void loadData(); }, [loadData]);

  useEffect(() => {
    pendingRecordingRef.current = pendingRecording;
  }, [pendingRecording]);


  useEffect(() => {
    return () => {
      try {
        if (recorder.isRecording) void recorder.stop();
      } catch {
        // Recorder may already be released by expo-audio.
      }
      void setAudioModeAsync({ playsInSilentMode: true, allowsRecording: false }).catch(() => undefined);
      try {
        player.pause();
        void player.seekTo(0).catch(() => undefined);
      } catch {
        // Player may already be released by expo-audio.
      }
      if (pendingRecordingRef.current) discardFile(pendingRecordingRef.current.uri);
    };
  }, [player, recorder]);

  useEffect(() => {
    if (!playerStatus.didJustFinish) return;
    setPlayingKey(undefined);
    setAudioState(pendingRecording ? 'preview' : 'idle');
  }, [pendingRecording, playerStatus.didJustFinish]);

  const addPhoto = async () => {
    if (imageLoading || deletingAttachment || audioState === 'uploading') return;
    setImageLoading(true);
    try {
      const photo = await takePhoto();
      if (photo && token && id) {
        const image = await attachmentsApi.uploadImage(token, id, photo.uri);
        setImages((current) => [image, ...current]);
        setPhotoUri(photo.uri);
      }
    } catch {
      Alert.alert('Cámara no disponible', 'No se pudo capturar o subir la fotografía. Inténtalo nuevamente.');
    } finally {
      setImageLoading(false);
    }
  };

  const removeImage = (imageId: string) => {
    if (deletingAttachment || imageLoading || audioState === 'uploading') return;
    Alert.alert('¿Eliminar imagen?', 'Esta acción no se puede deshacer.', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', style: 'destructive', onPress: () => { void confirmRemoveImage(imageId); } }
    ]);
  };

  const confirmRemoveImage = async (imageId: string) => {
    if (!token || !id) return;
    setDeletingAttachment(imageId);
    try {
      await attachmentsApi.deleteImage(token, id, imageId);
      setImages((current) => current.filter((image) => image.id !== imageId));
      Alert.alert('Imagen eliminada', 'La imagen se eliminó correctamente.');
    } catch {
      Alert.alert('Error', 'No se pudo eliminar la imagen. Inténtalo nuevamente.');
    } finally {
      setDeletingAttachment(undefined);
    }
  };

  const removeAudio = (audioId: string) => {
    if (deletingAttachment || imageLoading || audioState === 'uploading') return;
    Alert.alert('¿Eliminar nota de voz?', 'Esta acción no se puede deshacer.', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', style: 'destructive', onPress: () => { void confirmRemoveAudio(audioId); } }
    ]);
  };

  const confirmRemoveAudio = async (audioId: string) => {
    if (!token || !id) return;
    setDeletingAttachment(audioId);
    try {
      if (playingKey === audioId) {
        player.pause();
        await player.seekTo(0);
        setPlayingKey(undefined);
      }
      await attachmentsApi.deleteAudio(token, id, audioId);
      setAudios((current) => current.filter((audio) => audio.id !== audioId));
      Alert.alert('Audio eliminado', 'La nota de voz se eliminó correctamente.');
    } catch {
      Alert.alert('Error', 'No se pudo eliminar la nota de voz. Inténtalo nuevamente.');
    } finally {
      setDeletingAttachment(undefined);
    }
  };

  const handleAudioError = (error: unknown, fallback: string) => {
    console.warn('[audio]', error);
    setAudioError(fallback);
    setAudioState(pendingRecording ? 'preview' : 'idle');
    Alert.alert('Audio unavailable', fallback);
  };

  const startRecording = async () => {
    if (audioState !== 'idle' || imageLoading || deletingAttachment) return;
    setAudioError(undefined);
    setAudioState('requesting_permission');
    try {
      const permission = await requestMicrophonePermission();
      if (!permission.granted) throw new Error('Microphone permission denied.');
      await setAudioModeAsync({ playsInSilentMode: true, allowsRecording: true });
      await recorder.prepareToRecordAsync();
      recorder.record();
      setAudioState('recording');
    } catch (e) { handleAudioError(e, 'No se pudo iniciar la grabación. Inténtalo nuevamente.'); }
  };

  const stopRecording = async () => {
    if (audioState !== 'recording') return;
    setAudioState('stopping');
    const durationBeforeStop = recorderState.durationMillis / 1000;
    try {
      await recorder.stop();
      const uri = recorder.uri;
      const durationAfterStop = recorder.currentTime;
      const file = inspectRecordingFile(uri);
      await setAudioModeAsync({ playsInSilentMode: true, allowsRecording: false });
      const duration = Number.isFinite(durationBeforeStop) && durationBeforeStop > 0 ? durationBeforeStop : durationAfterStop;
      if (!uri) throw new Error('Recording URI is missing after stop.');
      if (!Number.isFinite(duration) || duration <= 0) throw new Error('Recording duration is invalid.');
      if (!file.exists) throw new Error('Recording file does not exist after stop.');
      if (file.size === null || file.size <= 0) throw new Error('Recording file is empty.');
      setPendingRecording({ uri, duration });
      setAudioState('preview');
    } catch (e) {
      console.error('[audio] stop error', e);
      handleAudioError(e, 'No se pudo detener la grabación. Inténtalo nuevamente.');
    }
  };

  const cancelRecording = async () => {
    try {
      if (recorder.isRecording) await recorder.stop();
      await setAudioModeAsync({ playsInSilentMode: true, allowsRecording: false });
    } catch {
      // Continue cleanup even if native stop fails.
    }
    if (recorder.uri) discardFile(recorder.uri);
    if (pendingRecording) discardFile(pendingRecording.uri);
    player.pause();
    void player.seekTo(0);
    setPendingRecording(undefined);
    setPlayingKey(undefined);
    setAudioError(undefined);
    setAudioState('idle');
  };

  const saveRecording = async () => {
    if (!pendingRecording || !token || !id || audioState !== 'preview') return;
    setAudioState('uploading');
    setAudioError(undefined);
    try {
      const audio = await attachmentsApi.uploadAudio(token, id, pendingRecording.uri, pendingRecording.duration);
      setAudios((current) => [audio, ...current]);
      discardFile(pendingRecording.uri);
      setPendingRecording(undefined);
      setAudioState('idle');
      Alert.alert('Audio guardado', 'La nota de voz se guardó correctamente.');
    } catch (e) {
      setAudioState('preview');
      handleAudioError(e, 'No se pudo guardar el audio. Inténtalo nuevamente.');
    }
  };

  const stopPlayback = async () => {
    player.pause();
    await player.seekTo(0);
    setPlayingKey(undefined);
    setAudioState(pendingRecording ? 'preview' : 'idle');
  };

  const playPreview = () => {
    if (!pendingRecording) return;
    try {
      player.replace(pendingRecording.uri);
      player.play();
      setPlayingKey('preview');
      setAudioState('playing');
    } catch (e) { handleAudioError(e, 'Unable to play recording preview.'); }
  };

  const playAudio = (audio: AudioAttachment) => {
    if (!token || !id) return;
    try {
      const source: AudioSource = {
        uri: attachmentsApi.audioFileUrl(id, audio.id),
        headers: { Authorization: `Bearer ${token}` }
      };
      player.replace(source);
      player.play();
      setPlayingKey(audio.id);
      setAudioState('playing');
    } catch (e) { handleAudioError(e, 'Unable to play audio.'); }
  };

  if (loading) return <View><Text>Loading...</Text></View>;
  if (error) return <View><Text>{error}</Text><Button title="Retry" onPress={() => void loadData()} disabled={loading} /></View>;
  if (!task) return <Text>Task not found.</Text>;

  const storedLocation = task.latitude !== null && task.longitude !== null && task.locationAccuracy !== null && task.locationTimestamp !== null
    ? { latitude: task.latitude, longitude: task.longitude, accuracy: task.locationAccuracy, timestamp: task.locationTimestamp }
    : undefined;
  const isBusy = audioState === 'requesting_permission' || audioState === 'stopping' || audioState === 'uploading' || imageLoading || Boolean(deletingAttachment);
  const recordingSeconds = recorderState.durationMillis / 1000;

  return <View>
    <Text>{task.title}</Text>
    {task.description && <Text>{task.description}</Text>}
    <Text>{task.completed ? 'Completed' : 'Pending'}</Text>
    {storedLocation && <View><Text>Location associated</Text><Text>Coordinates: {storedLocation.latitude}, {storedLocation.longitude}</Text><Text>Approximate accuracy: {Math.round(storedLocation.accuracy)} m</Text><Text>Obtained: {new Date(storedLocation.timestamp).toLocaleString()}</Text></View>}
    {!storedLocation && <Text>No location associated.</Text>}
    <Button title="Edit" onPress={() => router.back()} disabled={isBusy} />
    <Button title={imageLoading ? 'Uploading image...' : 'Add photograph'} onPress={() => void addPhoto()} disabled={isBusy} />
    {photoUri && <Image source={{ uri: photoUri }} style={{ width: 200, height: 200 }} />}
    {images.length === 0 && <Text>No images.</Text>}
    {images.map((image) => <View key={image.id}><Text>{image.filename}</Text><Button title={deletingAttachment === image.id ? 'Deleting...' : 'Delete image'} onPress={() => removeImage(image.id)} disabled={isBusy} /></View>)}

    <Text>Voice notes</Text>
    {audioState === 'recording' && <Text>Recording... {formatDuration(recordingSeconds)}</Text>}
    {audioState === 'stopping' && <Text>Stopping recording...</Text>}
    {audioState === 'uploading' && <Text>Uploading audio...</Text>}
    {audioState === 'recording'
      ? <View><Button title="Stop recording" onPress={() => void stopRecording()} disabled={audioState !== 'recording'} /><Button title="Cancel recording" onPress={() => void cancelRecording()} disabled={audioState !== 'recording'} /></View>
      : <Button title="Record voice note" onPress={() => void startRecording()} disabled={isBusy || Boolean(pendingRecording) || audioState === 'playing'} />}
    {pendingRecording && <View>
      <Text>Preview {formatDuration(pendingRecording.duration)}</Text>
      <Button title={playingKey === 'preview' && playerStatus.playing ? 'Playing preview' : 'Play preview'} onPress={playPreview} disabled={isBusy || audioState === 'playing'} />
      <Button title="Stop preview" onPress={() => void stopPlayback()} disabled={playingKey !== 'preview'} />
      <Button title="Cancel preview" onPress={() => void cancelRecording()} disabled={isBusy} />
      <Button title="Save voice note" onPress={() => void saveRecording()} disabled={isBusy || audioState !== 'preview'} />
    </View>}
    {audioError && <Text>{audioError}</Text>}
    {audios.length === 0 && <Text>No audio notes.</Text>}
    {audios.map((audio) => <View key={audio.id}>
      <Text>{formatDuration(audio.duration)} · {audio.mimeType} · {audio.size} bytes</Text>
      <Button title={playingKey === audio.id && playerStatus.playing ? 'Playing voice note' : 'Play voice note'} onPress={() => playAudio(audio)} disabled={isBusy || audioState === 'playing'} />
      <Button title="Stop playback" onPress={() => void stopPlayback()} disabled={playingKey !== audio.id} />
      <Button title={deletingAttachment === audio.id ? 'Deleting...' : 'Delete audio'} onPress={() => removeAudio(audio.id)} disabled={isBusy} />
    </View>)}
  </View>;
}
