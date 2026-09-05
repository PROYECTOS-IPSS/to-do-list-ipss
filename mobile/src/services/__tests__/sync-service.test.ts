jest.mock('../local-tasks', () => ({ getTaskStore: jest.fn() }));
import { attachmentsApi } from '../attachments';
import { getTaskStore } from '../local-tasks';
import { retryDelayMs, syncService } from '../sync-service';

describe('sync retry policy', () => {
  it('uses bounded exponential delays and caps Retry-After', () => {
    expect(retryDelayMs(1)).toBe(1_000);
    expect(retryDelayMs(3)).toBe(4_000);
    expect(retryDelayMs(3, 5_000)).toBe(5_000);
    expect(retryDelayMs(3, 60_000)).toBe(30_000);
  });

  it('never starts network sync in local access mode', async () => {
    await expect(syncService.run('owner-a', null, 'local')).resolves.toEqual({ attempted: 0, confirmed: 0, failed: 0, conflicts: 0, review: 0 });
  });

  it('uploads an image with remoteId and stable operation id, then reconciles it', async () => {
    const operation = { operationId: 'image-op-1', ownerId: 'owner-a', taskLocalId: 'local-task', kind: 'image' as const, payload: JSON.stringify({ fileId: 'file-1', uri: 'file:///photo.jpg', filename: 'photo.jpg', mimeType: 'image/jpeg' }), expectedVersion: null, state: 'pending' as const, attempts: 0, lastError: null, retryAfterAt: null, createdAt: '2026-09-03T00:00:00.000Z', updatedAt: '2026-09-03T00:00:00.000Z' };
    const task = { localId: 'local-task', remoteId: 'remote-task', remoteOutcome: 'none', title: 'Foto' };
    const store = {
      listOperations: jest.fn().mockResolvedValue([operation]),
      find: jest.fn().mockResolvedValue(task),
      markOperation: jest.fn().mockResolvedValue(undefined),
      confirmImageUpload: jest.fn().mockResolvedValue(null)
    };
    jest.mocked(getTaskStore).mockResolvedValue(store as never);
    const upload = jest.spyOn(attachmentsApi, 'uploadImage').mockResolvedValue({ id: 'remote-image', filename: 'photo.jpg', url: '/uploads/images/photo.jpg', mimeType: 'image/jpeg', size: 3, createdAt: operation.createdAt });

    await expect(syncService.run('owner-a', 'token', 'remote')).resolves.toMatchObject({ attempted: 1, confirmed: 1, failed: 0 });
    expect(upload).toHaveBeenCalledWith('token', 'remote-task', 'file:///photo.jpg', 'image-op-1', 'photo.jpg', 'image/jpeg');
    expect(store.confirmImageUpload).toHaveBeenCalledWith('owner-a', 'image-op-1', 'file-1', expect.objectContaining({ id: 'remote-image' }));
    upload.mockRestore();
  });

  it('keeps an image pending when its task has no remoteId', async () => {
    const operation = { operationId: 'image-op-2', ownerId: 'owner-a', taskLocalId: 'local-task', kind: 'image' as const, payload: JSON.stringify({ fileId: 'file-2', uri: 'file:///photo.jpg' }), expectedVersion: null, state: 'pending' as const, attempts: 0, lastError: null, retryAfterAt: null, createdAt: '2026-09-03T00:00:00.000Z', updatedAt: '2026-09-03T00:00:00.000Z' };
    const store = { listOperations: jest.fn().mockResolvedValue([operation]), find: jest.fn().mockResolvedValue({ localId: 'local-task', remoteId: null, remoteOutcome: 'none', title: 'Foto' }) };
    jest.mocked(getTaskStore).mockResolvedValue(store as never);
    const upload = jest.spyOn(attachmentsApi, 'uploadImage');

    await expect(syncService.run('owner-a', 'token', 'remote')).resolves.toEqual({ attempted: 0, confirmed: 0, failed: 0, conflicts: 0, review: 0 });
    expect(upload).not.toHaveBeenCalled();
    upload.mockRestore();
  });
});
