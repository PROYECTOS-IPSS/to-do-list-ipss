import { Directory, File, Paths } from 'expo-file-system';

const mediaDirectory = (ownerId: string) => new Directory(Paths.document, 'task-manager-media', ownerId);

export async function copyLocalImage(ownerId: string, taskLocalId: string, sourceUri: string): Promise<string> {
  const source = new File(sourceUri);
  if (!source.exists) throw new Error('Selected image is unavailable.');
  const directory = mediaDirectory(ownerId);
  directory.create({ idempotent: true, intermediates: true });
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const destination = new File(directory, `${taskLocalId}-${suffix}${source.extension || '.jpg'}`);
  await source.copy(destination);
  return destination.uri;
}

export async function copyLocalAudio(ownerId: string, taskLocalId: string, sourceUri: string, filename: string): Promise<string> {
  const source = new File(sourceUri);
  if (!source.exists) throw new Error('Recorded audio is unavailable.');
  const directory = new Directory(Paths.document, 'task-manager-media', ownerId, taskLocalId, 'audio');
  directory.create({ idempotent: true, intermediates: true });
  const destination = new File(directory, filename);
  await source.copy(destination);
  if (!destination.exists) throw new Error('Recorded audio was not persisted.');
  return destination.uri;
}

export function deleteLocalFile(uri: string): void {
  try {
    const file = new File(uri);
    if (file.exists) file.delete();
  } catch {
    // Local cleanup is best effort after the database record is removed.
  }
}
