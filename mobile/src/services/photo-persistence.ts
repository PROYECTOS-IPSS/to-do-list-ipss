import type { ImagePickerAsset } from 'expo-image-picker';
import { copyLocalImage, deleteLocalFile } from './local-media';
import type { TaskStore } from './task-store';

export async function persistCapturedPhoto(store: Pick<TaskStore, 'saveLocalImage'>, ownerId: string, taskLocalId: string, photo: ImagePickerAsset) {
  const uri = await copyLocalImage(ownerId, taskLocalId, photo.uri);
  try {
    return await store.saveLocalImage(ownerId, taskLocalId, uri, photo.mimeType ?? 'image/jpeg', photo.fileName ?? 'task-image.jpg');
  } catch (error) {
    deleteLocalFile(uri);
    throw error;
  }
}
