import { useCallback, useEffect, useRef, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { File } from 'expo-file-system';
import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { useAuth } from '../../src/auth/AuthProvider';
import { getTaskStore } from '../../src/services/local-tasks';
import type { LocalTask } from '../../src/services/task-repository';
import { attachmentsApi, type ImageAttachment as RemoteImageAttachment } from '../../src/services/attachments';
import { tasksApi } from '../../src/services/tasks';
import { deleteLocalFile, copyLocalAudio } from '../../src/services/local-media';
import { persistCapturedPhoto } from '../../src/services/photo-persistence';
import { reconcileImages, type DisplayImage } from '../../src/services/image-sources';
import { requestMicrophonePermission, setAudioModeAsync, takePhoto, RecordingPresets, useAudioRecorder, useAudioRecorderState } from '../../src/services/peripherals';
import { AppBadge, AppButton, AppConfirmModal, AppFeedback, AppHeader, AppText, AuthenticatedImage, AttachmentSection, DetailSection, InlineEmptyState, LocationPanel, MetadataRow, Screen, StateMessage } from '../../src/ui/components';

type ImageAttachment = DisplayImage;
type AudioAttachment = { id: string; uri: string; filename: string; duration: number; mimeType: string; size: number; createdAt: string };
type PendingRecording = { uri: string; duration: number };
type AudioState = 'idle' | 'requesting_permission' | 'recording' | 'stopping' | 'preview' | 'playing' | 'persisting';

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
      const localAudios = await store.listLocalAudios(user.id, loadedTask.localId);
      const loadedAudios: AudioAttachment[] = localAudios.map((audio) => ({ id: audio.id, uri: audio.uri, filename: audio.filename, duration: audio.durationSeconds, mimeType: audio.mimeType, size: audio.size, createdAt: audio.createdAt }));
      let remoteImages: RemoteImageAttachment[] = [];
      if (accessMode === 'remote' && token && loadedTask.remoteId) remoteImages = await attachmentsApi.images(token, loadedTask.remoteId);
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
    if (imageLoading || deletingAttachment || audioState === 'persisting') return;
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
    if (deletingAttachment || imageLoading || audioState === 'persisting') return;
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
    if (deletingAttachment || imageLoading || audioState === 'persisting') return;
    setConfirmAttachment({ type: 'audio', id: audioId });
  };

  const confirmRemoveAudio = async (audioId: string) => {
    if (!task || !user) return;
    setDeletingAttachment(audioId);
    try {
      if (playingKey === audioId) await stopPlayback();
      const store = await getTaskStore();
      const uri = await store.deleteLocalAudio(user.id, task.localId, audioId);
      if (uri) deleteLocalFile(uri);
      setAudios((current) => current.filter((audio) => audio.id !== audioId));
      setFeedback({ message: 'Audio eliminado.', tone: 'success' });
    } catch {
      setFeedback({ message: 'No se pudo eliminar el audio. Inténtalo de nuevo.', tone: 'error' });
    } finally {
      setDeletingAttachment(undefined); setConfirmAttachment(undefined);
    }
  };

  const handleAudioError = (_error: unknown, fallback: string) => {
    setAudioError(fallback); setFeedback({ message: fallback, tone: 'error' });
    setAudioState(pendingRecording ? 'preview' : 'idle');
  };

  const startRecording = async () => {
    if (audioState !== 'idle' || imageLoading || deletingAttachment) return;
    setAudioError(undefined); setAudioState('requesting_permission');
    try {
      const permission = await requestMicrophonePermission();
      if (!permission.granted) throw new Error('Microphone permission denied.');
      await setAudioModeAsync({ playsInSilentMode: true, allowsRecording: true });
      await recorder.prepareToRecordAsync(); recorder.record(); setAudioState('recording');
    } catch (e) { handleAudioError(e, 'No se pudo iniciar la grabación. Inténtalo nuevamente.'); }
  };

  const stopRecording = async () => {
    if (audioState !== 'recording') return;
    setAudioState('stopping');
    try {
      const before = recorderState.durationMillis / 1000;
      await recorder.stop();
      const uri = recorder.uri;
      const file = inspectRecordingFile(uri);
      await setAudioModeAsync({ playsInSilentMode: true, allowsRecording: false });
      const duration = before > 0 ? before : recorder.currentTime;
      if (!uri || !file.exists || !file.size) throw new Error('Recording file is unavailable.');
      if (!Number.isFinite(duration) || duration <= 0) throw new Error('Recording duration is invalid.');
      setPendingRecording({ uri, duration }); setAudioState('preview');
    } catch (e) { handleAudioError(e, 'No se pudo detener la grabación. Inténtalo nuevamente.'); }
  };

  const cancelRecording = async () => {
    try { if (recorder.isRecording) await recorder.stop(); } catch { /* best effort */ }
    if (recorder.uri) discardFile(recorder.uri);
    if (pendingRecording) discardFile(pendingRecording.uri);
    player.pause(); void player.seekTo(0); setPendingRecording(undefined); setPlayingKey(undefined); setAudioState('idle');
  };

  const saveRecording = async () => {
    if (!pendingRecording || !task || !user || audioState !== 'preview') return;
    setAudioState('persisting');
    try {
      const extension = new File(pendingRecording.uri).extension || '.m4a';
      const filename = `audio-${Date.now()}${extension}`;
      const uri = await copyLocalAudio(user.id, task.localId, pendingRecording.uri, filename);
      const info = new File(uri).info();
      const store = await getTaskStore();
      const audio = await store.saveLocalAudio(user.id, task.localId, { uri, filename, mimeType: extension === '.m4a' ? 'audio/mp4' : 'audio/*', size: info.size ?? 0, durationSeconds: pendingRecording.duration });
      discardFile(pendingRecording.uri); setPendingRecording(undefined); setAudioState('idle');
      setAudios((current) => [{ id: audio.id, uri: audio.uri, filename: audio.filename, duration: audio.durationSeconds, mimeType: audio.mimeType, size: audio.size, createdAt: audio.createdAt }, ...current]);
      setFeedback({ message: 'Nota de voz guardada localmente y disponible sin conexión.', tone: 'success' });
    } catch { setAudioState('preview'); handleAudioError(undefined, 'No se pudo guardar localmente la nota de voz.'); }
  };

  const stopPlayback = async () => {
    player.pause(); await player.seekTo(0); setPlayingKey(undefined); setAudioState(pendingRecording ? 'preview' : 'idle');
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
    try {
      player.replace(audio.uri); player.play(); setPlayingKey(audio.id); setAudioState('playing');
    } catch (e) { handleAudioError(e, 'No se pudo reproducir el audio.'); }
  };

  if (loading) return <Screen><StateMessage title="Cargando tarea..." /></Screen>;
  if (error) return <Screen><StateMessage title={error} tone="error" actionTitle="Reintentar" onAction={() => void loadData()} /></Screen>;
  if (!task) return <Screen><StateMessage title="No se encontró la tarea." tone="error" /></Screen>;

  const storedLocation = task.latitude !== null && task.longitude !== null && task.locationAccuracy !== null && task.locationTimestamp !== null
    ? { latitude: task.latitude, longitude: task.longitude, accuracy: task.locationAccuracy, timestamp: task.locationTimestamp }
    : undefined;
  const isBusy = audioState === 'requesting_permission' || audioState === 'stopping' || audioState === 'persisting' || imageLoading || Boolean(deletingAttachment);
  const recordingSeconds = recorderState.durationMillis / 1000;

  return <>
    <Screen>
      <ScrollView className="flex-1" contentContainerClassName="pb-xxl">
        <AppHeader title="Detalle de tarea" onBack={() => router.back()} right={<AppBadge label={task.completed ? 'Completada' : 'Pendiente'} tone={task.completed ? 'success' : 'warning'} />} />
        <View className="mb-lg">
          <AppText variant="display">{task.title}</AppText>
          <AppText variant="caption" muted className="mt-xs">{task.completed ? 'Tarea completada' : 'Tarea pendiente'}</AppText>
        </View>
        <AppFeedback message={feedback?.message} tone={feedback?.tone} />
        <DetailSection title="Información principal" description="Detalles de esta tarea.">
          {task.description ? <AppText variant="body">{task.description}</AppText> : <InlineEmptyState title="Sin descripción." />}
          <View className="mt-sm"><MetadataRow label="Creada" value={new Date(task.createdAt).toLocaleDateString()} /></View>
        </DetailSection>
        <LocationPanel location={storedLocation} emptyTitle="No hay ubicación asociada." />
        <AttachmentSection title="Fotografías" description="Imágenes asociadas a esta tarea." addTitle="Añadir foto" addLoading={imageLoading} onAdd={() => void addPhoto()} disabled={isBusy} emptyTitle="Esta tarea no tiene fotografías.">
          {images.length === 0 ? <InlineEmptyState title="Esta tarea no tiene fotografías." /> : <View className="gap-md">{images.map((image) => <View key={image.identity} className="rounded-medium border border-border bg-surfaceMuted p-md">
            <AuthenticatedImage
              identity={`${task.ownerId}:${image.identity}`}
              localUri={image.localUri}
              remoteUri={task.remoteId && image.remoteImageId ? attachmentsApi.imageContentUrl(image, task.remoteId) : undefined}
              token={accessMode === 'remote' ? token ?? undefined : undefined}
              accessibilityLabel={`Fotografía de ${image.filename}`}
              className="w-full h-52 rounded-medium"
            />
            <AppText variant="caption" muted className="mt-sm">{image.filename}</AppText>
            <AppButton title="Eliminar imagen" variant="destructive" loading={deletingAttachment === image.identity} onPress={() => removeImage(image.identity)} disabled={isBusy} />
          </View>)}</View>}
        </AttachmentSection>
        <DetailSection title="Notas de voz" description="Grabaciones guardadas solo en este dispositivo." action={<AppButton title="Grabar nota" variant="secondary" onPress={() => void startRecording()} disabled={isBusy || Boolean(pendingRecording) || audioState === 'playing'} />}>
          {audioState === 'recording' && <AppText variant="bodySecondary">Grabando... {formatDuration(recordingSeconds)}</AppText>}
          {audioState === 'stopping' && <AppText variant="bodySecondary">Deteniendo grabación...</AppText>}
          {audioState === 'persisting' && <AppText variant="bodySecondary">Guardando audio localmente...</AppText>}
          {audioState === 'recording' && <View className="flex-row gap-sm"><AppButton title="Detener grabación" onPress={() => void stopRecording()} disabled={audioState !== 'recording'} className="flex-1" /><AppButton title="Cancelar" variant="ghost" onPress={() => void cancelRecording()} disabled={audioState !== 'recording'} className="flex-1" /></View>}
          {pendingRecording && <View className="rounded-medium border border-primary bg-primarySoft p-md"><AppText variant="bodySecondary">Vista previa · {formatDuration(pendingRecording.duration)}</AppText><AppButton title={playingKey === 'preview' && playerStatus.playing ? 'Reproduciendo vista previa' : 'Reproducir vista previa'} onPress={playPreview} disabled={isBusy || audioState === 'playing'} /><AppButton title="Detener reproducción" variant="ghost" onPress={() => void stopPlayback()} disabled={playingKey !== 'preview'} /><AppButton title="Cancelar vista previa" variant="ghost" onPress={() => void cancelRecording()} disabled={isBusy} /><AppButton title="Guardar nota de voz" onPress={() => void saveRecording()} disabled={isBusy || audioState !== 'preview'} /></View>}
          {audioError && <StateMessage title={audioError} tone="error" />}
          {audios.length === 0 ? <InlineEmptyState title="Esta tarea no tiene notas de voz." /> : <View className="gap-md">{audios.map((audio) => <View key={audio.id} className="rounded-medium border border-border bg-surfaceMuted p-md"><MetadataRow label="Duración" value={formatDuration(audio.duration)} /><AppButton title={playingKey === audio.id && playerStatus.playing ? 'Reproduciendo nota de voz' : 'Reproducir nota de voz'} onPress={() => playAudio(audio)} disabled={isBusy || audioState === 'playing'} /><AppButton title="Detener reproducción" variant="ghost" onPress={() => void stopPlayback()} disabled={playingKey !== audio.id} /><AppButton title="Eliminar audio" variant="destructive" loading={deletingAttachment === audio.id} onPress={() => removeAudio(audio.id)} disabled={isBusy} /></View>)}</View>}
        </DetailSection>
      </ScrollView>
    </Screen>
    <AppConfirmModal visible={Boolean(confirmAttachment)} title={confirmAttachment?.type === 'audio' ? '¿Eliminar nota de voz?' : '¿Eliminar imagen?'} description="Esta acción no se puede deshacer." confirmLabel="Eliminar" loading={Boolean(deletingAttachment)} onCancel={() => setConfirmAttachment(undefined)} onConfirm={() => { if (!confirmAttachment) return; void (confirmAttachment.type === 'audio' ? confirmRemoveAudio(confirmAttachment.id) : confirmRemoveImage(confirmAttachment.id)); }} />
  </>;
}
