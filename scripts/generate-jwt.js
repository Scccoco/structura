/**
 * Генерация JWT токенов для ZMK ролей
 * node generate-jwt.js
 */

const crypto = require('crypto');

const JWT_SECRET = 'super-secret-jwt-token-with-at-least-32-characters-long';

// Маппинг ролей на PostgreSQL роли
const ROLES = {
    'viewer': 'zmk_viewer',
    'user': 'zmk_user',
    'bim_manager': 'zmk_bim',
    'manager': 'zmk_manager',
    'admin': 'zmk_user'  // admin использует zmk_user + доп права через SECURITY DEFINER
};

function base64UrlEncode(str) {
    return Buffer.from(str)
        .toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');
}

function generateJWT(role, expiresInDays = 365) {
    const header = { alg: 'HS256', typ: 'JWT' };
    const payload = {
        role: ROLES[role] || 'zmk_anon',
        user_role: role,
        exp: Math.floor(Date.now() / 1000) + (expiresInDays * 24 * 60 * 60)
    };

    const headerB64 = base64UrlEncode(JSON.stringify(header));
    const payloadB64 = base64UrlEncode(JSON.stringify(payload));
    const data = `${headerB64}.${payloadB64}`;

    const signature = crypto
        .createHmac('sha256', JWT_SECRET)
        .update(data)
        .digest('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');

    return `${data}.${signature}`;
}

console.log('=== JWT Токены для ZMK ===\n');
console.log('JWT_SECRET:', JWT_SECRET, '\n');

for (const role of Object.keys(ROLES)) {
    const token = generateJWT(role);
    console.log(`${role.toUpperCase()}:`);
    console.log(token);
    console.log('');
}

// Также выведём токены для .env.local
console.log('\n=== Для .env.local ===\n');
console.log(`VITE_JWT_BIM_MANAGER=${generateJWT('bim_manager')}`);
console.log(`VITE_JWT_ADMIN=${generateJWT('admin')}`);
