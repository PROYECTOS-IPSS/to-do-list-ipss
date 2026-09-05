import { useCallback, useEffect, useRef, useState } from 'react';
import { FlatList, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../src/auth/AuthProvider';
import { fetchJsonPlaceholderTodos, type ImportedTodoPreview } from '../src/services/jsonplaceholder-adapter';
import { getTaskStore } from '../src/services/local-tasks';
import { AppButton, AppFeedback, AppHeader, AppText, Card, ResultSummary, Screen, SelectableRow, StateMessage } from '../src/ui/components';

export default function ImportScreen() {
  const { user, accessMode } = useAuth();
  const router = useRouter();
  const [records, setRecords] = useState<ImportedTodoPreview[]>([]);
  const [importedIds, setImportedIds] = useState<Set<string>>(new Set());
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(false);
  const [hasQueried, setHasQueried] = useState(false);
  const [rejectedCount, setRejectedCount] = useState(0);
  const [error, setError] = useState<string>();
  const [feedback, setFeedback] = useState<string>();
  const requestVersion = useRef(0);

  const load = useCallback(async () => {
    const version = ++requestVersion.current;
    setLoading(true); setError(undefined); setHasQueried(true);
    try {
      const result = await fetchJsonPlaceholderTodos();
      const store = await getTaskStore();
      const existing = user ? await store.load(user.id, 'local', null) : { tasks: [] };
      if (version !== requestVersion.current) return;
      setRecords(result.records); setSelected(new Set()); setRejectedCount(result.rejectedCount);
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

  const importedCount = records.filter((item) => importedIds.has(item.externalId)).length;
  const selectableCount = records.length - importedCount;

  return <Screen>
    <AppHeader title="Importar tareas" onBack={() => router.back()} />
    <View className="flex-1">
      <AppText variant="display">Trae tareas a tu espacio</AppText>
      <AppText variant="bodySecondary" muted className="mt-xs mb-lg">Consulta JSONPlaceholder y elige qué tareas guardar localmente. Tu sesión y datos personales no se envían a la fuente.</AppText>
      <Card className="p-md mb-md"><AppText variant="label">Fuente externa</AppText><AppText variant="bodySecondary" className="mt-xs">JSONPlaceholder · tareas de demostración</AppText><AppButton title={loading ? 'Consultando...' : 'Consultar fuente'} loading={loading} onPress={() => void load()} disabled={busy} className="mt-md" /></Card>
      {hasQueried && !loading && !error && <ResultSummary received={records.length + rejectedCount} valid={records.length} imported={importedCount} selectable={selectableCount} selected={selected.size} />}
      {feedback && <AppFeedback message={feedback} tone="info" />}
      {error && <StateMessage title={error} tone="error" actionTitle="Reintentar" onAction={() => void load()} />}
      {!hasQueried && !loading && <Card className="border-primary"><AppText variant="title">Lista sin consultar</AppText><AppText variant="bodySecondary" muted className="mt-xs">Consulta la fuente para revisar tareas disponibles.</AppText></Card>}
      {hasQueried && !loading && !error && records.length === 0 && <StateMessage title="No hay tareas disponibles." />}
      <FlatList data={records} keyExtractor={(item) => item.externalId} contentContainerClassName="gap-sm pb-lg" renderItem={({ item }) => { const alreadyImported = importedIds.has(item.externalId); const isSelected = selected.has(item.externalId); return <SelectableRow title={item.title} description={item.description} statusLabel={alreadyImported ? 'Ya importada · no seleccionable' : `${item.completed ? 'Completada' : 'Pendiente'} · ${isSelected ? 'Seleccionada' : 'Disponible'}`} selected={isSelected} disabled={busy || alreadyImported} onPress={() => toggle(item.externalId)} />; }} />
      <View className="border-t border-border bg-background pt-md"><AppText variant="bodySecondary" className="mb-xs">{selected.size} seleccionadas</AppText><AppButton title="Importar seleccionadas" loading={busy} disabled={!selected.size || accessMode === 'none'} onPress={() => void confirm()} /></View>
    </View>
  </Screen>;
}
