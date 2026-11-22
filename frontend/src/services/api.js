// Calls to our backend API. Adds the login token to every request.
import { getToken, logout } from './auth.js';

const API_URL = import.meta.env.VITE_API_URL;

async function request(method, path, body) {
  const res = await fetch(API_URL + path, {
    method,
    headers: {
      Authorization: getToken() ?? '',
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (res.status === 401) {
    // Token missing or expired: back to the login page.
    logout();
    window.location.hash = '#/login';
    throw new Error('Your session has expired. Please log in again.');
  }
  if (res.status === 204) return null;

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const error = new Error(data.error?.message ?? 'Something went wrong');
    error.code = data.error?.code; // e.g. "ALREADY_SUBMITTED"
    throw error;
  }
  return data;
}

export const api = {
  get: (path) => request('GET', path),
  post: (path, body) => request('POST', path, body),
  put: (path, body) => request('PUT', path, body),
  patch: (path, body) => request('PATCH', path, body),
  delete: (path) => request('DELETE', path),
};

// Uploads a file straight to S3 using a pre-signed URL from the API.
export async function uploadToS3(uploadUrl, file) {
  const res = await fetch(uploadUrl, { method: 'PUT', headers: { 'Content-Type': file.type }, body: file });
  if (!res.ok) throw new Error('Image upload failed');
}
