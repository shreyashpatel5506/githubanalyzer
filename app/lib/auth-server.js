import { cookies, headers } from 'next/headers';
function readString(value) {
    if (typeof value !== 'string')
        return undefined;
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
}
async function getUserFromCustomSession() {
    var _a, _b, _c, _d;
    const [cookieStore, headerStore] = await Promise.all([cookies(), headers()]);
    const headerUserId = readString(headerStore.get('x-user-id'));
    const cookieUserId = readString((_a = cookieStore.get('cc_user_id')) === null || _a === void 0 ? void 0 : _a.value);
    const userId = headerUserId || cookieUserId;
    if (!userId)
        return null;
    return {
        userId,
        email: readString(headerStore.get('x-user-email')) || readString((_b = cookieStore.get('cc_user_email')) === null || _b === void 0 ? void 0 : _b.value),
        fullName: readString(headerStore.get('x-user-name')) || readString((_c = cookieStore.get('cc_user_name')) === null || _c === void 0 ? void 0 : _c.value),
        avatarUrl: readString(headerStore.get('x-user-avatar')) || readString((_d = cookieStore.get('cc_user_avatar')) === null || _d === void 0 ? void 0 : _d.value),
    };
}
export async function getSessionUser() {
    const fromCustomSession = await getUserFromCustomSession();
    if (fromCustomSession)
        return fromCustomSession;
    return null;
}
