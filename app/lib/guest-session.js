/**
 * Guest Session Management
 * Handles creation and verification of guest sessions for unauthenticated profile scans
 */
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
const JWT_SECRET = process.env.SESSION_BOOTSTRAP_TOKEN || 'fallback-secret-key';
const TOKEN_EXPIRY_HOURS = 24;
/**
 * Create a new guest session token
 * Used when a guest scans a profile without logging in
 */
export function createGuestSession(email) {
    const guestId = uuidv4();
    const now = Math.floor(Date.now() / 1000);
    const expiresAt = now + TOKEN_EXPIRY_HOURS * 3600;
    const payload = {
        guestId,
        email,
        createdAt: now,
        expiresAt,
    };
    const token = jwt.sign(payload, JWT_SECRET, {
        algorithm: 'HS256',
        expiresIn: `${TOKEN_EXPIRY_HOURS}h`,
    });
    return {
        guestId,
        token,
        email,
    };
}
/**
 * Verify and decode a guest session token
 * Returns the guest ID and email if valid
 */
export function verifyGuestSession(token) {
    try {
        const decoded = jwt.verify(token, JWT_SECRET, {
            algorithms: ['HS256'],
        });
        return decoded;
    }
    catch (error) {
        console.error('[GuestSession] Verification failed:', error);
        return null;
    }
}
/**
 * Extract guest token from request header
 * Expected: "Authorization: Bearer <guest-token>"
 */
export function extractGuestToken(authHeader) {
    if (!authHeader)
        return null;
    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0].toLowerCase() !== 'bearer') {
        return null;
    }
    return parts[1];
}
/**
 * Get guest ID from request (via session cookie or header)
 */
export function getGuestIdFromRequest(req) {
    // Check Authorization header first
    const authHeader = req.headers.get('Authorization');
    if (authHeader) {
        const token = extractGuestToken(authHeader);
        if (token) {
            const session = verifyGuestSession(token);
            return (session === null || session === void 0 ? void 0 : session.guestId) || null;
        }
    }
    // Check cookies
    const cookies = req.headers.get('Cookie') || '';
    const guestTokenMatch = cookies.match(/guest_session=([^;]+)/);
    if (guestTokenMatch) {
        const token = guestTokenMatch[1];
        const session = verifyGuestSession(token);
        return (session === null || session === void 0 ? void 0 : session.guestId) || null;
    }
    return null;
}
/**
 * Create a claim token for converting guest to authenticated user
 */
export function createClaimToken(guestId, email) {
    const payload = {
        guestId,
        email,
        type: 'guest-claim',
        createdAt: Math.floor(Date.now() / 1000),
    };
    return jwt.sign(payload, JWT_SECRET, {
        algorithm: 'HS256',
        expiresIn: '24h',
    });
}
/**
 * Verify and decode a claim token
 */
export function verifyClaimToken(token) {
    try {
        const decoded = jwt.verify(token, JWT_SECRET, {
            algorithms: ['HS256'],
        });
        if (decoded.type !== 'guest-claim') {
            return null;
        }
        return {
            guestId: decoded.guestId,
            email: decoded.email,
        };
    }
    catch (error) {
        console.error('[ClaimToken] Verification failed:', error);
        return null;
    }
}
