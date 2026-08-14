const apiUrl = process.env.EXPO_PUBLIC_API_URL ?? 'http://10.205.187.96:3000';

const request = async (path: string, token: string, options?: RequestInit) => {
  const response = await fetch(`${apiUrl}${path}`, { headers: { Authorization: `Bearer ${token}` }, ...options });
  if (!response.ok) throw new Error((await response.json()).error?.message ?? 'Attachment request failed.');
  return response.status === 204 ? undefined : response.json();
};

const fileBody = (uri: string, name: string, type: string, extra?: Record<string, string>) => {
  const form = new FormData();
  form.append('file', { uri, name, type } as unknown as Blob);
  Object.entries(extra ?? {}).forEach(([key, value]) => form.append(key, value));
  return form;
};

export const attachmentsApi = {
  uploadImage: (token: string, taskId: string, uri: string) => request(`/api/tasks/${taskId}/images`, token, { method: 'POST', body: fileBody(uri, 'task-image.jpg', 'image/jpeg') }),
  images: (token: string, taskId: string) => request(`/api/tasks/${taskId}/images`, token),
  deleteImage: (token: string, taskId: string, imageId: string) => request(`/api/tasks/${taskId}/images/${imageId}`, token, { method: 'DELETE' }),
  uploadAudio: (token: string, taskId: string, uri: string, duration: number) => request(`/api/tasks/${taskId}/audios`, token, { method: 'POST', body: fileBody(uri, 'task-audio.m4a', 'audio/mp4', { duration: String(duration) }) }),
  audios: (token: string, taskId: string) => request(`/api/tasks/${taskId}/audios`, token),
  deleteAudio: (token: string, taskId: string, audioId: string) => request(`/api/tasks/${taskId}/audios/${audioId}`, token, { method: 'DELETE' })
};
