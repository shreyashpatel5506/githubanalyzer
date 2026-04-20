import { cookies, headers } from 'next/headers';

export type SessionUser = {
    userId: string;
    email?: string;
    fullName?: string;
    avatarUrl?: string;
};

function readString(value: unknown): string | undefined {
    if (typeof value !== 'string') return undefined;
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
}

async function getUserFromCustomSession(): Promise<SessionUser | null> {
    const [cookieStore, headerStore] = await Promise.all([cookies(), headers()]);

    const headerUserId = readString(headerStore.get('x-user-id'));
    const cookieUserId = readString(cookieStore.get('cc_user_id')?.value);
    const userId = headerUserId || cookieUserId;

    if (!userId) return null;

    return {
        userId,
        email: readString(headerStore.get('x-user-email')) || readString(cookieStore.get('cc_user_email')?.value),
        fullName: readString(headerStore.get('x-user-name')) || readString(cookieStore.get('cc_user_name')?.value),
        avatarUrl: readString(headerStore.get('x-user-avatar')) || readString(cookieStore.get('cc_user_avatar')?.value),
    };
}

export async function getSessionUser(): Promise<SessionUser | null> {
    const fromCustomSession = await getUserFromCustomSession();
    if (fromCustomSession) return fromCustomSession;
    return null;
}
