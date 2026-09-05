import type { ImageAttachment } from './attachments';
import type { LocalFile } from './task-repository';

export type DisplayImage = ImageAttachment & {
  identity: string;
  localFileId?: string;
  remoteImageId?: string;
  localUri?: string;
};

export const reconcileImages = (localFiles: LocalFile[], remoteImages: ImageAttachment[]): DisplayImage[] => {
  const remoteById = new Map(remoteImages.map((image) => [image.id, image]));
  const local = localFiles.map((file) => {
    const remote = file.remoteImageId ? remoteById.get(file.remoteImageId) : undefined;
    if (remote) remoteById.delete(remote.id);
    return {
      ...(remote ?? {
        id: file.id,
        filename: 'Fotografía local',
        url: file.uri,
        mimeType: 'image/*',
        size: 0,
        createdAt: file.createdAt
      }),
      identity: file.id,
      localFileId: file.id,
      remoteImageId: remote?.id ?? file.remoteImageId ?? undefined,
      contentUrl: remote?.contentUrl ?? file.contentUrl ?? undefined,
      localUri: file.uri
    };
  });
  const remaining: DisplayImage[] = Array.from(remoteById.values(), (image) => ({
    ...image,
    identity: image.id,
    remoteImageId: image.id
  }));
  return [...local, ...remaining];
};
