import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppState, FlatList, Image, View } from 'react-native';
import { Redirect, useRouter } from 'expo-router';
import { useAuth } from '../src/auth/AuthProvider';
import { attachmentsApi } from '../src/services/attachments';
import { preferences, type TaskFilter } from '../src/services/preferences';
import { getTaskStore } from '../src/services/local-tasks';
import type { LocalTask, LocalTaskInput, SyncOperation } from '../src/services/task-repository';
import { TaskHttpError, tasksApi } from '../src/services/tasks';
import { deleteLocalFile } from '../src/services/local-media';
import { persistCapturedPhoto } from '../src/services/photo-persistence';
import type { TaskStore } from '../src/services/task-store';
import type { TaskLocation } from '../src/services/location-validation';
import { AppBadge, AppButton, AppConfirmModal, AppFeedback, AppInput, AppLogo, AppText, Card, Screen, StateMessage, TaskCard } from '../src/ui/components';
import { useTaskComposer } from '../src/services/task-composer';
import { syncService } from '../src/services/sync-service';


const taskLocation = (task: LocalTask): TaskLocation | undefined => {
  if (task.latitude === null || task.longitude === null || task.locationAccuracy === null || task.locationTimestamp === null) return undefined;
  return { latitude: task.latitude, longitude: task.longitude, accuracy: task.locationAccuracy, timestamp: task.locationTimestamp };
};


export default function Index() {
  const { user, token, accessMode, loading: authLoading, restoreError, retryRestore, logout } = useAuth();
  const router = useRouter();
  const [tasks, setTasks] = useState<LocalTask[]>([]);
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
  const [syncing, setSyncing] = useState(false);
  const [resolvingOperationId, setResolvingOperationId] = useState<string>();
  const [remoteConflictTasks, setRemoteConflictTasks] = useState<Record<string, { title: string; version: number }>>({});
  const [syncOperations, setSyncOperations] = useState<SyncOperation[]>([]);
  const [taskStore, setTaskStore] = useState<TaskStore | null>(null);
  const editingTask = tasks.find((item) => item.localId === editingId);
  const { locationLoading, photoLoading, attachLocation, removeLocation, attachPhoto } = useTaskComposer({ token, accessMode, ownerId: user?.id ?? null, taskStore, task: editingTask, saving, setTasks, setLocation, setPhotoUri, setPhotoPending, setFeedback });
  const loadVersion = useRef(0);
  const imageLoadVersion = useRef(0);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);
  useEffect(() => () => { loadVersion.current += 1; }, []);

  const loadTasks = useCallback(async () => {
    if (!user) return;
    const version = ++loadVersion.current;
    setLoading(true);
    setError(undefined);
    try {
      const store = await getTaskStore();
      if (version !== loadVersion.current) return;
      setTaskStore(store);
      const result = await store.load(user.id, accessMode, token);
      const operations = await store.listOperations(user.id);
      if (version !== loadVersion.current) return;
      setTasks(result.tasks);
      setSyncOperations(operations.filter((operation) => operation.state === 'conflict' || operation.state === 'review'));
      if (result.source === 'local' && accessMode === 'remote') setFeedback({ message: 'Sin conexión: mostrando datos locales. Los cambios quedan pendientes.', tone: 'info' });
    } catch (error) {
      if (version !== loadVersion.current) return;
      setError(error instanceof TaskHttpError && error.statusCode === 401 ? 'Sesión no autorizada. Vuelve a iniciar sesión.' : 'No se pudieron cargar las tareas locales. Inténtalo de nuevo.');
    } finally {
      if (version === loadVersion.current) setLoading(false);
    }
  }, [accessMode, token, user]);

  useEffect(() => { void loadTasks(); }, [loadTasks]);
  const synchronize = useCallback(async (manual = false) => {
    if (!user || !token || accessMode !== 'remote' || syncing) return;
    const version = loadVersion.current;
    setSyncing(true);
    try {
      const result = await syncService.run(user.id, token, accessMode, { force: manual });
      if (!mounted.current || version !== loadVersion.current) return;
      const message = result.messages?.slice(0, 3).join(' ') ?? (result.failed || result.conflicts || result.review ? 'Sincronización requiere revisión.' : 'Sincronización completada.');
      setFeedback({ message, tone: result.failed || result.conflicts || result.review ? 'info' : 'success' });
      await loadTasks();
    } catch {
      if (mounted.current && version === loadVersion.current) setFeedback({ message: 'No se pudo sincronizar. Los cambios locales se conservaron.', tone: 'error' });
    } finally {
      if (mounted.current) setSyncing(false);
    }
  }, [accessMode, loadTasks, syncing, token, user]);
  useEffect(() => {
    const previousState = { current: AppState.currentState };
    const subscription = AppState.addEventListener('change', (nextState) => {
      const wasAway = previousState.current === 'background' || previousState.current === 'inactive';
      previousState.current = nextState;
      if (wasAway && nextState === 'active') void synchronize();
    });
    return () => subscription.remove();
  }, [synchronize]);
  const resolveConflict = useCallback(async (operationId: string, resolution: 'server' | 'local') => {
    if (!user || !token || resolvingOperationId) return;
    const version = loadVersion.current;
    setResolvingOperationId(operationId);
    try {
      await syncService.resolveConflict(user.id, token, operationId, resolution);
      if (!mounted.current || version !== loadVersion.current) return;
      setFeedback({ message: resolution === 'server' ? 'Se usó la versión del servidor.' : 'Tus cambios quedaron pendientes de sincronización.', tone: 'success' });
      await loadTasks();
    } catch {
      if (mounted.current) setFeedback({ message: 'No se pudo resolver el conflicto. Tus cambios locales se conservaron.', tone: 'error' });
    } finally {
      if (mounted.current) setResolvingOperationId(undefined);
    }
  }, [loadTasks, resolvingOperationId, token, user]);
  useEffect(() => {
    if (!token || syncOperations.length === 0) { setRemoteConflictTasks({}); return; }
    let active = true;
    void Promise.all(syncOperations.map(async (operation) => {
      const task = tasks.find((item) => item.localId === operation.taskLocalId);
      if (!task?.remoteId) return null;
      try {
        const remote = await tasksApi.get(token, task.remoteId);
        return [operation.operationId, { title: remote.title, version: remote.version }] as const;
      } catch {
        return null;
      }
    })).then((entries) => {
      if (!active) return;
      const next: Record<string, { title: string; version: number }> = {};
      entries.forEach((entry) => { if (entry) next[entry[0]] = entry[1]; });
      setRemoteConflictTasks(next);
    });
    return () => { active = false; };
  }, [syncOperations, tasks, token]);
  useEffect(() => {
    const version = ++imageLoadVersion.current;
    if (!user || tasks.length === 0) { setTaskImageUrls({}); return; }
    let active = true;
    void getTaskStore().then(async (store) => {
      const localImages = await store.listLocalImages(user.id);
      const entries: Record<string, string> = Object.fromEntries(localImages.map((image) => [image.taskLocalId, image.uri]));
      if (accessMode === 'remote' && token) {
        // ponytail: one attachment metadata request per remote task; use server list previews if scale requires it.
        const remoteEntries = await Promise.all(tasks.filter((task) => task.remoteId).map(async (task) => {
          try {
            const images = await attachmentsApi.images(token, task.remoteId as string);
            return images[0] ? [task.localId, attachmentsApi.imageContentUrl(images[0], task.remoteId as string)] as const : null;
          } catch {
            return null;
          }
        }));
        remoteEntries.forEach((entry) => {
          if (entry && !entries[entry[0]]) entries[entry[0]] = entry[1];
        });
      }
      if (active && version === imageLoadVersion.current) setTaskImageUrls(entries);
    }).catch(() => {
      if (active && version === imageLoadVersion.current) setFeedback({ message: 'No se pudieron cargar las imágenes locales.', tone: 'error' });
    });
    return () => { active = false; };
  }, [accessMode, tasks, token, user]);

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
  if (!user || accessMode === 'none') return <Redirect href="/auth/login" />;
  const authenticatedUser = user;
  const ownerId = user.id;

  const saveTask = async () => {
    if (!title.trim() || saving || !taskStore) return;
    setSaving(true);
    setError(undefined);
    const wasEditing = Boolean(editingId);
    const taskToUpdate = editingTask;
    try {
      const input: LocalTaskInput = {
        title: title.trim(), description: description.trim() || null, completed: editingTask?.completed ?? false,
        latitude: location?.latitude ?? null, longitude: location?.longitude ?? null,
        locationAccuracy: location?.accuracy ?? null, locationTimestamp: location?.timestamp ?? null
      };
      if (editingId && !taskToUpdate) throw new Error('La tarea que intentas editar ya no está disponible.');
      const result = editingId && taskToUpdate ? await taskStore.update(ownerId, accessMode, token, taskToUpdate, input) : await taskStore.create(ownerId, accessMode, token, input);
      if (!result.task) throw new Error('La tarea no se pudo guardar localmente.');
      const savedTask = result.task;
      setTasks((current) => wasEditing ? current.map((item) => item.localId === savedTask.localId ? savedTask : item) : [savedTask, ...current.filter((item) => item.localId !== savedTask.localId)]);
      let photoSavedLocally = false;
      if (photoPending && photoUri) {
        const file = await persistCapturedPhoto(taskStore, ownerId, savedTask.localId, { uri: photoUri, width: 0, height: 0 });
        const localUri = file.uri;
        imageLoadVersion.current += 1;
        setTaskImageUrls((current) => ({ ...current, [savedTask.localId]: localUri }));
        photoSavedLocally = true;
      }
      setTitle(''); setDescription(''); setEditingId(undefined); setLocation(undefined); setPhotoUri(undefined); setPhotoPending(false);
      if (photoSavedLocally) setFeedback({ message: 'Tarea y fotografía guardadas localmente. La fotografía está pendiente de sincronización.', tone: 'info' });
      else if (result.requiresAuth) setFeedback({ message: 'Tarea guardada localmente. La sesión ya no autoriza el envío; inicia sesión de nuevo para sincronizar.', tone: 'info' });
      else if (result.pending) setFeedback({ message: result.source === 'uncertain' ? 'Guardada localmente; resultado remoto incierto. Pendiente de sincronización.' : 'Guardada localmente. Pendiente de sincronización.', tone: 'info' });
      else setFeedback({ message: wasEditing ? 'Tarea actualizada.' : 'Tarea creada.', tone: 'success' });
    } catch (error) {
      if (error instanceof TaskHttpError && error.statusCode === 409) void loadTasks();
      if (error instanceof TaskHttpError) setFeedback({ message: `El servidor rechazó la operación (${error.statusCode}). No se guardó localmente.`, tone: 'error' });
      else setFeedback({ message: 'No se pudo guardar la tarea localmente. Inténtalo de nuevo.', tone: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const toggleTask = async (task: LocalTask) => {
    if (saving || updatingId || deletingId || !taskStore) return;
    setUpdatingId(task.localId);
    try {
      const result = await taskStore.update(ownerId, accessMode, token, task, { completed: !task.completed });
      const updatedTask = result.task;
      if (updatedTask) setTasks((current) => current.map((item) => item.localId === updatedTask.localId ? updatedTask : item));
    } catch (error) {
      if (error instanceof TaskHttpError && error.statusCode === 409) void loadTasks();
      setFeedback({ message: error instanceof TaskHttpError ? `El servidor rechazó la operación (${error.statusCode}).` : 'No se pudo actualizar la tarea. Inténtalo de nuevo.', tone: 'error' });
    } finally {
      setUpdatingId(undefined);
    }
  };

  const removeTask = (id: string) => {
    if (deletingId || saving || updatingId) return;
    setConfirmTaskId(id);
  };
  const confirmRemoveTask = async (id: string) => {
    if (!taskStore) return;
    const target = tasks.find((item) => item.localId === id);
    if (!target) return;
    setDeletingId(id);
    try {
      const result = await taskStore.remove(ownerId, accessMode, token, target);
      const fileUris = await taskStore.deleteLocalFiles(ownerId, target.localId);
      fileUris.forEach(deleteLocalFile);
      setTasks((current) => current.filter((task) => task.localId !== id));
      setFeedback({ message: result.pending ? 'Eliminación guardada localmente. Pendiente de sincronización.' : 'Tarea eliminada.', tone: result.pending ? 'info' : 'success' });
    } catch (error) {
      if (error instanceof TaskHttpError && error.statusCode === 409) void loadTasks();
      setFeedback({ message: error instanceof TaskHttpError ? `El servidor rechazó la operación (${error.statusCode}).` : 'No se pudo eliminar la tarea. Inténtalo de nuevo.', tone: 'error' });
    } finally {
      setDeletingId(undefined);
      setConfirmTaskId(undefined);
    }
  };
  const editTask = (task: LocalTask) => {
    if (saving || deletingId) return;
    setEditingId(task.localId); setTitle(task.title); setDescription(task.description ?? ''); setLocation(taskLocation(task));
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
        <AppBadge label="Tu espacio" tone="accent" />
        <AppFeedback message={syncing ? 'Sincronizando cambios pendientes…' : feedback?.message} tone={feedback?.tone} />
        <AppButton title="Importar tareas" variant="secondary" onPress={() => router.push('/import' as never)} accessibilityLabel="Importar tareas de demostración" />
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
        <View className="flex-row items-center justify-between mb-sm"><AppText variant="title">Tus tareas</AppText><AppButton title={syncing ? 'Sincronizando...' : 'Sincronizar'} variant="ghost" onPress={() => void synchronize(true)} disabled={syncing || accessMode !== 'remote' || !token} /></View>
        {syncOperations.map((operation) => {
          const task = tasks.find((item) => item.localId === operation.taskLocalId);
          const remote = remoteConflictTasks[operation.operationId];
          const resolving = resolvingOperationId === operation.operationId;
          return <Card key={operation.operationId} className="border-warning">
            <AppText variant="heading">{operation.state === 'conflict' ? 'Conflicto por resolver' : 'Revisión necesaria'}</AppText>
            <AppText variant="bodySecondary" muted>{task?.title ?? 'Tarea local'}{operation.lastError ? ` · ${operation.lastError}` : ''}</AppText>
            {remote && <AppText variant="caption" muted>Servidor: {remote.title} · versión {remote.version}</AppText>}
            {operation.state === 'conflict' && <View className="mt-sm">
              <AppButton title="Usar versión del servidor" variant="secondary" loading={resolving} disabled={Boolean(resolvingOperationId)} onPress={() => void resolveConflict(operation.operationId, 'server')} />
              <AppButton title="Conservar mis cambios" variant="ghost" loading={resolving} disabled={Boolean(resolvingOperationId)} onPress={() => void resolveConflict(operation.operationId, 'local')} />
            </View>}
          </Card>;
        })}
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
      keyExtractor={(task) => task.localId}
      renderItem={({ item }) => <TaskCard
        title={item.title}
        description={item.description}
        dateLabel={new Date(item.createdAt).toLocaleDateString()}
        imageUrl={taskImageUrls[item.localId]}
        imageToken={token ?? undefined}
        completed={item.completed}
        locationLabel={item.latitude !== null && item.longitude !== null && item.locationAccuracy !== null && item.locationTimestamp !== null ? `Ubicación · precisión ${Math.round(item.locationAccuracy)} m` : undefined}
        onOpen={() => router.push(`/tasks/${item.localId}` as never)}
        onToggle={() => void toggleTask(item)}
        onEdit={() => editTask(item)}
        onDelete={() => removeTask(item.localId)}
        toggleLoading={updatingId === item.localId}
        deleteLoading={deletingId === item.localId}
        disabled={Boolean(updatingId || deletingId || saving)}
      />}
      ListFooterComponent={<View className="h-xxl" />}
    />
    <AppConfirmModal visible={Boolean(confirmTaskId)} title="¿Eliminar tarea?" description="Esta acción no se puede deshacer." confirmLabel="Eliminar" loading={Boolean(deletingId)} onCancel={() => setConfirmTaskId(undefined)} onConfirm={() => { if (confirmTaskId) void confirmRemoveTask(confirmTaskId); }} />
  </Screen>;
}
