# ngrok Setup for RunPod Webhooks

## Quick Start

### 1. Install ngrok
```bash
# macOS
brew install ngrok/ngrok/ngrok

# Or download from
https://ngrok.com/download
```

### 2. Start ngrok tunnel
```bash
# Run the provided script
./scripts/start-ngrok.sh

# Or manually
ngrok http 3000
```

### 3. Configure environment
Once ngrok starts, you'll see:
```
Forwarding  https://abc123.ngrok.io -> http://localhost:3000
```

Add to `.env.local`:
```bash
WEBHOOK_BASE_URL=https://abc123.ngrok.io
```

### 4. Restart Next.js
```bash
npm run dev
```

## How It Works

1. **With ngrok**: 
   - RunPod sends results to `https://abc123.ngrok.io/api/runpod-webhook`
   - ngrok forwards to `localhost:3000/api/runpod-webhook`
   - No polling needed!

2. **Without ngrok**:
   - Falls back to polling with exponential backoff
   - Still works, just less efficient

## Monitoring

### View webhook traffic
Open: http://127.0.0.1:4040

This shows:
- All incoming webhooks
- Request/response bodies
- Timing information
- Ability to replay requests

## Production

In production, set:
```bash
NEXT_PUBLIC_APP_URL=https://your-app.vercel.app
```

The system automatically uses this for webhooks, no ngrok needed.

## Troubleshooting

### ngrok URL changes every restart
- Free tier limitation
- Consider ngrok paid plan for fixed subdomain
- Or just update `.env.local` each time

### Webhook not receiving
- Check ngrok is running: http://127.0.0.1:4040
- Verify URL in `.env.local`
- Check Next.js console for "Using webhook approach"

### Rate limits
- Free ngrok: 40 connections/minute
- Usually sufficient for development
- Upgrade if needed

## Benefits

✅ **Test real webhook flow**  
✅ **See exact payloads**  
✅ **Catch edge cases early**  
✅ **Same code for dev/prod**  

## Alternative: Polling Mode

If you don't want to use ngrok, just don't set `WEBHOOK_BASE_URL`.
The app automatically falls back to efficient polling with exponential backoff.