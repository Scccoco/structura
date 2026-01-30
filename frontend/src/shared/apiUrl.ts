/**
 * Единственный источник правды для API_URL.
 * Используйте этот модуль во всех компонентах и сервисах.
 * 
 * В dev: VITE_API_URL пустой → используется /api → Vite proxy → https://api.structura-most.ru
 * В prod: VITE_API_URL=https://api.structura-most.ru на этапе сборки
 */
export const API_URL = import.meta.env.VITE_API_URL || '/api';

// Debug log (можно удалить после отладки)
if (import.meta.env.DEV) {
    console.log('[apiUrl] VITE_API_URL:', import.meta.env.VITE_API_URL);
    console.log('[apiUrl] API_URL resolved:', API_URL);
}
