import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Button, FlatList, Image, Pressable, Text, TextInput, View } from 'react-native';
import { Redirect, useRouter } from 'expo-router';
import { useAuth } from '../src/auth/AuthProvider';
import { attachmentsApi } from '../src/services/attachments';
import { getCurrentLocation, takePhoto } from '../src/services/peripherals';
import { preferences, type TaskFilter } from '../src/services/preferences';
import { tasksApi, type Task, type TaskLocationClearInput, type TaskLocationInput } from '../src/services/tasks';
import type { TaskLocation } from '../src/services/location-validation';

const locationInput = (location: TaskLocation): TaskLocationInput => ({
  latitude: location.latitude,
  longitude: location.longitude,
  locationAccuracy: location.accuracy,
  locationTimestamp: location.timestamp
});

const taskLocation = (task: Task): TaskLocation | undefined => {
  if (task.latitude === null || task.longitude === null || task.locationAccuracy === null || task.locationTimestamp === null) return undefined;
  return { latitude: task.latitude, longitude: task.longitude, accuracy: task.locationAccuracy, timestamp: task.locationTimestamp };
};

const clearLocation = (): TaskLocationClearInput => ({
  latitude: null,
  longitude: null,
  locationAccuracy: null,
  locationTimestamp: null
});

export default function Index() {
  const { user, token, loading: authLoading, logout } = useAuth();
  const router = useRouter();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [editingId, setEditingId] = useState<string>();
  const [location, setLocation] = useState<TaskLocation>();
  const [locationLoading, setLocationLoading] = useState(false);
  const [photoUri, setPhotoUri] = useState<string>();
  const [photoPending, setPhotoPending] = useState(false);
  const [photoLoading, setPhotoLoading] = useState(false);
  const [error, setError] = useState<string>();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [updatingId, setUpdatingId] = useState<string>();
  const [deletingId, setDeletingId] = useState<string>();
  const [loggingOut, setLoggingOut] = useState(false);
  const [filter, setFilter] = useState<TaskFilter>('all');
  const [filterReady, setFilterReady] = useState(false);

  const loadTasks = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(undefined);
    try {
      setTasks(await tasksApi.list(token));
    } catch {
      setError('No se pudieron cargar las tareas. Comprueba tu conexión e inténtalo nuevamente.');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { void loadTasks(); }, [loadTasks]);

  useEffect(() => {
    let active = true;
    void preferences.getTaskFilter().then((value) => {
      if (active) { setFilter(value); setFilterReady(true); }
    });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (filterReady) void preferences.setTaskFilter(filter);
  }, [filter, filterReady]);

  const visibleTasks = useMemo(() => tasks.filter((task) => filter === 'all' || (filter === 'completed' ? task.completed : !task.completed)), [filter, tasks]);

  if (authLoading) return <Text>Loading session...</Text>;
  if (!user || !token) return <Redirect href="/auth/login" />;

  const attachLocation = async () => {
    if (locationLoading || saving) return;
    setLocationLoading(true);
    try {
      const nextLocation = await getCurrentLocation();
      if (editingId) {
        const updated = await tasksApi.update(token, editingId, locationInput(nextLocation));
        setTasks((current) => current.map((item) => item.id === updated.id ? updated : item));
      }
      setLocation(nextLocation);
    } catch {
      Alert.alert('Ubicación no disponible', 'No se pudo obtener la ubicación. Comprueba el GPS y vuelve a intentarlo.');
    } finally {
      setLocationLoading(false);
    }
  };

  const removeLocation = async () => {
    if (locationLoading || saving) return;
    if (!editingId) { setLocation(undefined); return; }
    setLocationLoading(true);
    try {
      const updated = await tasksApi.update(token, editingId, clearLocation());
      setTasks((current) => current.map((item) => item.id === updated.id ? updated : item));
      setLocation(undefined);
      Alert.alert('Ubicación actualizada', 'Ubicación eliminada de la tarea.');
    } catch {
      Alert.alert('Error de ubicación', 'No se pudo eliminar la ubicación. Inténtalo nuevamente.');
    } finally {
      setLocationLoading(false);
    }
  };

  const attachPhoto = async () => {
    if (photoLoading || saving) return;
    setPhotoLoading(true);
    try {
      const photo = await takePhoto();
      if (photo) { setPhotoUri(photo.uri); setPhotoPending(true); }
    } catch {
      Alert.alert('Cámara no disponible', 'No se pudo capturar la fotografía. Inténtalo nuevamente.');
    } finally {
      setPhotoLoading(false);
    }
  };

  const saveTask = async () => {
    if (!title.trim() || saving) return;
    setSaving(true);
    setError(undefined);
    const wasEditing = Boolean(editingId);
    try {
      const input = { title: title.trim(), description: description.trim() || null, ...(location ? locationInput(location) : {}) };
      const task = editingId ? await tasksApi.update(token, editingId, input) : await tasksApi.create(token, input);
      setTasks((current) => wasEditing ? current.map((item) => item.id === task.id ? task : item) : [task, ...current]);
      setTitle(''); setDescription(''); setEditingId(undefined); setLocation(undefined); setPhotoUri(undefined); setPhotoPending(false);
      if (photoPending && photoUri) {
        try { await attachmentsApi.uploadImage(token, task.id, photoUri); }
        catch { Alert.alert('Tarea guardada', 'La tarea se guardó, pero no se pudo subir la imagen. Puedes intentarlo desde el detalle.'); return; }
      }
      Alert.alert(wasEditing ? 'Tarea actualizada' : 'Tarea creada', 'Cambios guardados correctamente.');
    } catch {
      setError('No se pudo guardar la tarea. Inténtalo nuevamente.');
    } finally {
      setSaving(false);
    }
  };

  const toggleTask = async (task: Task) => {
    if (saving || updatingId || deletingId) return;
    setUpdatingId(task.id);
    try {
      const updated = await tasksApi.update(token, task.id, { completed: !task.completed });
      setTasks((current) => current.map((item) => item.id === updated.id ? updated : item));
    } catch {
      Alert.alert('Error', 'No se pudo actualizar la tarea. Inténtalo nuevamente.');
    } finally {
      setUpdatingId(undefined);
    }
  };

  const removeTask = (id: string) => {
    if (deletingId || saving || updatingId) return;
    Alert.alert('¿Eliminar tarea?', 'Esta acción no se puede deshacer.', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', style: 'destructive', onPress: () => { void confirmRemoveTask(id); } }
    ]);
  };

  const confirmRemoveTask = async (id: string) => {
    setDeletingId(id);
    try {
      await tasksApi.remove(token, id);
      setTasks((current) => current.filter((task) => task.id !== id));
      Alert.alert('Tarea eliminada', 'La tarea se eliminó correctamente.');
    } catch {
      Alert.alert('Error', 'No se pudo eliminar la tarea. Inténtalo nuevamente.');
    } finally {
      setDeletingId(undefined);
    }
  };

  const editTask = (task: Task) => {
    if (saving || deletingId) return;
    setEditingId(task.id); setTitle(task.title); setDescription(task.description ?? ''); setLocation(taskLocation(task));
  };

  const handleLogout = async () => {
    if (loggingOut) return;
    setLoggingOut(true);
    try { await logout(); }
    catch { Alert.alert('Error', 'No se pudo cerrar la sesión. Inténtalo nuevamente.'); setLoggingOut(false); }
  };

  return <View>
    <Text>Task Manager</Text>
    <Button title={loggingOut ? 'Logging out...' : 'Logout'} onPress={() => void handleLogout()} disabled={loggingOut} />
    <TextInput value={title} onChangeText={setTitle} placeholder="Task title" editable={!saving} />
    <TextInput value={description} onChangeText={setDescription} placeholder="Description" editable={!saving} />
    <Button title={locationLoading ? 'Getting location...' : 'Associate current location'} onPress={() => void attachLocation()} disabled={locationLoading || saving} />
    {location && <View><Text>Location associated: {location.latitude}, {location.longitude}</Text><Text>Approximate accuracy: {Math.round(location.accuracy)} m</Text><Text>Obtained: {new Date(location.timestamp).toLocaleString()}</Text><Button title="Remove location" onPress={() => void removeLocation()} disabled={locationLoading || saving} /></View>}
    <Button title={photoLoading ? 'Opening camera...' : 'Add photograph'} onPress={() => void attachPhoto()} disabled={photoLoading || saving} />
    {photoUri && <View><Image source={{ uri: photoUri }} style={{ width: 200, height: 200 }} /><Button title="Remove photo preview" onPress={() => { setPhotoUri(undefined); setPhotoPending(false); }} disabled={saving} /></View>}
    <Button title={saving ? 'Saving...' : editingId ? 'Save changes' : 'Add task'} onPress={() => void saveTask()} disabled={saving || !title.trim()} />
    <View><Text>Filter</Text><Button title={filter === 'all' ? 'All (selected)' : 'All'} onPress={() => setFilter('all')} /><Button title={filter === 'active' ? 'Active (selected)' : 'Active'} onPress={() => setFilter('active')} /><Button title={filter === 'completed' ? 'Completed (selected)' : 'Completed'} onPress={() => setFilter('completed')} /></View>
    {loading && <Text>Loading...</Text>}
    {error && <View><Text>{error}</Text><Button title="Retry" onPress={() => void loadTasks()} disabled={loading} /></View>}
    {!loading && !error && tasks.length === 0 && <Text>No tasks yet.</Text>}
    {!loading && !error && tasks.length > 0 && visibleTasks.length === 0 && <Text>No tasks match this filter.</Text>}
    <FlatList data={visibleTasks} keyExtractor={(task) => task.id} renderItem={({ item }) => <View>
      <Pressable onPress={() => router.push(`/tasks/${item.id}` as never)}><Text>{item.completed ? '✓ ' : ''}{item.title}</Text></Pressable>
      {item.description && <Text>{item.description}</Text>}
      {item.latitude !== null && item.longitude !== null && item.locationAccuracy !== null && item.locationTimestamp !== null && <Text>Location associated · accuracy {Math.round(item.locationAccuracy)} m · {new Date(item.locationTimestamp).toLocaleString()}</Text>}
      <Button title={updatingId === item.id ? 'Updating...' : item.completed ? 'Mark incomplete' : 'Complete'} onPress={() => void toggleTask(item)} disabled={Boolean(updatingId || deletingId || saving)} />
      <Button title="Edit" onPress={() => editTask(item)} disabled={Boolean(updatingId || deletingId || saving)} />
      <Button title={deletingId === item.id ? 'Deleting...' : 'Delete'} onPress={() => removeTask(item.id)} disabled={Boolean(updatingId || deletingId || saving)} />
    </View>} />
  </View>;
}
