import { resolveAttachmentUrl } from '../attachments';
jest.mock('expo/fetch', () => ({ fetch: (...args: Parameters<typeof fetch>) => global.fetch(...args) }));
jest.mock('expo-file-system', () => ({ File: class extends Blob { exists = true; constructor() { super([]); } } }));

import { AttachmentHttpError, AttachmentResponseError, attachmentsApi } from '../attachments';

const fetchMock: jest.MockedFunction<typeof fetch> = jest.fn();

beforeAll(() => { global.fetch = fetchMock; });
beforeEach(() => { fetchMock.mockReset(); });

const image = { id: 'image-1', filename: 'photo.jpg', url: '/uploads/images/photo.jpg', mimeType: 'image/jpeg', size: 3, createdAt: '2026-09-03T00:00:00.000Z' };

describe('attachmentsApi image transport', () => {
  it('keeps Authorization and Idempotency-Key and sends native FormData to remoteId', async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify(image), { status: 201 }));

    await attachmentsApi.uploadImage('live-token', 'remote-task-id', 'file:///photo.jpg', 'operation-1', 'camera.jpg', 'image/jpeg');

    const [url, options] = fetchMock.mock.calls[0];
    expect(String(url)).toContain('/api/tasks/remote-task-id/images');
    expect(options?.headers).toEqual(expect.objectContaining({ Authorization: 'Bearer live-token', 'Idempotency-Key': 'operation-1' }));
    expect(options?.headers).not.toHaveProperty('Content-Type');
    expect(options?.body).toBeInstanceOf(FormData);
  });

  it('preserves HTTP status and backend code for rejected files', async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ error: { code: 'INVALID_IMAGE_MIME', message: 'Unsupported image type.' } }), { status: 400 }));

    await expect(attachmentsApi.uploadImage('token', 'remote-id', 'file:///photo.gif')).rejects.toEqual(expect.objectContaining({ statusCode: 400, code: 'INVALID_IMAGE_MIME' } satisfies Partial<AttachmentHttpError>));
  });

  it('distinguishes unauthorized, network, and malformed successful responses', async () => {
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({ error: { code: 'UNAUTHORIZED', message: 'Authentication required.' } }), { status: 401 }));
    await expect(attachmentsApi.images('token', 'remote-id')).rejects.toEqual(expect.objectContaining({ statusCode: 401, code: 'UNAUTHORIZED' }));

    const networkError = new TypeError('Network request failed');
    fetchMock.mockRejectedValueOnce(networkError);
    await expect(attachmentsApi.images('token', 'remote-id')).rejects.toBe(networkError);

    fetchMock.mockResolvedValueOnce(new Response('not-json', { status: 200 }));
    await expect(attachmentsApi.images('token', 'remote-id')).rejects.toBeInstanceOf(AttachmentResponseError);
  });
});
describe('protected image URLs', () => {
  it('resolves relative URLs without credentials and preserves absolute HTTPS URLs', () => {
    const relative = resolveAttachmentUrl('/api/tasks/task/images/image/file');
    expect(relative).toContain('/api/tasks/task/images/image/file');
    expect(relative).not.toContain('Bearer');
    expect(resolveAttachmentUrl('https://cdn.example/image.jpg')).toBe('https://cdn.example/image.jpg');
    expect(() => resolveAttachmentUrl('/uploads/images/image.jpg')).toThrow();
  });
});
