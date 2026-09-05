import { useCallback, useEffect, useRef, useState } from 'react';
import { ScrollView } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { File } from 'expo-file-system';
import { useAudioPlayer, useAudioPlayerStatus, type AudioSource } from 'expo-audio';
import { useAuth } from '../../src/auth/AuthProvider';
import { getTaskStore } from '../../src/services/local-tasks';
import type { LocalTask } from '../../src/services/task-repository';
import { attachmentsApi, type ImageAttachment as RemoteImageAttachment } from '../../src/services/attachments';
import { tasksApi } from '../../src/services/tasks';
import { deleteLocalFile } from '../../src/services/local-media';
import { persistCapturedPhoto } from '../../src/services/photo-persistence';
import { reconcileImages, type DisplayImage } from '../../src/services/image-sources';
import { requestMicrophonePermission, setAudioModeAsync, takePhoto, RecordingPresets, useAudioRecorder, useAudioRecorderState } from '../../src/services/peripherals';
import { AppBadge, AppButton, AppConfirmModal, AppFeedback, AppHeader, AppText, AuthenticatedImage, Card, Screen, StateMessage } from '../../src/ui/components';

type ImageAttachment = DisplayImage;
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
  const { user, token, accessMode } = useAuth();
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const recorderState = useAudioRecorderState(recorder);
  const player = useAudioPlayer(null);
  const playerStatus = useAudioPlayerStatus(player);
  const [task, setTask] = useState<LocalTask>();
  const [images, setImages] = useState<ImageAttachment[]>([]);
  const [audios, setAudios] = useState<AudioAttachment[]>([]);
  const [error, setError] = useState<string>();
  const [audioError, setAudioError] = useState<string>();
  const [audioState, setAudioState] = useState<AudioState>('idle');
  const [pendingRecording, setPendingRecording] = useState<PendingRecording>();
  const [playingKey, setPlayingKey] = useState<string>();
  const [deletingAttachment, setDeletingAttachment] = useState<string>();
  const [confirmAttachment, setConfirmAttachment] = useState<{ type: 'image' | 'audio'; id: string }>();
  const [feedback, setFeedback] = useState<{ message: string; tone: 'success' | 'error' | 'info' }>();
  const [loading, setLoading] = useState(true);
  const [imageLoading, setImageLoading] = useState(false);
  const pendingRecordingRef = useRef<PendingRecording | undefined>(undefined);
  const photoContextRef = useRef('');
  photoContextRef.current = `${user?.id ?? ''}:${task?.localId ?? ''}`;

  const loadData = useCallback(async () => {
    if (!id || !user) return;
    setLoading(true);
    setError(undefined);
    try {
      const store = await getTaskStore();
      const localTask = await store.find(user.id, id);
      if (!localTask) throw new Error('missing');
      let loadedTask = localTask;
      if (accessMode === 'remote' && token && localTask.remoteId && localTask.syncState === 'clean') {
        loadedTask = await store.saveRemote(user.id, await tasksApi.get(token, localTask.remoteId));
      }
      setTask(loadedTask);
      const localFiles = (await store.listLocalImages(user.id)).filter((file) => file.taskLocalId === loadedTask.localId);
      let remoteImages: RemoteImageAttachment[] = [];
      let loadedAudios: AudioAttachment[] = [];
      if (accessMode === 'remote' && token && loadedTask.remoteId) {
        remoteImages = await attachmentsApi.images(token, loadedTask.remoteId);
        loadedAudios = await attachmentsApi.audios(token, loadedTask.remoteId);
      }
      const loadedImages = reconcileImages(localFiles, remoteImages);
      setImages(loadedImages); setAudios(loadedAudios);
    } catch {
      setError('No se pudo cargar la tarea. Comprueba tu conexión e inténtalo nuevamente.');
    } finally {
      setLoading(false);
    }
  }, [accessMode, id, token, user]);

  useEffect(() => { void loadData(); }, [loadData]);

  useEffect(() => {
    pendingRecordingRef.current = pendingRecording;
  }, [pendingRecording]);


  useEffect(() => {
    return () => {
      try { if (recorder.isRecording) void recorder.stop(); } catch { /* native recorder cleanup is best effort */ }
      void setAudioModeAsync({ playsInSilentMode: true, allowsRecording: false }).catch(() => undefined);
      try { player.pause(); void player.seekTo(0).catch(() => undefined); } catch { /* player cleanup is best effort */ }
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
    const photoContext = photoContextRef.current;
    try {
      const photo = await takePhoto();
      if (!photo || !task || !user || photoContextRef.current !== photoContext) return;
      const store = await getTaskStore();
      const file = await persistCapturedPhoto(store, user.id, task.localId, photo);
      const uri = file.uri;
      if (photoContextRef.current !== photoContext) return;
      setImages((current) => [{ id: file.id, identity: file.id, localFileId: file.id, filename: 'Fotografía local pendiente', url: uri, mimeType: photo.mimeType ?? 'image/jpeg', size: photo.fileSize ?? 0, createdAt: file.createdAt, localUri: uri }, ...current]);
      setFeedback({ message: 'Fotografía guardada localmente. Pendiente de sincronización.', tone: 'info' });
    } catch (error) {
      const message = error instanceof Error && error.message === 'Selected image is unavailable.'
        ? 'La captura temporal ya no está disponible; toma la fotografía nuevamente.'
        : 'No se pudo guardar la fotografía en el almacenamiento local.';
      setFeedback({ message, tone: 'error' });
    } finally {
      setImageLoading(false);
    }
  };

  const removeImage = (imageId: string) => {
    if (deletingAttachment || imageLoading || audioState === 'uploading') return;
    setConfirmAttachment({ type: 'image', id: imageId });
  };

  const confirmRemoveImage = async (imageId: string) => {
    if (!task || !user) return;
    setDeletingAttachment(imageId);
    try {
      const image = images.find((item) => item.identity === imageId);
      const store = await getTaskStore();
      if (image?.remoteImageId && task.remoteId) {
        if (!token || accessMode !== 'remote') throw new Error('Remote session required.');
        await attachmentsApi.deleteImage(token, task.remoteId, image.remoteImageId);
      }
      if (image?.localFileId) {
        const uri = await store.deleteLocalImage(user.id, task.localId, image.localFileId);
        if (uri) deleteLocalFile(uri);
      }
      setImages((current) => current.filter((item) => item.identity !== imageId));
      setFeedback({ message: 'Imagen eliminada.', tone: 'success' });
    } catch {
      setFeedback({ message: 'No se pudo eliminar la imagen. Inténtalo de nuevo.', tone: 'error' });
    } finally {
      setDeletingAttachment(undefined);
      setConfirmAttachment(undefined);
    }
  };

  const removeAudio = (audioId: string) => {
    if (deletingAttachment || imageLoading || audioState === 'uploading') return;
    setConfirmAttachment({ type: 'audio', id: audioId });
  };

  const confirmRemoveAudio = async (audioId: string) => {
    if (!token || !task?.remoteId) return;
    setDeletingAttachment(audioId);
    try {
      if (playingKey === audioId) {
        player.pause();
        await player.seekTo(0);
        setPlayingKey(undefined);
      }
      await attachmentsApi.deleteAudio(token, task.remoteId, audioId);
      setAudios((current) => current.filter((audio) => audio.id !== audioId));
      setFeedback({ message: 'Audio eliminado.', tone: 'success' });
    } catch {
      setFeedback({ message: 'No se pudo eliminar el audio. Inténtalo de nuevo.', tone: 'error' });
    } finally {
      setDeletingAttachment(undefined);
      setConfirmAttachment(undefined);
    }
  };

  const handleAudioError = (_error: unknown, fallback: string) => {
    setAudioError(fallback);
    setFeedback({ message: fallback, tone: 'error' });
    setAudioState(pendingRecording ? 'preview' : 'idle');
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
      setFeedback({ message: 'Nota de voz guardada.', tone: 'success' });
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

  if (loading) return <Screen><StateMessage title="Cargando tarea..." /></Screen>;
  if (error) return <Screen><StateMessage title={error} tone="error" actionTitle="Reintentar" onAction={() => void loadData()} /></Screen>;
  if (!task) return <Screen><StateMessage title="No se encontró la tarea." tone="error" /></Screen>;

  const storedLocation = task.latitude !== null && task.longitude !== null && task.locationAccuracy !== null && task.locationTimestamp !== null
    ? { latitude: task.latitude, longitude: task.longitude, accuracy: task.locationAccuracy, timestamp: task.locationTimestamp }
    : undefined;
  const isBusy = audioState === 'requesting_permission' || audioState === 'stopping' || audioState === 'uploading' || imageLoading || Boolean(deletingAttachment);
  const recordingSeconds = recorderState.durationMillis / 1000;

  return <>
    <Screen>
      <ScrollView className="flex-1" contentContainerClassName="pb-xxl">
        <AppHeader title="Detalle de tarea" onBack={() => router.back()} right={<AppBadge label={task.completed ? 'Completada' : 'Pendiente'} tone={task.completed ? 'success' : 'warning'} />} />
        <AppText variant="display">{task.title}</AppText>
        <AppFeedback message={feedback?.message} tone={feedback?.tone} />
        <Card>
          <AppText variant="title">Información</AppText>
          {task.description && <AppText variant="bodySecondary" muted className="mt-sm">{task.description}</AppText>}
          <AppText variant="caption" muted className="mt-sm">Creada el {new Date(task.createdAt).toLocaleDateString()}</AppText>
        </Card>
        <Card>
          <AppText variant="title">Ubicación</AppText>
          {storedLocation ? <><AppText variant="bodySecondary" muted className="mt-sm">{storedLocation.latitude}, {storedLocation.longitude}</AppText><AppText variant="caption" muted className="mt-xs">Precisión {Math.round(storedLocation.accuracy)} m · {new Date(storedLocation.timestamp).toLocaleString()}</AppText></> : <AppText variant="bodySecondary" muted className="mt-sm">No hay ubicación asociada.</AppText>}
        </Card>
        <Card>
          <AppText variant="title">Imágenes</AppText>
          <AppButton title={imageLoading ? 'Guardando fotografía...' : 'Añadir fotografía'} variant="secondary" onPress={() => void addPhoto()} disabled={isBusy} />
          {images.length === 0 && <StateMessage title="Esta tarea no tiene imágenes." />}
          {images.map((image) => <Card key={image.identity} className="p-md">
            <AuthenticatedImage
              identity={`${task.ownerId}:${image.identity}`}
              localUri={image.localUri}
              remoteUri={task.remoteId && image.remoteImageId ? attachmentsApi.imageContentUrl(image, task.remoteId) : undefined}
              token={accessMode === 'remote' ? token ?? undefined : undefined}
              className="w-full h-52 rounded-medium"
            />
            <AppText variant="caption" muted className="mt-sm">{image.filename}</AppText>
            <AppButton title="Eliminar imagen" variant="danger" loading={deletingAttachment === image.identity} onPress={() => removeImage(image.identity)} disabled={isBusy} />
          </Card>)}
        </Card>
        <Card>
          <AppText variant="title">Notas de voz</AppText>
          {audioState === 'recording' && <AppText variant="bodySecondary">Grabando... {formatDuration(recordingSeconds)}</AppText>}
          {audioState === 'stopping' && <AppText variant="bodySecondary">Deteniendo grabación...</AppText>}
          {audioState === 'uploading' && <AppText variant="bodySecondary">Guardando audio...</AppText>}
          {audioState === 'recording' ? <><AppButton title="Detener grabación" onPress={() => void stopRecording()} disabled={audioState !== 'recording'} /><AppButton title="Cancelar grabación" variant="ghost" onPress={() => void cancelRecording()} disabled={audioState !== 'recording'} /></> : <AppButton title="Grabar nota de voz" onPress={() => void startRecording()} disabled={isBusy || Boolean(pendingRecording) || audioState === 'playing'} />}
          {pendingRecording && <Card><AppText variant="bodySecondary">Vista previa · {formatDuration(pendingRecording.duration)}</AppText><AppButton title={playingKey === 'preview' && playerStatus.playing ? 'Reproduciendo vista previa' : 'Reproducir vista previa'} onPress={playPreview} disabled={isBusy || audioState === 'playing'} /><AppButton title="Detener reproducción" variant="ghost" onPress={() => void stopPlayback()} disabled={playingKey !== 'preview'} /><AppButton title="Cancelar vista previa" variant="ghost" onPress={() => void cancelRecording()} disabled={isBusy} /><AppButton title="Guardar nota de voz" onPress={() => void saveRecording()} disabled={isBusy || audioState !== 'preview'} /></Card>}
          {audioError && <StateMessage title={audioError} tone="error" />}
          {audios.length === 0 && <StateMessage title="Esta tarea no tiene notas de voz." />}
          {audios.map((audio) => <Card key={audio.id}><AppText variant="bodySecondary">{formatDuration(audio.duration)} · {audio.mimeType} · {audio.size} bytes</AppText><AppButton title={playingKey === audio.id && playerStatus.playing ? 'Reproduciendo nota de voz' : 'Reproducir nota de voz'} onPress={() => playAudio(audio)} disabled={isBusy || audioState === 'playing'} /><AppButton title="Detener reproducción" variant="ghost" onPress={() => void stopPlayback()} disabled={playingKey !== audio.id} /><AppButton title="Eliminar audio" variant="danger" loading={deletingAttachment === audio.id} onPress={() => removeAudio(audio.id)} disabled={isBusy} /></Card>)}
        </Card>
      </ScrollView>
    </Screen>
    <AppConfirmModal visible={Boolean(confirmAttachment)} title={confirmAttachment?.type === 'audio' ? '¿Eliminar nota de voz?' : '¿Eliminar imagen?'} description="Esta acción no se puede deshacer." confirmLabel="Eliminar" loading={Boolean(deletingAttachment)} onCancel={() => setConfirmAttachment(undefined)} onConfirm={() => { if (!confirmAttachment) return; void (confirmAttachment.type === 'audio' ? confirmRemoveAudio(confirmAttachment.id) : confirmRemoveImage(confirmAttachment.id)); }} />
  </>;
}
