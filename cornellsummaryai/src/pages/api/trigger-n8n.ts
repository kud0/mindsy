// src/pages/api/generate.ts
import type { APIRoute } from 'astro';

export const POST: APIRoute = async ({ request }) => {
  try {
    const data = await request.json();
    const n8nWebhookUrl = import.meta.env.N8N_WEBHOOK_URL;
    const n8nSecretKey = import.meta.env.N8N_SECRET_KEY;

    // --- START DEBUGGING ---
    console.log('--- Triggering n8n ---');
    console.log('Webhook URL:', n8nWebhookUrl);
    console.log('Secret Key Loaded:', n8nSecretKey ? `Yes, ends with ...${n8nSecretKey.slice(-4)}` : 'No, IT IS UNDEFINED!');
    // --- END DEBUGGING ---

    if (!n8nWebhookUrl || !n8nSecretKey) {
      // This will now catch if the key is undefined
      return new Response(JSON.stringify({ error: 'N8N environment variables not configured on server' }), {
        status: 500,
      });
    }

    const response = await fetch(n8nWebhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Webhook-Secret': n8nSecretKey,
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
        const errorBody = await response.text();
        console.error(`N8N webhook returned ${response.status}:`, errorBody);
        throw new Error(`N8N webhook returned ${response.status}`);
    }

    return new Response(JSON.stringify({ success: true }), { status: 200 });

  } catch (error) {
    console.error('Error in /api/generate:', error);
    return new Response(JSON.stringify({ error: 'Failed to trigger processing' }), {
      status: 500,
    });
  }
};