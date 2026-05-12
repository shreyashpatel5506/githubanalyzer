import crypto from 'crypto';
import Razorpay from 'razorpay';

export type RazorpayMode = 'test' | 'live';

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is missing`);
  }
  return value;
}

export function getRazorpayMode(): RazorpayMode {
  const mode = (process.env.RAZORPAY_MODE || 'test').toLowerCase();
  return mode === 'live' ? 'live' : 'test';
}

function getRazorpayEnvCandidates(): { keyId: string[]; keySecret: string[] } {
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

function envFromCandidates(candidates: string[]): string {
  for (const candidate of candidates) {
    const value = process.env[candidate];
    if (value) {
      return value;
    }
  }

  throw new Error(`${candidates[0]} is missing`);
}

export function getRazorpayKeyId(): string {
  return envFromCandidates(getRazorpayEnvCandidates().keyId);
}

function getRazorpayKeySecret(): string {
  return envFromCandidates(getRazorpayEnvCandidates().keySecret);
}

export function createRazorpayClient(): Razorpay {
  return new Razorpay({
    key_id: getRazorpayKeyId(),
    key_secret: getRazorpayKeySecret(),
  });
}

export function getRazorpayCurrency(): string {
  return 'INR';
}

export function getRazorpayModeLabel(): string {
  return getRazorpayMode() === 'test' ? 'Test Mode' : 'Live Mode';
}

export function verifyRazorpaySignature(params: {
  orderId: string;
  paymentId: string;
  signature: string;
}): boolean {
  const expectedSignature = crypto
    .createHmac('sha256', getRazorpayKeySecret())
    .update(`${params.orderId}|${params.paymentId}`)
    .digest('hex');

  try {
    return crypto.timingSafeEqual(
      Buffer.from(expectedSignature),
      Buffer.from(params.signature)
    );
  } catch {
    return false;
  }
}