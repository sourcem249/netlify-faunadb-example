export async function api(path, options = {}) {
  const response = await fetch(path, {
    credentials: 'same-origin',
    ...options,
    headers: {
      ...(options.body && !(options.body instanceof FormData)
        ? { 'Content-Type': 'application/json' }
        : {}),
      ...options.headers,
    },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || '요청에 실패했습니다.');
  }
  return data;
}

export const CATEGORIES = ['작물', '가축', '채집', '마을', '날씨', '요리'];
export const SEASONS = ['봄', '여름', '가을', '겨울'];

export function formatWhen(value) {
  if (!value) return '';
  return new Date(value).toLocaleString('ko-KR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}
