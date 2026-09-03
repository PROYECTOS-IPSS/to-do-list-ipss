import { useCallback, useEffect, useMemo, useState } from 'react';
import { FlatList, Image, View } from 'react-native';
import { Redirect, useRouter } from 'expo-router';
import { useAuth } from '../src/auth/AuthProvider';
import { attachmentsApi } from '../src/services/attachments';
import { preferences, type TaskFilter } from '../src/services/preferences';
import { tasksApi, type Task } from '../src/services/tasks';
import type { TaskLocation } from '../src/services/location-validation';
import { AppBadge, AppButton, AppConfirmModal, AppFeedback, AppInput, AppLogo, AppText, Card, Screen, StateMessage, TaskCard } from '../src/ui/components';
import { locationInput, useTaskComposer } from '../src/services/task-composer';


const taskLocation = (task: Task): TaskLocation | undefined => {
  if (task.latitude === null || task.longitude === null || task.locationAccuracy === null || task.locationTimestamp === null) return undefined;
  return { latitude: task.latitude, longitude: task.longitude, accuracy: task.locationAccuracy, timestamp: task.locationTimestamp };
};


export default function Index() {
  const { user, token, loading: authLoading, restoreError, retryRestore, logout } = useAuth();
  const router = useRouter();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [editingId, setEditingId] = useState<string>();
  const [location, setLocation] = useState<TaskLocation>();
  const [photoUri, setPhotoUri] = useState<string>();
  const [photoPending, setPhotoPending] = useState(false);
  const [error, setError] = useState<string>();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [updatingId, setUpdatingId] = useState<string>();
  const [deletingId, setDeletingId] = useState<string>();
  const [loggingOut, setLoggingOut] = useState(false);
  const [filter, setFilter] = useState<TaskFilter>('all');
  const [filterReady, setFilterReady] = useState(false);
  const [confirmTaskId, setConfirmTaskId] = useState<string>();
  const [feedback, setFeedback] = useState<{ message: string; tone: 'success' | 'error' | 'info' }>();
  const [taskImageUrls, setTaskImageUrls] = useState<Record<string, string>>({});
  const { locationLoading, photoLoading, attachLocation, removeLocation, attachPhoto } = useTaskComposer({ token, editingId, saving, setTasks, setLocation, setPhotoUri, setPhotoPending, setFeedback });

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
    if (!token || tasks.length === 0) { setTaskImageUrls({}); return; }
    let active = true;
    // ponytail: one attachment metadata request per task; replace with list preview metadata if scale requires it.
    void Promise.all(tasks.map(async (task) => {
      try {
        const images = await attachmentsApi.images(token, task.id) as Array<{ id: string }>;
        return [task.id, images[0] ? attachmentsApi.imageFileUrl(task.id, images[0].id) : ''] as const;
      } catch {
        return [task.id, ''] as const;
      }
    })).then((entries) => {
      if (active) setTaskImageUrls(Object.fromEntries(entries.filter(([, url]) => url)));
    });
    return () => { active = false; };
  }, [tasks, token]);

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
  const taskSummary = useMemo(() => ({ total: tasks.length, active: tasks.filter((task) => !task.completed).length, completed: tasks.filter((task) => task.completed).length }), [tasks]);

  if (authLoading) return <Screen><StateMessage title="Cargando sesión..." /></Screen>;
  if (restoreError) return <Screen><StateMessage title={restoreError} tone="error" actionTitle="Reintentar" onAction={() => void retryRestore()} /></Screen>;
  if (!user || !token) return <Redirect href="/auth/login" />;
  const authenticatedToken = token;
  const authenticatedUser = user;


  const saveTask = async () => {
    if (!title.trim() || saving) return;
    setSaving(true);
    setError(undefined);
    const wasEditing = Boolean(editingId);
    try {
      const input = { title: title.trim(), description: description.trim() || null, ...(location ? locationInput(location) : {}) };
      const task = editingId ? await tasksApi.update(authenticatedToken, editingId, input) : await tasksApi.create(authenticatedToken, input);
      setTasks((current) => wasEditing ? current.map((item) => item.id === task.id ? task : item) : [task, ...current]);
      setTitle(''); setDescription(''); setEditingId(undefined); setLocation(undefined); setPhotoUri(undefined); setPhotoPending(false);
      if (photoPending && photoUri) {
        try { await attachmentsApi.uploadImage(authenticatedToken, task.id, photoUri); }
        catch { setFeedback({ message: 'La tarea se guardó, pero no se pudo subir la imagen.', tone: 'error' }); return; }
      }
      setFeedback({ message: wasEditing ? 'Tarea actualizada.' : 'Tarea creada.', tone: 'success' });
    } catch {
      setFeedback({ message: 'No se pudo guardar la tarea. Inténtalo de nuevo.', tone: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const toggleTask = async (task: Task) => {
    if (saving || updatingId || deletingId) return;
    setUpdatingId(task.id);
    try {
      const updated = await tasksApi.update(authenticatedToken, task.id, { completed: !task.completed });
      setTasks((current) => current.map((item) => item.id === updated.id ? updated : item));
    } catch {
      setFeedback({ message: 'No se pudo actualizar la tarea. Inténtalo de nuevo.', tone: 'error' });
    } finally {
      setUpdatingId(undefined);
    }
  };

  const removeTask = (id: string) => {
    if (deletingId || saving || updatingId) return;
    setConfirmTaskId(id);
  };
  const confirmRemoveTask = async (id: string) => {
    setDeletingId(id);
    try {
      await tasksApi.remove(authenticatedToken, id);
      setTasks((current) => current.filter((task) => task.id !== id));
      setFeedback({ message: 'Tarea eliminada.', tone: 'success' });
    } catch {
      setFeedback({ message: 'No se pudo eliminar la tarea. Inténtalo de nuevo.', tone: 'error' });
    } finally {
      setDeletingId(undefined);
      setConfirmTaskId(undefined);
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
    catch { setFeedback({ message: 'No se pudo cerrar la sesión. Inténtalo de nuevo.', tone: 'error' }); setLoggingOut(false); }
  };

  return <Screen>
    <FlatList
      className="flex-1"
      contentContainerClassName="pb-xxl"
      ListHeaderComponent={<View>
        <View className="flex-row items-start justify-between mb-lg"><View className="flex-row items-center gap-md flex-1"><AppLogo compact /><View className="flex-1"><AppText variant="caption" muted>Hola{authenticatedUser.name ? `, ${authenticatedUser.name}` : ''}</AppText><AppText variant="display">Task desk</AppText><AppText variant="bodySecondary" muted>Organiza tu día con calma.</AppText></View></View><AppButton title="Cerrar sesión" variant="ghost" loading={loggingOut} onPress={() => void handleLogout()} accessibilityLabel="Cerrar sesión" /></View>
        <View className="flex-row items-center justify-between mb-md"><AppBadge label="Tu espacio" tone="accent" /><AppFeedback message={feedback?.message} tone={feedback?.tone} /></View>
        <View className="flex-row gap-sm mb-lg">
          <Card className="flex-1 p-md"><AppText variant="heading">{taskSummary.total}</AppText><AppText variant="caption" muted>Total</AppText></Card>
          <Card className="flex-1 p-md"><AppText variant="heading" className="text-warning">{taskSummary.active}</AppText><AppText variant="caption" muted>Pendientes</AppText></Card>
          <Card className="flex-1 p-md"><AppText variant="heading" className="text-success">{taskSummary.completed}</AppText><AppText variant="caption" muted>Completadas</AppText></Card>
        </View>
        <Card>
          <AppText variant="heading">{editingId ? 'Editar tarea' : 'Crear una tarea'}</AppText>
          <AppText variant="bodySecondary" muted className="mb-md">Anota lo siguiente que quieres sacar adelante.</AppText>
          <AppInput label="Título" value={title} onChangeText={setTitle} placeholder="¿Qué necesitas hacer?" editable={!saving} />
          <AppInput label="Descripción" value={description} onChangeText={setDescription} placeholder="Añade contexto útil" editable={!saving} multiline />
          <AppButton title={locationLoading ? 'Obteniendo ubicación...' : 'Asociar ubicación actual'} variant="secondary" onPress={() => void attachLocation()} disabled={locationLoading || saving} />
          {location && <Card className="p-md"><AppText variant="label">Ubicación asociada</AppText><AppText variant="bodySecondary" muted>{location.latitude}, {location.longitude}</AppText><AppText variant="caption" muted>Precisión {Math.round(location.accuracy)} m · {new Date(location.timestamp).toLocaleString()}</AppText><AppButton title="Quitar ubicación" variant="ghost" onPress={() => void removeLocation()} disabled={locationLoading || saving} /></Card>}
          <AppButton title={photoLoading ? 'Abriendo cámara...' : 'Añadir fotografía'} variant="secondary" onPress={() => void attachPhoto()} disabled={photoLoading || saving} />
          {photoUri && <Card className="p-md"><Image source={{ uri: photoUri }} className="w-full h-[180px] rounded-medium" /><AppButton title="Quitar vista previa" variant="ghost" onPress={() => { setPhotoUri(undefined); setPhotoPending(false); }} disabled={saving} /></Card>}
          <AppButton title={editingId ? 'Guardar cambios' : 'Añadir tarea'} loading={saving} onPress={() => void saveTask()} disabled={!title.trim()} accessibilityLabel={editingId ? 'Guardar cambios de la tarea' : 'Crear tarea'} />
        </Card>
        <View className="flex-row items-center justify-between mb-sm"><AppText variant="title">Tus tareas</AppText><AppText variant="caption" muted>{visibleTasks.length} visibles</AppText></View>
        <View className="flex-row gap-xs mb-md">
          <AppButton title={filter === 'all' ? 'Todas ✓' : 'Todas'} variant={filter === 'all' ? 'secondary' : 'ghost'} onPress={() => setFilter('all')} accessibilityLabel="Mostrar todas las tareas" className="flex-1" />
          <AppButton title={filter === 'active' ? 'Pendientes ✓' : 'Pendientes'} variant={filter === 'active' ? 'secondary' : 'ghost'} onPress={() => setFilter('active')} accessibilityLabel="Mostrar tareas pendientes" className="flex-1" />
          <AppButton title={filter === 'completed' ? 'Completadas ✓' : 'Completadas'} variant={filter === 'completed' ? 'secondary' : 'ghost'} onPress={() => setFilter('completed')} accessibilityLabel="Mostrar tareas completadas" className="flex-1" />
        </View>
        {loading && <StateMessage title="Cargando tareas..." />}
        {error && <StateMessage title={error} tone="error" actionTitle="Reintentar" onAction={() => void loadTasks()} />}
        {!loading && !error && tasks.length === 0 && <StateMessage title="Todavía no tienes tareas. Añade la primera arriba." />}
        {!loading && !error && tasks.length > 0 && visibleTasks.length === 0 && <StateMessage title="Ninguna tarea coincide con este filtro." />}
      </View>}
      data={visibleTasks}
      keyExtractor={(task) => task.id}
      renderItem={({ item }) => <TaskCard
        title={item.title}
        description={item.description}
        dateLabel={new Date(item.createdAt).toLocaleDateString()}
        imageUrl={taskImageUrls[item.id]}
        imageToken={token ?? undefined}
        completed={item.completed}
        locationLabel={item.latitude !== null && item.longitude !== null && item.locationAccuracy !== null && item.locationTimestamp !== null ? `Ubicación · precisión ${Math.round(item.locationAccuracy)} m` : undefined}
        onOpen={() => router.push(`/tasks/${item.id}` as never)}
        onToggle={() => void toggleTask(item)}
        onEdit={() => editTask(item)}
        onDelete={() => removeTask(item.id)}
        toggleLoading={updatingId === item.id}
        deleteLoading={deletingId === item.id}
        disabled={Boolean(updatingId || deletingId || saving)}
      />}
      ListFooterComponent={<View className="h-xxl" />}
    />
    <AppConfirmModal visible={Boolean(confirmTaskId)} title="¿Eliminar tarea?" description="Esta acción no se puede deshacer." confirmLabel="Eliminar" loading={Boolean(deletingId)} onCancel={() => setConfirmTaskId(undefined)} onConfirm={() => { if (confirmTaskId) void confirmRemoveTask(confirmTaskId); }} />
  </Screen>;
}
