import { useCallback, useEffect, useRef, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../src/auth/AuthProvider';
import { fetchJsonPlaceholderTodos, type ImportedTodoPreview } from '../src/services/jsonplaceholder-adapter';
import { getTaskStore } from '../src/services/local-tasks';
import { AppButton, AppFeedback, AppHeader, AppText, Card, ExampleBox, ResultSummary, Screen, SelectableRow, StateMessage } from '../src/ui/components';

const EXAMPLE_BOX_HEIGHT = 360;

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
  const emptyContent = loading ? <StateMessage title="Consultando tareas de ejemplo..." /> : error ? null : !hasQueried ? <Card className="border-primary"><AppText variant="title">Aún no hay resultados</AppText><AppText variant="bodySecondary" muted className="mt-xs">Consulta las tareas de ejemplo para revisar cuáles quieres agregar.</AppText></Card> : <StateMessage title="No hay tareas disponibles." />;

  return <Screen>
    <ScrollView className="flex-1" contentContainerClassName="pb-lg" keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator>
      <AppHeader title="Tareas de ejemplo" onBack={() => router.back()} />
      <AppText variant="bodySecondary" muted className="mb-md">Explora tareas de demostración y agrega las que te resulten útiles a tu espacio.</AppText>
      <Card className="p-md mb-md">
        <AppText variant="label">Fuente de demostración</AppText>
        <AppText variant="bodySecondary" className="mt-xs">Estas tareas son datos ficticios utilizados para demostrar la importación desde un servicio externo.</AppText>
        <AppText variant="caption" muted className="mt-sm">Contenido de demostración proporcionado por JSONPlaceholder.</AppText>
        <AppButton title={loading ? 'Consultando...' : 'Consultar tareas de ejemplo'} loading={loading} onPress={() => void load()} disabled={busy || loading} className="mt-md" />
      </Card>
      {hasQueried && !loading && !error && <ResultSummary received={records.length + rejectedCount} valid={records.length} imported={importedCount} selectable={selectableCount} />}
      {feedback && <AppFeedback message={feedback} tone="info" />}
      {error && <StateMessage title={error} tone="error" actionTitle="Reintentar" onAction={() => void load()} />}
      <ExampleBox title="Resultados" items={records} keyForItem={(item) => item.externalId} maxHeight={EXAMPLE_BOX_HEIGHT} accessibilityLabel="Resultados de tareas de ejemplo" emptyContent={emptyContent} renderItem={(record) => {
        const alreadyImported = importedIds.has(record.externalId);
        const isSelected = selected.has(record.externalId);
        return <SelectableRow title={record.title} description={record.description} statusLabel={alreadyImported ? 'Ya importada · no seleccionable' : `${record.completed ? 'Completada' : 'Pendiente'} · ${isSelected ? 'Seleccionada' : 'Disponible'}`} selected={isSelected} disabled={busy || alreadyImported} onPress={() => toggle(record.externalId)} />;
      }} />
      <View className="border-t border-primary bg-surface p-md mt-md">
        <AppText variant="bodySecondary" className="mb-xs" accessibilityLiveRegion="polite">{selected.size === 1 ? '1 tarea seleccionada' : `${selected.size} tareas seleccionadas`}</AppText>
        <AppButton title="Importar seleccionadas" loading={busy} disabled={!selected.size || busy || accessMode === 'none'} onPress={() => void confirm()} />
      </View>
    </ScrollView>
  </Screen>;
}
