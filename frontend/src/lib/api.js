export const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:3600/api').replace(/\/$/, '');

export const apiKeres = async (utvonal, { body, ...opciok } = {}, hibaUzenet = 'A kérés nem sikerült.') => {
    const response = await fetch(`${API_URL}${utvonal}`, {
        credentials: 'include',
        ...opciok,
        headers: body !== undefined ? { 'Content-Type': 'application/json', ...opciok.headers } : opciok.headers,
        body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
        const error = new Error(data.error || hibaUzenet);
        error.status = response.status;
        throw error;
    }
    return data;
};
