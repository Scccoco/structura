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

// Маппинг ролей на PostgreSQL роли
const ROLE_TO_PG_ROLE: Record<string, string> = {
    'viewer': 'zmk_viewer',
    'user': 'zmk_user',
    'bim_manager': 'zmk_bim',
    'manager': 'zmk_manager',
    'admin': 'zmk_user' // admin использует zmk_user + доп. права
};

/**
 * Простая Base64 кодировка (для JWT без внешних зависимостей)
 */
function base64UrlEncode(str: string): string {
    return btoa(str)
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');
}

/**
 * Генерация JWT токена на клиенте
 * ВНИМАНИЕ: В production JWT должен генерироваться на сервере!
 */
export function generateJWT(user: User): string {
    const header = { alg: 'HS256', typ: 'JWT' };
    const payload = {
        role: ROLE_TO_PG_ROLE[user.role] || 'zmk_anon',
        sub: user.email,
        user_id: user.id,
        user_role: user.role,
        exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60) // 24 часа
    };

    const headerB64 = base64UrlEncode(JSON.stringify(header));
    const payloadB64 = base64UrlEncode(JSON.stringify(payload));

    // Для dev - фейковая подпись (в реальности нужен HMAC-SHA256)
    const signature = base64UrlEncode('dev-signature-' + user.id);

    return `${headerB64}.${payloadB64}.${signature}`;
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
            const token = generateJWT(user);
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
