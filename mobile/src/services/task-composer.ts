import { useCallback, useEffect, useRef, useState, type Dispatch, type SetStateAction } from 'react';
import { getCurrentLocation, takePhoto } from './peripherals';
import { tasksApi, type Task, type TaskLocationClearInput, type TaskLocationInput } from './tasks';
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
  editingId?: string;
  saving: boolean;
  setTasks: Dispatch<SetStateAction<Task[]>>;
  setLocation: Dispatch<SetStateAction<TaskLocation | undefined>>;
  setPhotoUri: Dispatch<SetStateAction<string | undefined>>;
  setPhotoPending: Dispatch<SetStateAction<boolean>>;
  setFeedback: (feedback: ComposerFeedback) => void;
};

export const locationInput = (location: TaskLocation): TaskLocationInput => ({
  latitude: location.latitude,
  longitude: location.longitude,
  locationAccuracy: location.accuracy,
  locationTimestamp: location.timestamp
});

const clearLocation = (): TaskLocationClearInput => ({
  latitude: null,
  longitude: null,
  locationAccuracy: null,
  locationTimestamp: null
});

export function useTaskComposer({ token, editingId, saving, setTasks, setLocation, setPhotoUri, setPhotoPending, setFeedback }: TaskComposerOptions): TaskComposer {
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
      if (editingId && token) {
        const updated = await tasksApi.update(token, editingId, locationInput(nextLocation));
        if (mounted.current) setTasks((current) => current.map((item) => item.id === updated.id ? updated : item));
      }
      if (mounted.current) setLocation(nextLocation);
    } catch {
      if (mounted.current) setFeedback({ message: 'No se pudo obtener la ubicación. Revisa el GPS e inténtalo de nuevo.', tone: 'error' });
    } finally {
      locationBusy.current = false;
      if (mounted.current) setLocationLoading(false);
    }
  }, [editingId, setFeedback, setLocation, setTasks, token]);

  const removeLocation = useCallback(async () => {
    if (locationBusy.current || savingRef.current) return;
    if (!editingId) {
      if (mounted.current) setLocation(undefined);
      return;
    }
    if (!token) return;
    locationBusy.current = true;
    if (mounted.current) setLocationLoading(true);
    try {
      const updated = await tasksApi.update(token, editingId, clearLocation());
      if (mounted.current) {
        setTasks((current) => current.map((item) => item.id === updated.id ? updated : item));
        setLocation(undefined);
        setFeedback({ message: 'Ubicación eliminada.', tone: 'success' });
      }
    } catch {
      if (mounted.current) setFeedback({ message: 'No se pudo eliminar la ubicación. Inténtalo de nuevo.', tone: 'error' });
    } finally {
      locationBusy.current = false;
      if (mounted.current) setLocationLoading(false);
    }
  }, [editingId, setFeedback, setLocation, setTasks, token]);

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
