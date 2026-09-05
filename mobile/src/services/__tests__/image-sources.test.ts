import { imageAttachmentSchema, imageContentUrl, resolveAttachmentUrl } from '../attachments';
import { reconcileImages } from '../image-sources';
import type { LocalFile } from '../task-repository';

const local = (id: string, remoteImageId: string | null = null): LocalFile => ({
  id,
  ownerId: 'owner-a',
  taskLocalId: 'local-task',
  kind: 'image',
  uri: `file:///${id}.jpg`,
  remoteImageId,
  contentUrl: remoteImageId ? `/api/tasks/remote-task/images/${remoteImageId}/file` : null,
  createdAt: '2026-09-05T00:00:00.000Z'
});
const remote = (id: string) => ({
  id,
  taskId: 'remote-task',
  filename: `${id}.jpg`,
  url: `/uploads/images/${id}.jpg`,
  contentUrl: `/api/tasks/remote-task/images/${id}/file`,
  mimeType: 'image/jpeg',
  size: 4,
  createdAt: '2026-09-05T00:00:00.000Z'
});

  it('carries API contentUrl through schema into reconciliation', () => {
    const parsed = imageAttachmentSchema.parse(remote('remote-a'));
    expect(reconcileImages([local('local-a', 'remote-a')], [parsed])[0]).toEqual(expect.objectContaining({
      localUri: 'file:///local-a.jpg',
      contentUrl: '/api/tasks/remote-task/images/remote-a/file'
    }));
  });
describe('offline-first image reconciliation', () => {
  it('merges confirmed local and remote metadata without losing local URI', () => {
    const result = reconcileImages([local('local-a', 'remote-a')], [remote('remote-a')]);
    expect(result).toEqual([expect.objectContaining({
      identity: 'local-a', localFileId: 'local-a', remoteImageId: 'remote-a',
      localUri: 'file:///local-a.jpg', contentUrl: '/api/tasks/remote-task/images/remote-a/file'
    })]);
  });

  it('keeps two logical images stable across repeated reconciliation', () => {
    const files = [local('local-a', 'remote-a'), local('local-b', 'remote-b')];
    const images = [remote('remote-a'), remote('remote-b')];
    expect(reconcileImages(files, images).map((image) => image.identity)).toEqual(['local-a', 'local-b']);
    expect(reconcileImages(files, images)).toHaveLength(2);
  });

  it('keeps unmatched local and remote images as separate logical images', () => {
    const result = reconcileImages([local('local-a')], [remote('remote-b')]);
    expect(result.map((image) => image.identity)).toEqual(['local-a', 'remote-b']);
  });
});

describe('protected content URL', () => {
  it('uses contentUrl and derives protected legacy references from IDs', () => {
    expect(imageContentUrl(remote('remote-a'), 'remote-task')).toContain('/api/tasks/remote-task/images/remote-a/file');
    expect(imageContentUrl({ id: 'legacy', contentUrl: undefined }, 'remote-task')).toContain('/api/tasks/remote-task/images/legacy/file');
    expect(() => resolveAttachmentUrl('/uploads/images/legacy.jpg')).toThrow();
  });

  it('preserves HTTP URLs and rejects non-network schemes', () => {
    expect(resolveAttachmentUrl('https://example.test/api/image')).toBe('https://example.test/api/image');
    expect(resolveAttachmentUrl('http://example.test/api/image')).toBe('http://example.test/api/image');
    for (const value of ['', 'file:///image.jpg', 'content://image', 'data:image/jpeg,x', 'javascript:alert(1)', '/etc/passwd']) {
      expect(() => resolveAttachmentUrl(value)).toThrow();
    }
  });
});
