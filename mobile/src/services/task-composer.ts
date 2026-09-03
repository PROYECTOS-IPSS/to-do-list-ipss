import { useCallback, useEffect, useRef, useState, type Dispatch, type SetStateAction } from 'react';
import { getCurrentLocation, takePhoto } from './peripherals';
import type { LocalTask, LocalTaskInput } from './task-repository';
import type { TaskStore } from './task-store';
import type { AccessMode } from '../auth/AuthProvider';
import type { TaskLocation } from './location-validation';

export type ComposerFeedback = { message: string; tone: 'success' | 'error' | 'info' };
export type TaskComposer = {
  locationLoading: boolean;
  photoLoading: boolean;
  attachLocation: () => Promise<void>;
  removeLocation: () => Promise<void>;
  attachPhoto: () => Promise<void>;
};

type TaskComposerOptions = {
  token: string | null;
  accessMode: AccessMode;
  ownerId: string | null;
  taskStore: Pick<TaskStore, 'update'> | null;
  task?: LocalTask;
  saving: boolean;
  setTasks: Dispatch<SetStateAction<LocalTask[]>>;
  setLocation: Dispatch<SetStateAction<TaskLocation | undefined>>;
  setPhotoUri: Dispatch<SetStateAction<string | undefined>>;
  setPhotoPending: Dispatch<SetStateAction<boolean>>;
  setFeedback: (feedback: ComposerFeedback) => void;
};

export const locationInput = (location: TaskLocation): Partial<LocalTaskInput> => ({
  latitude: location.latitude,
  longitude: location.longitude,
  locationAccuracy: location.accuracy,
  locationTimestamp: location.timestamp
});

const clearLocation = (): Partial<LocalTaskInput> => ({
  latitude: null,
  longitude: null,
  locationAccuracy: null,
  locationTimestamp: null
});

export function useTaskComposer({ token, accessMode, ownerId, taskStore, task, saving, setTasks, setLocation, setPhotoUri, setPhotoPending, setFeedback }: TaskComposerOptions): TaskComposer {
  const [locationLoading, setLocationLoading] = useState(false);
  const [photoLoading, setPhotoLoading] = useState(false);
  const locationBusy = useRef(false);
  const photoBusy = useRef(false);
  const savingRef = useRef(saving);
  const mounted = useRef(true);
  savingRef.current = saving;

  useEffect(() => () => { mounted.current = false; }, []);

  const attachLocation = useCallback(async () => {
    if (locationBusy.current || savingRef.current) return;
    locationBusy.current = true;
    if (mounted.current) setLocationLoading(true);
    try {
      const nextLocation = await getCurrentLocation();
      if (task && taskStore && ownerId) {
        const result = await taskStore.update(ownerId, accessMode, token, task, locationInput(nextLocation));
        if (mounted.current && result.task) setTasks((current) => current.map((item) => item.localId === result.task?.localId ? result.task : item));
      }
      if (mounted.current) setLocation(nextLocation);
    } catch {
      if (mounted.current) setFeedback({ message: 'No se pudo obtener la ubicación. Revisa el GPS e inténtalo de nuevo.', tone: 'error' });
    } finally {
      locationBusy.current = false;
      if (mounted.current) setLocationLoading(false);
    }
  }, [accessMode, ownerId, setFeedback, setLocation, setTasks, task, taskStore, token]);

  const removeLocation = useCallback(async () => {
    if (locationBusy.current || savingRef.current) return;
    if (!task || !taskStore || !ownerId) {
      if (mounted.current) setLocation(undefined);
      return;
    }
    locationBusy.current = true;
    if (mounted.current) setLocationLoading(true);
    try {
      await taskStore.update(ownerId, accessMode, token, task, clearLocation());
      if (mounted.current) {
        setTasks((current) => current.map((item) => item.localId === task.localId ? { ...item, latitude: null, longitude: null, locationAccuracy: null, locationTimestamp: null } : item));
        setLocation(undefined);
        setFeedback({ message: 'Ubicación eliminada.', tone: 'success' });
      }
    } catch {
      if (mounted.current) setFeedback({ message: 'No se pudo eliminar la ubicación. Inténtalo de nuevo.', tone: 'error' });
    } finally {
      locationBusy.current = false;
      if (mounted.current) setLocationLoading(false);
    }
  }, [accessMode, ownerId, setFeedback, setLocation, setTasks, task, taskStore, token]);

  const attachPhoto = useCallback(async () => {
    if (photoBusy.current || savingRef.current) return;
    photoBusy.current = true;
    if (mounted.current) setPhotoLoading(true);
    try {
      const photo = await takePhoto();
      if (photo && mounted.current) {
        setPhotoUri(photo.uri);
        setPhotoPending(true);
      }
    } catch {
      if (mounted.current) setFeedback({ message: 'No se pudo capturar la foto. Inténtalo de nuevo.', tone: 'error' });
    } finally {
      photoBusy.current = false;
      if (mounted.current) setPhotoLoading(false);
    }
  }, [setFeedback, setPhotoPending, setPhotoUri]);

  return { locationLoading, photoLoading, attachLocation, removeLocation, attachPhoto };
}
