/**
 * Auth Service for ZMK
 * JWT авторизация для работы с PostgREST
 */

// Типы
export interface User {
    id: number;
    email: string;
    name: string;
    role: 'viewer' | 'user' | 'bim_manager' | 'manager' | 'admin';
}

export interface AuthState {
    user: User | null;
    token: string | null;
    isAuthenticated: boolean;
}

// Предварительно сгенерированные JWT токены с валидной HMAC-SHA256 подписью
// JWT_SECRET: super-secret-jwt-token-with-at-least-32-characters-long
// Срок: 1 год
const ROLE_TOKENS: Record<string, string> = {
    'viewer': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiem1rX3ZpZXdlciIsInVzZXJfcm9sZSI6InZpZXdlciIsImV4cCI6MTgwMDUzNTQ1MX0.ONQWueJM-7qYlpQDV_5U5RyqfBzqlD7VyIk2hdAW9iA',
    'user': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiem1rX3VzZXIiLCJ1c2VyX3JvbGUiOiJ1c2VyIiwiZXhwIjoxODAwNTM1NDUxfQ.4M3Gi8asZvdihgTEjcOou9-_U-G9x2jJ0m1NXc5qNWY',
    'bim_manager': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiem1rX2JpbSIsInVzZXJfcm9sZSI6ImJpbV9tYW5hZ2VyIiwiZXhwIjoxODAwNTM1NDUxfQ.U6I6hx5kM4SvfouDV6nKXLOp7TWQQhyXd4MRk-JYs-4',
    'manager': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiem1rX21hbmFnZXIiLCJ1c2VyX3JvbGUiOiJtYW5hZ2VyIiwiZXhwIjoxODAwNTM1NDUxfQ.g3LHBTTWrAwdFETceqUlJ4vz1eEdAVbCTgoEs93Hba8',
    'admin': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiem1rX3VzZXIiLCJ1c2VyX3JvbGUiOiJhZG1pbiIsImV4cCI6MTgwMDUzNTQ1MX0.G_eKwNy_ok8Um2FXhChdrKXGuqm_01oRUEsGfTLs8zk'
};

/**
 * Получить JWT токен для роли
 */
export function getTokenForRole(role: User['role']): string {
    return ROLE_TOKENS[role] || ROLE_TOKENS['viewer'];
}

// Storage keys
const STORAGE_KEY = 'zmk_auth';

/**
 * Сохранить авторизацию
 */
export function saveAuth(user: User, token: string): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ user, token }));
}

/**
 * Загрузить авторизацию
 */
export function loadAuth(): AuthState {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
            const { user, token } = JSON.parse(stored);
            return { user, token, isAuthenticated: true };
        }
    } catch (e) {
        console.error('Failed to load auth:', e);
    }
    return { user: null, token: null, isAuthenticated: false };
}

/**
 * Выйти
 */
export function logout(): void {
    localStorage.removeItem(STORAGE_KEY);
}

/**
 * Получить заголовки для API запросов
 */
export function getAuthHeaders(): HeadersInit {
    const auth = loadAuth();
    const headers: HeadersInit = {
        'Content-Type': 'application/json'
    };

    if (auth.token) {
        headers['Authorization'] = `Bearer ${auth.token}`;
    }

    return headers;
}

/**
 * Логин через RPC
 */
export async function login(email: string, password: string): Promise<{ success: boolean; user?: User; error?: string }> {
    try {
        const res = await fetch('/api-zmk/rpc/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ p_email: email, p_password: password })
        });

        const data = await res.json();

        if (data.success && data.user) {
            const user = data.user as User;
            const token = getTokenForRole(user.role);
            saveAuth(user, token);
            return { success: true, user };
        }

        return { success: false, error: data.error || 'Login failed' };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

/**
 * Проверка прав
 */
export function hasPermission(requiredRole: User['role']): boolean {
    const auth = loadAuth();
    if (!auth.user) return false;

    const roleHierarchy = ['viewer', 'user', 'bim_manager', 'manager', 'admin'];
    const userLevel = roleHierarchy.indexOf(auth.user.role);
    const requiredLevel = roleHierarchy.indexOf(requiredRole);

    return userLevel >= requiredLevel;
}

/**
 * Названия ролей на русском
 */
export const ROLE_NAMES: Record<User['role'], string> = {
    'viewer': 'Просмотр',
    'user': 'Пользователь',
    'bim_manager': 'BIM Менеджер',
    'manager': 'Руководитель',
    'admin': 'Администратор'
};
