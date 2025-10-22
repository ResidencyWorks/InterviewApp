-- Sample Evaluation Results Seed Data
-- This file contains additional sample evaluation results for testing

-- ==============================================
-- ADDITIONAL SAMPLE EVALUATION RESULTS
-- ==============================================

-- Insert additional sample evaluation results for more comprehensive testing
INSERT INTO public.evaluation_results (
  user_id,
  content_pack_id,
  response_text,
  response_type,
  duration_seconds,
  word_count,
  wpm,
  categories,
  feedback,
  score,
  status,
  created_at,
  updated_at
) VALUES
-- Additional Software Engineering evaluations
(
  '11111111-1111-1111-1111-111111111111',
  '550e8400-e29b-41d4-a716-446655440001',
  'For the system design question about a distributed cache, I would implement a consistent hashing approach with multiple cache nodes. Each node would be responsible for a range of hash values. For cache invalidation, I would use a write-through strategy where writes go to both cache and database, and implement a TTL-based expiration. To handle network partitions, I would use a quorum-based approach where a majority of nodes must agree on cache updates. For consistency, I would implement eventual consistency with conflict resolution based on timestamps.',
  'text',
  3000,
  189,
  3.78,
  '{"System Design": 88, "Scalability": 85, "Reliability": 90, "Communication": 82}',
  'Good understanding of distributed systems concepts. The consistent hashing approach is solid, and the write-through strategy is appropriate. Consider discussing cache coherence protocols in more detail.',
  86.25,
  'COMPLETED',
  NOW() - INTERVAL '3 days',
  NOW() - INTERVAL '3 days'
),

-- UX Design evaluation
(
  '22222222-2222-2222-2222-222222222222',
  '550e8400-e29b-41d4-a716-446655440004',
  'For user research on a mobile banking app, I would start with user interviews to understand pain points and behaviors. I would conduct contextual inquiries to observe users in their natural environment. For quantitative data, I would use surveys to gather broader insights. I would also analyze existing banking app reviews and conduct competitive analysis. The research would be segmented by user types: tech-savvy millennials, older adults, and small business owners. For the usability test, I would include tasks like: 1) Opening an account, 2) Transferring money, 3) Paying bills, 4) Checking account balance. Success metrics would include task completion rate, time to completion, and user satisfaction scores.',
  'text',
  2700,
  198,
  4.4,
  '{"Research Methods": 90, "User Empathy": 88, "Testing Design": 85, "Communication": 87}',
  'Excellent research methodology with good consideration of different user segments. The usability test design is comprehensive with appropriate success metrics. Consider adding more specific details about the competitive analysis.',
  87.5,
  'COMPLETED',
  NOW() - INTERVAL '2 days',
  NOW() - INTERVAL '2 days'
),

-- DevOps evaluation
(
  '33333333-3333-3333-3333-333333333333',
  '550e8400-e29b-41d4-a716-446655440005',
  'For the CI/CD pipeline for microservices, I would design a multi-stage pipeline: 1) Code commit triggers build, 2) Unit tests and code quality checks, 3) Build Docker images, 4) Integration tests, 5) Security scanning, 6) Deploy to staging, 7) End-to-end tests, 8) Deploy to production with blue-green deployment. For failure handling, I would implement automatic rollback on test failures and manual approval gates for production. The pipeline would use feature flags for gradual rollouts. For blue-green deployment, I would maintain two identical production environments and switch traffic between them. Benefits include zero-downtime deployments and easy rollbacks. Challenges include infrastructure costs and data consistency during the switch.',
  'text',
  3600,
  234,
  3.9,
  '{"Pipeline Design": 92, "Automation": 88, "Best Practices": 90, "Communication": 85}',
  'Comprehensive pipeline design with excellent consideration of failure handling and deployment strategies. Good understanding of blue-green deployment benefits and challenges. Consider discussing monitoring and alerting in more detail.',
  88.75,
  'COMPLETED',
  NOW() - INTERVAL '4 days',
  NOW() - INTERVAL '4 days'
),

-- Marketing evaluation
(
  '44444444-4444-4444-4444-444444444444',
  '550e8400-e29b-41d4-a716-446655440006',
  'For the B2B SaaS startup marketing strategy, I would prioritize: 1) Content marketing and SEO for organic growth, 2) LinkedIn advertising for targeted B2B reach, 3) Webinars and thought leadership content, 4) Partner channel development, 5) Referral programs. The strategy would focus on inbound marketing due to budget constraints. For the mobile app launch campaign, I would use: 1) App store optimization, 2) Social media advertising (Facebook, Instagram, TikTok), 3) Influencer partnerships, 4) PR and media outreach, 5) Email marketing to existing users. Success measurement would include: app downloads, user acquisition cost, retention rates, and revenue per user. I would use multi-touch attribution to understand the customer journey across channels.',
  'text',
  2400,
  201,
  5.03,
  '{"Channel Strategy": 88, "Campaign Planning": 85, "ROI Analysis": 90, "Communication": 87}',
  'Strong strategic thinking with good consideration of budget constraints. The multi-channel approach is well-planned with appropriate success metrics. Consider adding more specific details about content marketing tactics.',
  87.5,
  'COMPLETED',
  NOW() - INTERVAL '1 day',
  NOW() - INTERVAL '1 day'
),

-- Data Science evaluation (additional)
(
  '55555555-5555-5555-5555-555555555555',
  '550e8400-e29b-41d4-a716-446655440003',
  'Random forests and gradient boosting are both ensemble methods but differ in key ways. Random forests use bagging with random feature selection, creating independent trees that vote on the final prediction. Gradient boosting uses boosting, where each tree corrects the errors of previous trees. Random forests are less prone to overfitting and faster to train, while gradient boosting often achieves higher accuracy but is more prone to overfitting. I would use random forests when interpretability and speed are important, and gradient boosting when maximum accuracy is the priority. For overfitting in deep learning, I would use: 1) Dropout layers, 2) L1/L2 regularization, 3) Early stopping, 4) Data augmentation, 5) Batch normalization, 6) Reducing model complexity.',
  'text',
  1800,
  167,
  5.57,
  '{"Algorithm Knowledge": 90, "Model Evaluation": 88, "Practical Application": 85, "Communication": 87}',
  'Excellent comparison of random forests and gradient boosting with clear use cases. Good understanding of overfitting prevention techniques in deep learning. Consider discussing specific regularization techniques in more detail.',
  87.5,
  'COMPLETED',
  NOW() - INTERVAL '6 days',
  NOW() - INTERVAL '6 days'
),

-- Product Management evaluation (additional)
(
  '11111111-1111-1111-1111-111111111111',
  '550e8400-e29b-41d4-a716-446655440002',
  'For the social media engagement metrics, I would track: 1) Daily/Monthly Active Users (DAU/MAU ratio), 2) Session duration and frequency, 3) Content creation rate (posts per user), 4) Engagement rate (likes, comments, shares per post), 5) User retention cohorts, 6) Network growth (friend connections), 7) Content consumption patterns. Success would be defined as increasing user engagement while maintaining or improving retention rates. For the 20% retention drop investigation, I would: 1) Segment users by demographics, behavior, and acquisition channel, 2) Analyze the timing and identify any external events, 3) Review recent product changes and feature releases, 4) Conduct user surveys and interviews, 5) Analyze competitor activity, 6) Check for technical issues or performance problems. Based on findings, I would implement targeted interventions and A/B test solutions.',
  'text',
  2100,
  189,
  5.4,
  '{"Metric Selection": 92, "Data Analysis": 88, "Actionable Insights": 90, "Problem Solving": 87}',
  'Comprehensive metric selection with good understanding of engagement measurement. Excellent problem-solving approach for investigating retention issues. Consider adding more specific action items and success criteria.',
  89.25,
  'COMPLETED',
  NOW() - INTERVAL '7 days',
  NOW() - INTERVAL '7 days'
),

-- Failed evaluation (for testing error handling)
(
  '22222222-2222-2222-2222-222222222222',
  '550e8400-e29b-41d4-a716-446655440001',
  'I would use a hash table to store the data and an array to maintain order. When inserting, I add to both the hash table and the end of the array. For deletion, I find the element in the hash table, swap it with the last element in the array, and update the hash table. For getRandom, I generate a random index and return the element at that position.',
  'text',
  900,
  67,
  4.47,
  '{"Technical Accuracy": 60, "Problem Solving": 65, "Communication": 70, "Code Quality": 55}',
  'The approach is partially correct but lacks important details. You mentioned the basic structure but didn''t explain how to handle the hash table updates during deletion. Also, the time complexity analysis is missing. Consider providing a more complete solution with proper edge case handling.',
  62.5,
  'COMPLETED',
  NOW() - INTERVAL '8 days',
  NOW() - INTERVAL '8 days'
),

-- Incomplete evaluation (for testing different statuses)
(
  '33333333-3333-3333-3333-333333333333',
  '550e8400-e29b-41d4-a716-446655440002',
  'For prioritizing features in a fitness app, I would consider user needs, business impact, and technical feasibility. I would start by conducting user research to understand what features are most important to users. Then I would evaluate each feature based on potential user impact and business value.',
  'text',
  1200,
  89,
  4.45,
  '{"Strategic Thinking": 75, "Market Understanding": 70, "Vision Communication": 80, "Business Acumen": 65}',
  'Good start with the prioritization framework, but the response is incomplete. Consider providing more specific examples of features and how you would evaluate them. Also, include more details about the user research methodology.',
  72.5,
  'PROCESSING',
  NOW() - INTERVAL '1 hour',
  NOW() - INTERVAL '1 hour'
);

-- ==============================================
-- ADDITIONAL USER PROGRESS DATA
-- ==============================================

-- Insert additional user progress data
INSERT INTO public.user_progress (
  user_id,
  content_pack_id,
  total_questions,
  completed_questions,
  average_score,
  best_score,
  worst_score,
  total_time_spent,
  last_activity_at,
  created_at,
  updated_at
) VALUES
-- John Doe's additional progress
(
  '11111111-1111-1111-1111-111111111111',
  '550e8400-e29b-41d4-a716-446655440002',
  4,
  2,
  89.25,
  90,
  88,
  4200,
  NOW() - INTERVAL '7 days',
  NOW() - INTERVAL '30 days',
  NOW() - INTERVAL '7 days'
),

-- Jane Smith's UX Design progress
(
  '22222222-2222-2222-2222-222222222222',
  '550e8400-e29b-41d4-a716-446655440004',
  3,
  1,
  87.5,
  87.5,
  87.5,
  2700,
  NOW() - INTERVAL '2 days',
  NOW() - INTERVAL '15 days',
  NOW() - INTERVAL '2 days'
),

-- Mike Johnson's DevOps progress
(
  '33333333-3333-3333-3333-333333333333',
  '550e8400-e29b-41d4-a716-446655440005',
  2,
  1,
  88.75,
  88.75,
  88.75,
  3600,
  NOW() - INTERVAL '4 days',
  NOW() - INTERVAL '7 days',
  NOW() - INTERVAL '4 days'
),

-- Sarah Wilson's Marketing progress
(
  '44444444-4444-4444-4444-444444444444',
  '550e8400-e29b-41d4-a716-446655440006',
  3,
  1,
  87.5,
  87.5,
  87.5,
  2400,
  NOW() - INTERVAL '1 day',
  NOW() - INTERVAL '45 days',
  NOW() - INTERVAL '1 day'
),

-- Alex Brown's additional Data Science progress
(
  '55555555-5555-5555-5555-555555555555',
  '550e8400-e29b-41d4-a716-446655440003',
  4,
  2,
  87.5,
  88.75,
  62.5,
  2700,
  NOW() - INTERVAL '6 days',
  NOW() - INTERVAL '10 days',
  NOW() - INTERVAL '6 days'
)
ON CONFLICT (user_id, content_pack_id) DO NOTHING;

-- ==============================================
-- ADDITIONAL EVALUATION ANALYTICS
-- ==============================================

-- Insert additional evaluation analytics data
INSERT INTO public.evaluation_analytics (
  user_id,
  date,
  total_evaluations,
  average_score,
  total_time_spent,
  categories_breakdown,
  improvement_trend,
  created_at,
  updated_at
) VALUES
-- John Doe's additional analytics
(
  '11111111-1111-1111-1111-111111111111',
  CURRENT_DATE - INTERVAL '7 days',
  1,
  89.25,
  4200,
  '{"Metric Selection": 92, "Data Analysis": 88, "Actionable Insights": 90, "Problem Solving": 87}',
  '{"trend": "improving", "score_change": 1.75}',
  NOW() - INTERVAL '7 days',
  NOW() - INTERVAL '7 days'
),

-- Jane Smith's UX Design analytics
(
  '22222222-2222-2222-2222-222222222222',
  CURRENT_DATE - INTERVAL '2 days',
  1,
  87.5,
  2700,
  '{"Research Methods": 90, "User Empathy": 88, "Testing Design": 85, "Communication": 87}',
  '{"trend": "stable", "score_change": 0}',
  NOW() - INTERVAL '2 days',
  NOW() - INTERVAL '2 days'
),

-- Mike Johnson's DevOps analytics
(
  '33333333-3333-3333-3333-333333333333',
  CURRENT_DATE - INTERVAL '4 days',
  1,
  88.75,
  3600,
  '{"Pipeline Design": 92, "Automation": 88, "Best Practices": 90, "Communication": 85}',
  '{"trend": "improving", "score_change": 0}',
  NOW() - INTERVAL '4 days',
  NOW() - INTERVAL '4 days'
),

-- Sarah Wilson's Marketing analytics
(
  '44444444-4444-4444-4444-444444444444',
  CURRENT_DATE - INTERVAL '1 day',
  1,
  87.5,
  2400,
  '{"Channel Strategy": 88, "Campaign Planning": 85, "ROI Analysis": 90, "Communication": 87}',
  '{"trend": "stable", "score_change": 0}',
  NOW() - INTERVAL '1 day',
  NOW() - INTERVAL '1 day'
),

-- Alex Brown's additional Data Science analytics
(
  '55555555-5555-5555-5555-555555555555',
  CURRENT_DATE - INTERVAL '6 days',
  1,
  87.5,
  1800,
  '{"Algorithm Knowledge": 90, "Model Evaluation": 88, "Practical Application": 85, "Communication": 87}',
  '{"trend": "declining", "score_change": -1.25}',
  NOW() - INTERVAL '6 days',
  NOW() - INTERVAL '6 days'
)
ON CONFLICT (user_id, date) DO NOTHING;
