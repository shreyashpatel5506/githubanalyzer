import { Webhook } from 'svix'
import { headers } from 'next/headers'
import { WebhookEvent } from '@clerk/nextjs/server'
import { createAdminClient } from '@/app/lib/supabase'

export async function POST(req: Request) {
    const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET

    if (!WEBHOOK_SECRET) {
        throw new Error('Please add CLERK_WEBHOOK_SECRET from Clerk Dashboard to .env or .env.local')
    }

    // Get the headers
    const headerPayload = await headers()
    const svix_id = headerPayload.get('svix-id')
    const svix_timestamp = headerPayload.get('svix-timestamp')
    const svix_signature = headerPayload.get('svix-signature')

    // If there are no headers, error out
    if (!svix_id || !svix_timestamp || !svix_signature) {
        return new Response('Error occured -- no svix headers', {
            status: 400,
        })
    }

    // Get the body
    const payload = await req.json()
    const body = JSON.stringify(payload)

    // Create a new Svix instance with your secret.
    const wh = new Webhook(WEBHOOK_SECRET)

    let evt: WebhookEvent

    // Verify the payload with the headers
    try {
        evt = wh.verify(body, {
            'svix-id': svix_id,
            'svix-timestamp': svix_timestamp,
            'svix-signature': svix_signature,
        }) as WebhookEvent
    } catch (err) {
        console.error('Error verifying webhook:', err)
        return new Response('Error occured', {
            status: 400,
        })
    }

    const eventType = evt.type

    if (eventType === 'user.created' || eventType === 'user.updated') {
        const { id, email_addresses, first_name, last_name, image_url } = evt.data
        const email = email_addresses[0]?.email_address
        const name = `${first_name ?? ''} ${last_name ?? ''}`.trim()

        const supabase = createAdminClient()

        // 1. Upsert Profile
        const { error: profileError } = await supabase
            .from('profiles')
            .upsert({
                id: id,
                email: email,
                full_name: name || email,
                avatar_url: image_url,
                // Only set default plan on creation, mostly we trust existing value or default in DB
                // But upsert might overwrite if we passed a value. 
                // We rely on DB default 'free' for new rows.
            }, { onConflict: 'id' })

        if (profileError) {
            console.error('Supabase profile sync error:', profileError)
            return new Response('Error syncing profile', { status: 500 })
        }

        // 2. Ensure Usage Meters exist (for new users)
        if (eventType === 'user.created') {
            const { error: meterError } = await supabase
                .from('usage_meters')
                .insert({
                    user_id: id,
                    repo_scans_used: 0,
                    readme_gens_used: 0,
                    pr_gens_used: 0,
                    deep_scans_used_this_week: 0
                })

            if (meterError) {
                console.error('Supabase usage_meters init error:', meterError)
                // treating this as non-fatal but logging it
            }
        }
    }

    return new Response('', { status: 200 })
}
