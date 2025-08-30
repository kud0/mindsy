#!/bin/bash

# Start ngrok tunnel for webhook development
# Usage: ./scripts/start-ngrok.sh

PORT=${PORT:-3000}
SUBDOMAIN=${NGROK_SUBDOMAIN:-mindsy-dev}

echo "🚇 Starting ngrok tunnel for port $PORT..."

# Check if ngrok is installed
if ! command -v ngrok &> /dev/null; then
    echo "❌ ngrok is not installed!"
    echo "Install with: brew install ngrok/ngrok/ngrok"
    echo "Or download from: https://ngrok.com/download"
    exit 1
fi

# Start ngrok with a subdomain if you have a paid account
if [ -n "$NGROK_AUTH_TOKEN" ]; then
    ngrok config add-authtoken $NGROK_AUTH_TOKEN
    echo "✅ Using ngrok with auth token"
    
    # Try to use subdomain if available (paid feature)
    ngrok http $PORT --subdomain=$SUBDOMAIN 2>/dev/null || ngrok http $PORT
else
    # Free tier - random URL
    echo "📝 Using ngrok free tier (random URL)"
    ngrok http $PORT
fi

echo "
📌 Once ngrok starts:
1. Copy the HTTPS URL (e.g., https://abc123.ngrok.io)
2. Add to .env.local:
   WEBHOOK_BASE_URL=https://abc123.ngrok.io
3. Restart your Next.js server to pick up the new URL
4. View webhook traffic at: http://127.0.0.1:4040
"