const apiUrl = process.env.EXPO_PUBLIC_API_URL ?? 'http://10.205.187.96:3000';

export type Task = {
  id: string;
  title: string;
  description: string | null;
  completed: boolean;
  createdAt: string;
  updatedAt: string;
};

type TaskInput = Pick<Task, 'title'> & Partial<Pick<Task, 'description' | 'completed'>>;

const request = async (path: string, token: string, options?: RequestInit) => {
  const url = `${apiUrl}${path}`;
  const response = await fetch(url, {
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    ...options
  });
  if (!response.ok) throw new Error((await response.json()).error?.message ?? 'Request failed.');
  return response.status === 204 ? undefined : response.json();
};

export const tasksApi = {
  list: (token: string) => request('/api/tasks', token) as Promise<Task[]>,
  get: (token: string, id: string) => request(`/api/tasks/${id}`, token) as Promise<Task>,
  create: (token: string, input: TaskInput) => request('/api/tasks', token, { method: 'POST', body: JSON.stringify(input) }) as Promise<Task>,
  update: (token: string, id: string, input: Partial<TaskInput>) => request(`/api/tasks/${id}`, token, { method: 'PATCH', body: JSON.stringify(input) }) as Promise<Task>,
  remove: (token: string, id: string) => request(`/api/tasks/${id}`, token, { method: 'DELETE' }) as Promise<void>
};
