-- Sample data for AI/ASR evaluation_results table
-- These are example evaluation results for testing the evaluation API

-- Only insert if table is empty (for development/testing)
INSERT INTO public.evaluation_results (
  request_id,
  job_id,
  score,
  feedback,
  what_changed,
  practice_rule,
  duration_ms,
  tokens_used,
  created_at
)
SELECT * FROM (VALUES
  (
    '550e8400-e29b-41d4-a716-446655440000'::uuid,
    'job-sample-001',
    85,
    'Strong leadership example with quantifiable results. The response demonstrates clear ownership, team coordination, and successful delivery. Consider adding more context about challenges faced and how you overcame them.',
    'Added specific metrics (team size, timeline), quantified the outcome (two weeks ahead of schedule), and included stakeholder satisfaction',
    'Always include specific metrics and quantifiable outcomes when discussing project achievements',
    2450,
    420,
    NOW() - INTERVAL '2 days'
  ),
  (
    '550e8400-e29b-41d4-a716-446655440010'::uuid,
    'job-sample-002',
    72,
    'Good technical explanation but could be more structured. You covered the main concepts but the flow could be improved. Try using the STAR method (Situation, Task, Action, Result) to organize your response.',
    'Added clearer structure, separated problem statement from solution, included specific technologies used',
    'Use the STAR method to structure technical explanations for better clarity',
    3200,
    580,
    NOW() - INTERVAL '1 day'
  ),
  (
    '550e8400-e29b-41d4-a716-446655440020'::uuid,
    'job-sample-003',
    91,
    'Excellent response with strong communication and problem-solving demonstration. You effectively showed how you handled a complex situation, involved stakeholders, and achieved a positive outcome. Minor improvement: could mention lessons learned.',
    'Enhanced stakeholder communication details, clarified decision-making process, added impact metrics',
    'When discussing problem-solving, always include stakeholder communication and measurable impact',
    2800,
    455,
    NOW() - INTERVAL '12 hours'
  )
) AS v(request_id, job_id, score, feedback, what_changed, practice_rule, duration_ms, tokens_used, created_at)
WHERE NOT EXISTS (
  SELECT 1 FROM public.evaluation_results LIMIT 1
);
