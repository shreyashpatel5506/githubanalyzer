import crypto from 'crypto';
import Razorpay from 'razorpay';
function requiredEnv(name) {
    const value = process.env[name];
    if (!value) {
        throw new Error(`${name} is missing`);
    }
    return value;
}
export function getRazorpayMode() {
    const mode = (process.env.RAZORPAY_MODE || 'test').toLowerCase();
    return mode === 'live' ? 'live' : 'test';
}
function getRazorpayEnvCandidates() {
    const mode = getRazorpayMode();
    if (mode === 'live') {
        return {
            keyId: ['RAZORPAY_LIVE_KEY_ID', 'RAZORPAY_KEY_ID'],
            keySecret: ['RAZORPAY_LIVE_KEY_SECRET', 'RAZORPAY_KEY_SECRET'],
        };
    }
    return {
        keyId: ['RAZORPAY_TEST_KEY_ID', 'TESTAPIKEY', 'RAZORPAY_KEY_ID'],
        keySecret: ['RAZORPAY_TEST_KEY_SECRET', 'TESTAPIKEYSCRERT', 'RAZORPAY_KEY_SECRET'],
    };
}
function envFromCandidates(candidates) {
    for (const candidate of candidates) {
        const value = process.env[candidate];
        if (value) {
            return value;
        }
    }
    throw new Error(`Missing Razorpay env var. Set one of: ${candidates.join(', ')}`);
}
export function getRazorpayKeyId() {
    return envFromCandidates(getRazorpayEnvCandidates().keyId);
}
function getRazorpayKeySecret() {
    return envFromCandidates(getRazorpayEnvCandidates().keySecret);
}
export function createRazorpayClient() {
    return new Razorpay({
        key_id: getRazorpayKeyId(),
        key_secret: getRazorpayKeySecret(),
    });
}
export function getRazorpayCurrency() {
    return 'INR';
}
export function getRazorpayModeLabel() {
    return getRazorpayMode() === 'test' ? 'Test Mode' : 'Live Mode';
}
export function verifyRazorpaySignature(params) {
    const expectedSignature = crypto
        .createHmac('sha256', getRazorpayKeySecret())
        .update(`${params.orderId}|${params.paymentId}`)
        .digest('hex');
    try {
        return crypto.timingSafeEqual(Buffer.from(expectedSignature), Buffer.from(params.signature));
    }
    catch (_a) {
        return false;
    }
}
