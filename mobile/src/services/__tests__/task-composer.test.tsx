import { useState, type ComponentProps } from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { getCurrentLocation, takePhoto } from '../peripherals';
import { tasksApi, type Task } from '../tasks';
import { useTaskComposer, type ComposerFeedback, type TaskComposer } from '../task-composer';
import type { TaskLocation } from '../location-validation';

jest.mock('../peripherals', () => ({
  getCurrentLocation: jest.fn(),
  takePhoto: jest.fn()
}));
jest.mock('../tasks', () => ({
  tasksApi: { update: jest.fn() }
}));

const photo = { type: 'image' as const, uri: 'file://photo.jpg', width: 100, height: 100 };
const oldLocation: TaskLocation = { latitude: 1, longitude: 2, accuracy: 10, timestamp: '2026-01-01T00:00:00.000Z' };
const task: Task = {
  id: 'task-1', title: 'Tarea', description: null, completed: false,
  latitude: oldLocation.latitude, longitude: oldLocation.longitude,
  locationAccuracy: oldLocation.accuracy, locationTimestamp: oldLocation.timestamp,
  createdAt: oldLocation.timestamp, updatedAt: oldLocation.timestamp
};
const clearedTask = { ...task, latitude: null, longitude: null, locationAccuracy: null, locationTimestamp: null };

type Probe = {
  composer: TaskComposer;
  location: TaskLocation | undefined;
  photoUri: string | undefined;
  photoPending: boolean;
  tasks: Task[];
  feedback: ComposerFeedback | undefined;
};

let probe: Probe | undefined;

function Harness({ editingId, newTask = false, initialLocation = oldLocation, initialTasks = [task] }: { editingId?: string; newTask?: boolean; initialLocation?: TaskLocation; initialTasks?: Task[] }) {
  const [location, setLocation] = useState<TaskLocation | undefined>(initialLocation);
  const [photoUri, setPhotoUri] = useState<string>();
  const [photoPending, setPhotoPending] = useState(false);
  const [tasks, setTasks] = useState(initialTasks);
  const [feedback, setFeedback] = useState<ComposerFeedback>();
  const composer = useTaskComposer({
    token: 'token', editingId: newTask ? undefined : (editingId ?? 'task-1'), saving: false, setTasks, setLocation, setPhotoUri, setPhotoPending, setFeedback
  });
  probe = { composer, location, photoUri, photoPending, tasks, feedback };
  return null;
}

function currentProbe(): Probe {
  if (!probe) throw new Error('Test harness has not rendered.');
  return probe;
}

function mount(options?: ComponentProps<typeof Harness>) {
  let renderer: ReactTestRenderer | undefined;
  act(() => { renderer = create(<Harness {...options} />); });
  if (!renderer) throw new Error('Test renderer did not mount.');
  return renderer;
}
const unmount = (renderer: ReactTestRenderer) => { act(() => { renderer.unmount(); }); };
describe('task composer camera and GPS flows', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    probe = undefined;
  });

  it('keeps a successful photo, releases loading, and allows a second capture', async () => {
    jest.mocked(takePhoto).mockResolvedValueOnce(photo).mockResolvedValueOnce({ ...photo, uri: 'file://second.jpg' });
    const renderer = mount();

    await act(async () => { await currentProbe().composer.attachPhoto(); });
    expect(currentProbe().photoUri).toBe(photo.uri);
    expect(currentProbe().photoPending).toBe(true);
    expect(currentProbe().composer.photoLoading).toBe(false);

    await act(async () => { await currentProbe().composer.attachPhoto(); });
    expect(takePhoto).toHaveBeenCalledTimes(2);
    expect(currentProbe().photoUri).toBe('file://second.jpg');
    unmount(renderer);
  });

  it('treats camera cancellation as a quiet result and releases loading', async () => {
    jest.mocked(takePhoto).mockResolvedValue(undefined);
    const renderer = mount();

    await act(async () => { await currentProbe().composer.attachPhoto(); });
    expect(currentProbe().photoUri).toBeUndefined();
    expect(currentProbe().feedback).toBeUndefined();
    expect(currentProbe().composer.photoLoading).toBe(false);
    unmount(renderer);
  });

  it('reports camera errors and releases loading', async () => {
    jest.mocked(takePhoto).mockRejectedValue(new Error('permission denied'));
    const renderer = mount();

    await act(async () => { await currentProbe().composer.attachPhoto(); });
    expect(currentProbe().feedback?.tone).toBe('error');
    expect(currentProbe().composer.photoLoading).toBe(false);
    unmount(renderer);
  });

  it('does not open camera twice while the first capture is pending', async () => {
    let resolvePhoto: (value: typeof photo) => void = () => undefined;
    const pendingPhoto = new Promise<typeof photo>((resolve) => { resolvePhoto = resolve; });
    jest.mocked(takePhoto).mockReturnValueOnce(pendingPhoto);
    const renderer = mount();
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
    unmount(renderer);
  });

  it('does not update photo state after unmount during capture', async () => {
    let resolvePhoto: (value: typeof photo) => void = () => undefined;
    const pendingPhoto = new Promise<typeof photo>((resolve) => { resolvePhoto = resolve; });
    jest.mocked(takePhoto).mockReturnValueOnce(pendingPhoto);
    const renderer = mount();
    let capture: Promise<void> | undefined;

    await act(async () => {
      capture = currentProbe().composer.attachPhoto();
      await Promise.resolve();
    });
    unmount(renderer);
    await act(async () => {
      resolvePhoto(photo);
      await capture;
    });
    expect(currentProbe().photoUri).toBeUndefined();
  });

  it('clears remote location, updates task, and releases loading', async () => {
    jest.mocked(tasksApi.update).mockResolvedValue(clearedTask);
    const renderer = mount();

    await act(async () => { await currentProbe().composer.removeLocation(); });
    expect(tasksApi.update).toHaveBeenCalledWith('token', 'task-1', {
      latitude: null, longitude: null, locationAccuracy: null, locationTimestamp: null
    });
    expect(currentProbe().location).toBeUndefined();
    expect(currentProbe().tasks).toEqual([clearedTask]);
    expect(currentProbe().feedback?.tone).toBe('success');
    expect(currentProbe().composer.locationLoading).toBe(false);
    unmount(renderer);
  });

  it('keeps remote location after API failure and permits retry', async () => {
    jest.mocked(tasksApi.update).mockRejectedValueOnce(new Error('server error')).mockResolvedValueOnce(clearedTask);
    const renderer = mount();

    await act(async () => { await currentProbe().composer.removeLocation(); });
    expect(currentProbe().location).toEqual(oldLocation);
    expect(currentProbe().tasks).toEqual([task]);
    expect(currentProbe().feedback?.tone).toBe('error');
    expect(currentProbe().composer.locationLoading).toBe(false);

    await act(async () => { await currentProbe().composer.removeLocation(); });
    expect(tasksApi.update).toHaveBeenCalledTimes(2);
    expect(currentProbe().location).toBeUndefined();
    unmount(renderer);
  });

  it('clears a new task location locally without calling the API', async () => {
    const renderer = mount({ newTask: true });

    await act(async () => { await currentProbe().composer.removeLocation(); });
    expect(tasksApi.update).not.toHaveBeenCalled();
    expect(currentProbe().location).toBeUndefined();
    expect(currentProbe().composer.locationLoading).toBe(false);
    unmount(renderer);
  });

  it('does not submit remote location removal twice while pending', async () => {
    let resolveUpdate: (value: Task) => void = () => undefined;
    const pendingUpdate = new Promise<Task>((resolve) => { resolveUpdate = resolve; });
    jest.mocked(tasksApi.update).mockReturnValueOnce(pendingUpdate);
    const renderer = mount();
    let firstRemoval: Promise<void> | undefined;

    await act(async () => {
      firstRemoval = currentProbe().composer.removeLocation();
      await Promise.resolve();
    });
    await act(async () => { await currentProbe().composer.removeLocation(); });
    expect(tasksApi.update).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolveUpdate(clearedTask);
      await firstRemoval;
    });
    expect(currentProbe().location).toBeUndefined();
    unmount(renderer);
  });

  it('releases location loading after a location acquisition error', async () => {
    jest.mocked(getCurrentLocation).mockRejectedValue(new Error('GPS disabled'));
    const renderer = mount();

    await act(async () => { await currentProbe().composer.attachLocation(); });
    expect(currentProbe().feedback?.tone).toBe('error');
    expect(currentProbe().composer.locationLoading).toBe(false);
    unmount(renderer);
  });
});
