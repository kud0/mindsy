-- Add timestamped_transcript and language detection columns to jobs table
-- This stores segment-level timestamps and language info from faster-whisper transcription

-- Add timestamped transcript segments
ALTER TABLE jobs
ADD COLUMN IF NOT EXISTS timestamped_transcript JSONB;

-- Add detected language and confidence
ALTER TABLE jobs
ADD COLUMN IF NOT EXISTS detected_language TEXT;

ALTER TABLE jobs
ADD COLUMN IF NOT EXISTS language_confidence NUMERIC(5,4);

-- Add transcription completion timestamp
ALTER TABLE jobs
ADD COLUMN IF NOT EXISTS transcription_completed_at TIMESTAMPTZ;

-- Add comments explaining the columns
COMMENT ON COLUMN jobs.timestamped_transcript IS 'Timestamped transcript segments from faster-whisper. Format: [{"id": 0, "start": 0.0, "end": 5.2, "text": "..."}]';
COMMENT ON COLUMN jobs.detected_language IS 'ISO language code detected by faster-whisper (e.g., "en", "es", "fr")';
COMMENT ON COLUMN jobs.language_confidence IS 'Confidence score for language detection (0.0 to 1.0)';
COMMENT ON COLUMN jobs.transcription_completed_at IS 'Timestamp when transcription stage completed';

-- Example timestamped_transcript data structure:
-- [
--   {
--     "id": 0,
--     "start": 0.0,
--     "end": 34.5,
--     "text": "Introduction to photosynthesis..."
--   },
--   {
--     "id": 1,
--     "start": 34.6,
--     "end": 79.2,
--     "text": "Plants use sunlight to create energy..."
--   }
-- ]
