-- Migration to document the enhanced content pack schema with difficulty levels and time estimates
-- Note: The content_packs table stores content as JSONB, so no schema changes are needed.
-- This migration serves as documentation for the expected structure.

-- Expected Content Pack Structure (JSONB):
-- {
--   "evaluations": [
--     {
--       "id": "string",
--       "title": "string",
--       "description": "string",
--       "difficulty": "beginner" | "intermediate" | "hard",  -- NEW FIELD
--       "estimatedMinutes": number,                          -- NEW FIELD
--       "criteria": [...],
--       "questions": [
--         {
--           "id": "string",
--           "text": "string",
--           "type": "text" | "audio",
--           "difficulty": "beginner" | "intermediate" | "hard",  -- NEW FIELD
--           "estimatedMinutes": number                           -- NEW FIELD
--         }
--       ]
--     }
--   ],
--   "categories": [...]
-- }

-- Add a comment to the content_packs table documenting the enhanced schema
COMMENT ON COLUMN content_packs.content IS
'JSONB content structure. Enhanced schema includes:
- evaluations[].difficulty: "beginner" | "intermediate" | "hard"
- evaluations[].estimatedMinutes: number (total time for all questions)
- evaluations[].questions[].difficulty: "beginner" | "intermediate" | "hard"
- evaluations[].questions[].estimatedMinutes: number (time per question)';

-- No actual schema changes needed since content is stored as JSONB
-- The validation will be handled by the application layer (Zod schemas)
