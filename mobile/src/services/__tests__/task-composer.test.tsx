import { useState, type ComponentProps } from 'react';
import { act, render } from '@testing-library/react-native';
import { getCurrentLocation, takePhoto } from '../peripherals';
import { useTaskComposer, type ComposerFeedback, type TaskComposer } from '../task-composer';
import type { LocalTask } from '../task-repository';
import type { TaskStore } from '../task-store';
import type { TaskLocation } from '../location-validation';

type UpdateTask = Pick<TaskStore, 'update'>['update'];
const updateTask: jest.MockedFunction<UpdateTask> = jest.fn();
const taskStore = { update: updateTask };

jest.mock('../peripherals', () => ({
  getCurrentLocation: jest.fn(),
  takePhoto: jest.fn()
}));

const photo = { type: 'image' as const, uri: 'file://photo.jpg', width: 100, height: 100 };
const oldLocation: TaskLocation = { latitude: 1, longitude: 2, accuracy: 10, timestamp: '2026-01-01T00:00:00.000Z' };
const localTask: LocalTask = {
  id: 'local-task-1', localId: 'local-task-1', ownerId: 'owner-1', remoteId: 'remote-task-1',
  title: 'Tarea', description: null, completed: false,
  latitude: oldLocation.latitude, longitude: oldLocation.longitude,
  locationAccuracy: oldLocation.accuracy, locationTimestamp: oldLocation.timestamp,
  createdAt: oldLocation.timestamp, updatedAt: oldLocation.timestamp,
  localUpdatedAt: oldLocation.timestamp, syncState: 'clean', remoteOutcome: 'none', deletedAt: null, version: 0, remoteVersion: 0
};
const clearedTask: LocalTask = { ...localTask, latitude: null, longitude: null, locationAccuracy: null, locationTimestamp: null };

type Probe = {
  composer: TaskComposer;
  location: TaskLocation | undefined;
  photoUri: string | undefined;
  photoPending: boolean;
  tasks: LocalTask[];
  feedback: ComposerFeedback | undefined;
};

let probe: Probe | undefined;

function Harness({ editingId, newTask = false, initialLocation = oldLocation, initialTasks = [localTask] }: { editingId?: string; newTask?: boolean; initialLocation?: TaskLocation; initialTasks?: LocalTask[] }) {
  const [location, setLocation] = useState<TaskLocation | undefined>(initialLocation);
  const [photoUri, setPhotoUri] = useState<string>();
  const [photoPending, setPhotoPending] = useState(false);
  const [tasks, setTasks] = useState<LocalTask[]>(initialTasks);
  const [feedback, setFeedback] = useState<ComposerFeedback>();
  const actualEditingId = newTask ? undefined : (editingId ?? localTask.localId);
  const composer = useTaskComposer({
    token: 'token', accessMode: 'remote', ownerId: 'owner-1', taskStore, task: tasks.find((item) => item.localId === actualEditingId), saving: false,
    setTasks, setLocation, setPhotoUri, setPhotoPending, setFeedback
  });
  probe = { composer, location, photoUri, photoPending, tasks, feedback };
  return null;
}

function currentProbe(): Probe {
  if (!probe) throw new Error('Test harness has not rendered.');
  return probe;
}

async function unmount(renderer: Awaited<ReturnType<typeof mount>>) {
  await renderer.unmount();
}

async function mount(options?: ComponentProps<typeof Harness>) {
  return render(<Harness {...options} />);
}

describe('task composer camera and GPS flows', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    probe = undefined;
    updateTask.mockImplementation(async (_owner, _mode, _token, task, patch) => ({ task: { ...task, ...patch }, source: 'remote', pending: false }));
  });

  it('keeps a successful photo, releases loading, and allows a second capture', async () => {
    jest.mocked(takePhoto).mockResolvedValueOnce(photo).mockResolvedValueOnce({ ...photo, uri: 'file://second.jpg' });
    const renderer = await mount()

    await act(async () => { await currentProbe().composer.attachPhoto(); });
    expect(currentProbe().photoUri).toBe(photo.uri);
    expect(currentProbe().photoPending).toBe(true);
    expect(currentProbe().composer.photoLoading).toBe(false);

    await act(async () => { await currentProbe().composer.attachPhoto(); });
    expect(takePhoto).toHaveBeenCalledTimes(2);
    expect(currentProbe().photoUri).toBe('file://second.jpg');
    await unmount(renderer);
  });

  it('treats camera cancellation as a quiet result and releases loading', async () => {
    jest.mocked(takePhoto).mockResolvedValue(undefined);
    const renderer = await mount()

    await act(async () => { await currentProbe().composer.attachPhoto(); });
    expect(currentProbe().photoUri).toBeUndefined();
    expect(currentProbe().feedback).toBeUndefined();
    expect(currentProbe().composer.photoLoading).toBe(false);
    await unmount(renderer);
  });

  it('reports camera errors and releases loading', async () => {
    jest.mocked(takePhoto).mockRejectedValue(new Error('permission denied'));
    const renderer = await mount()

    await act(async () => { await currentProbe().composer.attachPhoto(); });
    expect(currentProbe().feedback?.tone).toBe('error');
    expect(currentProbe().composer.photoLoading).toBe(false);
    await unmount(renderer);
  });

  it('does not open camera twice while the first capture is pending', async () => {
    let resolvePhoto: (value: typeof photo) => void = () => undefined;
    const pendingPhoto = new Promise<typeof photo>((resolve) => { resolvePhoto = resolve; });
    jest.mocked(takePhoto).mockReturnValueOnce(pendingPhoto);
    const renderer = await mount()
    let firstCapture: Promise<void> | undefined;

    await act(async () => {
      firstCapture = currentProbe().composer.attachPhoto();
      await Promise.resolve();
    });
    await act(async () => { await currentProbe().composer.attachPhoto(); });
    expect(takePhoto).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolvePhoto(photo);
      await firstCapture;
    });
    expect(currentProbe().composer.photoLoading).toBe(false);
    await unmount(renderer);
  });

  it('does not update photo state after unmount during capture', async () => {
    let resolvePhoto: (value: typeof photo) => void = () => undefined;
    const pendingPhoto = new Promise<typeof photo>((resolve) => { resolvePhoto = resolve; });
    jest.mocked(takePhoto).mockReturnValueOnce(pendingPhoto);
    const renderer = await mount()
    let capture: Promise<void> | undefined;

    await act(async () => {
      capture = currentProbe().composer.attachPhoto();
      await Promise.resolve();
    });
    await unmount(renderer);
    await act(async () => {
      resolvePhoto(photo);
      await capture;
    });
    expect(currentProbe().photoUri).toBeUndefined();
  });

  it('clears remote location, updates task, and releases loading', async () => {
    const renderer = await mount()

    await act(async () => { await currentProbe().composer.removeLocation(); });
    expect(updateTask).toHaveBeenCalledWith('owner-1', 'remote', 'token', localTask, {
      latitude: null, longitude: null, locationAccuracy: null, locationTimestamp: null
    });
    expect(currentProbe().location).toBeUndefined();
    expect(currentProbe().tasks[0]).toMatchObject(clearedTask);
    expect(currentProbe().feedback?.tone).toBe('success');
    expect(currentProbe().composer.locationLoading).toBe(false);
    await unmount(renderer);
  });

  it('keeps remote location after API failure and permits retry', async () => {
    updateTask.mockRejectedValueOnce(new Error('server error')).mockResolvedValueOnce({ task: clearedTask, source: 'remote', pending: false });
    const renderer = await mount()

    await act(async () => { await currentProbe().composer.removeLocation(); });
    expect(currentProbe().location).toEqual(oldLocation);
    expect(currentProbe().tasks[0]).toEqual(localTask);
    expect(currentProbe().feedback?.tone).toBe('error');
    expect(currentProbe().composer.locationLoading).toBe(false);

    await act(async () => { await currentProbe().composer.removeLocation(); });
    expect(updateTask).toHaveBeenCalledTimes(2);
    expect(currentProbe().location).toBeUndefined();
    await unmount(renderer);
  });

  it('clears a new task location locally without calling the store', async () => {
    const renderer = await mount({ newTask: true })

    await act(async () => { await currentProbe().composer.removeLocation(); });
    expect(updateTask).not.toHaveBeenCalled();
    expect(currentProbe().location).toBeUndefined();
    expect(currentProbe().composer.locationLoading).toBe(false);
    await unmount(renderer);
  });

  it('does not submit remote location removal twice while pending', async () => {
    let resolveUpdate: (value: { task: LocalTask; source: 'remote'; pending: false }) => void = () => undefined;
    const pendingUpdate = new Promise<{ task: LocalTask; source: 'remote'; pending: false }>((resolve) => { resolveUpdate = resolve; });
    updateTask.mockReturnValueOnce(pendingUpdate);
    const renderer = await mount()
    let firstRemoval: Promise<void> | undefined;

    await act(async () => {
      firstRemoval = currentProbe().composer.removeLocation();
      await Promise.resolve();
    });
    await act(async () => { await currentProbe().composer.removeLocation(); });
    expect(updateTask).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolveUpdate({ task: clearedTask, source: 'remote', pending: false });
      await firstRemoval;
    });
    expect(currentProbe().location).toBeUndefined();
    await unmount(renderer);
  });

  it('releases location loading after a location acquisition error', async () => {
    jest.mocked(getCurrentLocation).mockRejectedValue(new Error('GPS disabled'));
    const renderer = await mount()

    await act(async () => { await currentProbe().composer.attachLocation(); });
    expect(currentProbe().feedback?.tone).toBe('error');
    expect(currentProbe().composer.locationLoading).toBe(false);
    await unmount(renderer);
  });
});
