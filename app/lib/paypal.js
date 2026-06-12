const PAYPAL_BASE_URL = 'https://api-m.paypal.com';
function requiredEnv(name) {
    const value = process.env[name];
    if (!value) {
        throw new Error(`${name} is missing`);
    }
    return value;
}
export async function getPayPalAccessToken() {
    const clientId = requiredEnv('PAYPAL_CLIENT_ID');
    const clientSecret = requiredEnv('PAYPAL_CLIENT_SECRET');
    const basic = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
    const response = await fetch(`${PAYPAL_BASE_URL}/v1/oauth2/token`, {
        method: 'POST',
        headers: {
            Authorization: `Basic ${basic}`,
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: 'grant_type=client_credentials',
        cache: 'no-store',
    });
    if (!response.ok) {
        const errText = await response.text();
        throw new Error(`PayPal OAuth failed: ${response.status} ${errText}`);
    }
    const data = await response.json();
    if (!data.access_token) {
        throw new Error('PayPal OAuth response missing access_token');
    }
    return data.access_token;
}
export function getPayPalBaseUrl() {
    return PAYPAL_BASE_URL;
}
