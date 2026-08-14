import { useEffect, useState } from 'react';
import { Alert, Button, FlatList, Image, Pressable, Text, TextInput, View } from 'react-native';
import { Redirect, useRouter } from 'expo-router';
import { useAuth } from '../src/auth/AuthProvider';
import { attachmentsApi } from '../src/services/attachments';
import { getCurrentLocation, takePhoto } from '../src/services/peripherals';
import { tasksApi, type Task } from '../src/services/tasks';

export default function Index() {
  const { user, token, loading: authLoading, logout } = useAuth();
  const router = useRouter();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [editingId, setEditingId] = useState<string>();
  const [location, setLocation] = useState<{ latitude: number; longitude: number; accuracy: number | null; timestamp: string }>();
  const [photoUri, setPhotoUri] = useState<string>();
  const [photoPending, setPhotoPending] = useState(false);
  const [error, setError] = useState<string>();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    void tasksApi.list(token).then(setTasks).catch((e: unknown) => setError(e instanceof Error ? e.message : 'Unable to load tasks.')).finally(() => setLoading(false));
  }, [token]);

  if (authLoading) return <Text>Loading session...</Text>;
  if (!user || !token) return <Redirect href="/auth/login" />;

  const attachLocation = async () => {
    try {
      const result = await getCurrentLocation();
      setLocation({ latitude: result.coords.latitude, longitude: result.coords.longitude, accuracy: result.coords.accuracy, timestamp: new Date(result.timestamp).toISOString() });
    } catch (e) { Alert.alert('Location unavailable', e instanceof Error ? e.message : 'Unable to get location.'); }
  };

  const attachPhoto = async () => {
    try {
      const photo = await takePhoto();
      if (photo) { setPhotoUri(photo.uri); setPhotoPending(true); }
    } catch (e) { Alert.alert('Camera unavailable', e instanceof Error ? e.message : 'Unable to capture photo.'); }
  };

  const saveTask = async () => {
    if (!title.trim()) return;
    try {
      const input = { title: title.trim(), description: description.trim() || null, ...(location && { latitude: location.latitude, longitude: location.longitude, locationAccuracy: location.accuracy, locationTimestamp: location.timestamp }) };
      const task = editingId ? await tasksApi.update(token, editingId, input) : await tasksApi.create(token, input);
      if (photoPending && photoUri) await attachmentsApi.uploadImage(token, task.id, photoUri);
      setTasks((current) => editingId ? current.map((item) => item.id === task.id ? task : item) : [task, ...current]);
      setTitle(''); setDescription(''); setEditingId(undefined); setLocation(undefined); setPhotoUri(undefined); setPhotoPending(false);
    } catch { Alert.alert('Error', 'Unable to save task or image.'); }
  };

  const toggleTask = async (task: Task) => { try { const updated = await tasksApi.update(token, task.id, { completed: !task.completed }); setTasks((current) => current.map((item) => item.id === updated.id ? updated : item)); } catch { Alert.alert('Error', 'Unable to update task.'); } };
  const removeTask = async (id: string) => { try { await tasksApi.remove(token, id); setTasks((current) => current.filter((task) => task.id !== id)); } catch { Alert.alert('Error', 'Unable to delete task.'); } };

  return <View><Text>Task Manager</Text><Button title="Logout" onPress={() => void logout()} /><TextInput value={title} onChangeText={setTitle} placeholder="Task title" /><TextInput value={description} onChangeText={setDescription} placeholder="Description" /><Button title="Associate current location" onPress={() => void attachLocation()} />{location && <Text>Location: {location.latitude}, {location.longitude}</Text>}<Button title="Add photograph" onPress={() => void attachPhoto()} />{photoUri && <View><Image source={{ uri: photoUri }} style={{ width: 200, height: 200 }} /><Button title="Remove photo preview" onPress={() => { setPhotoUri(undefined); setPhotoPending(false); }} /></View>}<Button title={editingId ? 'Save changes' : 'Add task'} onPress={() => void saveTask()} />{loading && <Text>Loading...</Text>}{error && <Text>{error}</Text>}{!loading && !error && tasks.length === 0 && <Text>No tasks yet.</Text>}<FlatList data={tasks} keyExtractor={(task) => task.id} renderItem={({ item }) => <View><Pressable onPress={() => router.push(`/tasks/${item.id}` as never)}><Text>{item.completed ? '✓ ' : ''}{item.title}</Text></Pressable>{item.description && <Text>{item.description}</Text>}<Button title={item.completed ? 'Mark incomplete' : 'Complete'} onPress={() => void toggleTask(item)} /><Button title="Edit" onPress={() => { setEditingId(item.id); setTitle(item.title); setDescription(item.description ?? ''); }} /><Button title="Delete" onPress={() => void removeTask(item.id)} /></View>} /></View>;
}
