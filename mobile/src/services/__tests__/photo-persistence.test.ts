jest.mock('../local-media', () => ({ copyLocalImage: jest.fn(), deleteLocalFile: jest.fn() }));
import { copyLocalImage, deleteLocalFile } from '../local-media';
import { persistCapturedPhoto } from '../photo-persistence';

const photo = { uri: 'file:///cache/camera.jpg', width: 100, height: 100, mimeType: 'image/jpeg', fileName: 'camera.jpg' };

describe('persistCapturedPhoto', () => {
  beforeEach(() => jest.clearAllMocks());

  it('copies first, then associates persistent URI with owner and localId', async () => {
    jest.mocked(copyLocalImage).mockResolvedValue('file:///documents/persistent.jpg');
    const saveLocalImage = jest.fn().mockResolvedValue({ id: 'file-1', ownerId: 'owner-1', taskLocalId: 'local-1', kind: 'image', uri: 'file:///documents/persistent.jpg', createdAt: '2026-09-03T00:00:00.000Z' });

    await expect(persistCapturedPhoto({ saveLocalImage }, 'owner-1', 'local-1', photo)).resolves.toMatchObject({ id: 'file-1' });
    expect(copyLocalImage).toHaveBeenCalledWith('owner-1', 'local-1', photo.uri);
    expect(saveLocalImage).toHaveBeenCalledWith('owner-1', 'local-1', 'file:///documents/persistent.jpg', 'image/jpeg', 'camera.jpg');
  });

  it('does not announce persistence and removes copied orphan when association fails', async () => {
    jest.mocked(copyLocalImage).mockResolvedValue('file:///documents/orphan.jpg');
    const error = new Error('SQLite unavailable');
    const saveLocalImage = jest.fn().mockRejectedValue(error);

    await expect(persistCapturedPhoto({ saveLocalImage }, 'owner-1', 'local-1', photo)).rejects.toBe(error);
    expect(deleteLocalFile).toHaveBeenCalledWith('file:///documents/orphan.jpg');
  });

  it('preserves copy failures without creating metadata', async () => {
    const error = new Error('Selected image is unavailable.');
    jest.mocked(copyLocalImage).mockRejectedValue(error);
    const saveLocalImage = jest.fn();

    await expect(persistCapturedPhoto({ saveLocalImage }, 'owner-1', 'local-1', photo)).rejects.toBe(error);
    expect(saveLocalImage).not.toHaveBeenCalled();
  });
});
