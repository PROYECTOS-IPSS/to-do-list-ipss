import { useCallback, useEffect, useRef, useState } from 'react';
import { FlatList, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../src/auth/AuthProvider';
import { fetchJsonPlaceholderTodos, type ImportedTodoPreview } from '../src/services/jsonplaceholder-adapter';
import { getTaskStore } from '../src/services/local-tasks';
import { AppButton, AppFeedback, AppText, Card, Screen, StateMessage } from '../src/ui/components';

export default function ImportScreen() {
  const { user, accessMode } = useAuth();
  const router = useRouter();
  const [records, setRecords] = useState<ImportedTodoPreview[]>([]);
  const [importedIds, setImportedIds] = useState<Set<string>>(new Set());
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();
  const [feedback, setFeedback] = useState<string>();
  const requestVersion = useRef(0);

  const load = useCallback(async () => {
    const version = ++requestVersion.current;
    setLoading(true); setError(undefined);
    try {
      const result = await fetchJsonPlaceholderTodos();
      const store = await getTaskStore();
      const existing = user ? await store.load(user.id, 'local', null) : { tasks: [] };
      if (version !== requestVersion.current) return;
      setRecords(result.records); setSelected(new Set());
      setImportedIds(new Set(existing.tasks.flatMap((task) => task.sourceProvider === 'jsonplaceholder' && task.sourceExternalId ? [task.sourceExternalId] : [])));
      setFeedback(`${result.records.length} tareas disponibles${result.rejectedCount ? `; ${result.rejectedCount} rechazadas` : ''}.`);
    } catch (cause) {
      if (version !== requestVersion.current) return;
      setError(cause instanceof Error ? cause.message : 'No se pudo consultar la fuente externa.');
    } finally { if (version === requestVersion.current) setLoading(false); }
  }, [user]);

  useEffect(() => { if (!user) { requestVersion.current += 1; setRecords([]); setSelected(new Set()); setImportedIds(new Set()); } }, [user]);
  if (!user) return <Screen><StateMessage title="Sesión no disponible." /></Screen>;

  const toggle = (id: string) => setSelected((current) => { const next = new Set(current); if (next.has(id)) next.delete(id); else next.add(id); return next; });
  const confirm = async () => {
    if (!selected.size || busy || !user) return;
    setBusy(true); setError(undefined);
    try {
      const store = await getTaskStore();
      const result = await store.importTasks(user.id, records.filter((item) => selected.has(item.externalId)).map((item) => ({ title: item.title, description: item.description, completed: item.completed, provider: item.provider, externalId: item.externalId })));
      setFeedback(`${result.imported} importadas, ${result.skipped} omitidas. Quedan pendientes de sincronización.`);
      setImportedIds((current) => new Set([...current, ...records.filter((item) => selected.has(item.externalId)).map((item) => item.externalId)]));
      setSelected(new Set());
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'No se pudieron guardar las tareas. La selección se conserva.'); }
    finally { setBusy(false); }
  };

  return <Screen>
    <View className="flex-row items-center justify-between mb-lg"><AppButton title="‹" variant="ghost" onPress={() => router.back()} accessibilityLabel="Volver" /><AppText variant="title">Importar tareas</AppText><View className="w-10" /></View>
    <Card className="p-md mb-md"><AppText variant="label">JSONPlaceholder · tareas de demostración</AppText><AppText variant="bodySecondary" muted className="mt-xs">La fuente externa no recibe tu sesión ni datos personales.</AppText><View className="flex-row gap-sm mt-md"><AppButton title={loading ? 'Consultando...' : 'Consultar fuente'} loading={loading} onPress={() => void load()} /><AppButton title="Importar seleccionadas" loading={busy} disabled={!selected.size || accessMode === 'none'} onPress={() => void confirm()} /></View></Card>
    {feedback && <AppFeedback message={feedback} tone="info" />}
    {error && <StateMessage title={error} tone="error" actionTitle="Reintentar" onAction={() => void load()} />}
    {!loading && !error && records.length === 0 && <StateMessage title="No hay tareas disponibles." />}
    <FlatList data={records} keyExtractor={(item) => item.externalId} renderItem={({ item }) => { const alreadyImported = importedIds.has(item.externalId); return <Card className="p-md mb-sm"><View className="flex-row items-start justify-between"><View className="flex-1"><AppText variant="label">{item.title}</AppText><AppText variant="caption" muted>{alreadyImported ? 'Ya importada' : item.completed ? 'Completada' : 'Pendiente'} · ID externo {item.externalId}</AppText></View><AppButton title={alreadyImported ? 'Importada' : selected.has(item.externalId) ? 'Seleccionada ✓' : 'Seleccionar'} variant={alreadyImported || selected.has(item.externalId) ? 'secondary' : 'ghost'} onPress={() => toggle(item.externalId)} disabled={busy || alreadyImported} /></View></Card>; }} />
  </Screen>;
}
