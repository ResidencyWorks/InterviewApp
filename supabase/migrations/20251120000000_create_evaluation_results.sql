-- Create evaluation_results table for AI/ASR feature
create table if not exists public.evaluation_results (
  request_id uuid primary key,
  job_id text not null,
  score numeric not null,
  feedback text not null,
  what_changed text not null,
  practice_rule text not null,
  duration_ms integer not null,
  tokens_used integer,
  created_at timestamptz not null default now()
);

-- Enable RLS
alter table public.evaluation_results enable row level security;

-- Create policy for service role (full access)
create policy "Service role has full access to evaluation_results"
  on public.evaluation_results
  for all
  using ( auth.role() = 'service_role' );

-- Create policy for authenticated users to read their own results (assuming request_id might be linked to user, but for now just service role or public read if needed?
-- The spec says "authenticated access (API key or Bearer token)".
-- If the API is handling auth and then querying DB, the API (service role) needs access.
-- If the client queries Supabase directly, we need RLS based on user_id.
-- The schema doesn't have user_id.
-- For now, I will stick to service role access as the API is the primary consumer/producer.
-- If we need user access, we should add user_id column.
-- Spec doesn't explicitly ask for user_id in EvaluationResult entity, but it might be in metadata?
-- "EvaluationRequest: { requestId: UUID, text?: string, audio_url?: string, metadata?: object }"
-- I'll stick to the spec columns for now.
