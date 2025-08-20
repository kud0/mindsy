# Transcript Testing Script

This script allows you to test note generation using existing transcripts from the database, bypassing the expensive transcription step.

## 🚀 Quick Start

### List Available Transcripts
```bash
npm run list-transcripts
```
This shows all completed jobs with available transcripts.

### Generate Notes from Existing Transcript
```bash
# English notes (default)
npm run test-with-transcript abc123

# Spanish notes
npm run test-with-transcript abc123 es
```

## 📋 Features

- ✅ **Skip Transcription**: Uses existing transcripts from database
- ⚡ **Fast Testing**: ~10 seconds vs ~60-180 seconds normally
- 🌍 **Multi-language**: Test both English and Spanish translations
- 📄 **Full Pipeline**: Generates both Markdown and PDF outputs
- 💰 **Cost Efficient**: Saves on transcription API calls

## 🔧 Requirements

Make sure these environment variables are set:
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `OPENAI_KEY`
- `GOTENBERG_API_URL`

## 📝 Output Files

The script generates timestamped files:
- `test-output-{jobId}_{lang}_{timestamp}.md` - Markdown notes
- `test-output-{jobId}_{lang}_{timestamp}.pdf` - PDF notes

## 🧪 Testing Spanish Translations

Perfect for testing your improved Spanish translations:
```bash
# Test Spanish note generation
npm run test-with-transcript abc123 es

# Compare with English
npm run test-with-transcript abc123 en
```

## ⚠️ Troubleshooting

- **"Job not found"**: Use `npm run list-transcripts` to see available jobs
- **"No transcript file"**: Only completed jobs with transcripts work
- **API errors**: Check your environment variables
- **Permission errors**: Make sure script is executable (`chmod +x`)

## 📊 Performance Comparison

| Method | Time | Cost | Use Case |
|--------|------|------|----------|
| Normal Pipeline | 60-180s | High (transcription) | Production |
| This Script | ~10s | Low (notes only) | Testing/Development |

## 🔍 How It Works

1. **Fetch Job**: Gets job details from `jobs` table
2. **Download Transcript**: Pulls existing TXT file from Supabase Storage
3. **Generate Notes**: Uses OpenAI to create Mindsy Notes (EN/ES)
4. **Create PDF**: Uses Gotenberg to generate formatted PDF
5. **Save Results**: Outputs timestamped files for review

Perfect for testing new features, translations, or formatting changes without waiting for transcription!