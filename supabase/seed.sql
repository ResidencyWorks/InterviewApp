-- Seed data for Interview Drills application
-- This file contains comprehensive sample data for development and testing

-- ==============================================
-- CONTENT PACKS SEED DATA
-- ==============================================

-- Insert comprehensive content packs with realistic interview questions
INSERT INTO public.content_packs (
  id,
  name,
  version,
  description,
  schema_version,
  content,
  metadata,
  status,
  is_active,
  uploaded_by,
  file_size,
  checksum
) VALUES
-- Software Engineering Content Pack
(
  '550e8400-e29b-41d4-a716-446655440001',
  'Software Engineering Fundamentals',
  '1.0.0',
  'Comprehensive software engineering interview questions covering algorithms, data structures, system design, and coding practices.',
  '1.0.0',
  '{
    "version": "1.0.0",
    "name": "Software Engineering Fundamentals",
    "description": "Comprehensive software engineering interview questions",
    "content": {
      "evaluations": [
        {
          "id": "eval-se-001",
          "title": "Algorithm and Data Structures",
          "description": "Test fundamental computer science knowledge",
          "difficulty": "intermediate",
          "estimated_duration": 45,
          "criteria": [
            {
              "id": "crit-algo-001",
              "name": "Algorithm Efficiency",
              "weight": 0.3,
              "description": "Time and space complexity analysis"
            },
            {
              "id": "crit-algo-002",
              "name": "Code Quality",
              "weight": 0.4,
              "description": "Clean, readable, and maintainable code"
            },
            {
              "id": "crit-algo-003",
              "name": "Problem Solving",
              "weight": 0.3,
              "description": "Logical approach and problem breakdown"
            }
          ],
          "questions": [
            {
              "id": "q-se-001",
              "text": "Implement a function to find the longest common subsequence between two strings. What is the time complexity?",
              "type": "coding",
              "difficulty": "medium",
              "expected_time": 20,
              "hints": ["Consider dynamic programming", "Think about the relationship between characters"]
            },
            {
              "id": "q-se-002",
              "text": "Design a data structure that supports insert, delete, and getRandom operations in O(1) time.",
              "type": "system_design",
              "difficulty": "hard",
              "expected_time": 25,
              "hints": ["Use a combination of hash map and array", "Maintain indices for O(1) access"]
            },
            {
              "id": "q-se-003",
              "text": "Given a binary tree, find the maximum path sum. A path is defined as any sequence of nodes from some starting node to any node in the tree along the parent-child connections.",
              "type": "coding",
              "difficulty": "hard",
              "expected_time": 30,
              "hints": ["Use recursion", "Consider both paths through and ending at each node"]
            }
          ]
        },
        {
          "id": "eval-se-002",
          "title": "System Design",
          "description": "Design scalable systems and architectures",
          "difficulty": "advanced",
          "estimated_duration": 60,
          "criteria": [
            {
              "id": "crit-sys-001",
              "name": "Scalability",
              "weight": 0.4,
              "description": "Ability to handle growth and load"
            },
            {
              "id": "crit-sys-002",
              "name": "Reliability",
              "weight": 0.3,
              "description": "Fault tolerance and availability"
            },
            {
              "id": "crit-sys-003",
              "name": "Trade-offs",
              "weight": 0.3,
              "description": "Understanding of design trade-offs"
            }
          ],
          "questions": [
            {
              "id": "q-sys-001",
              "text": "Design a URL shortener service like bit.ly. How would you handle 100 million URLs per day?",
              "type": "system_design",
              "difficulty": "medium",
              "expected_time": 45,
              "hints": ["Consider database sharding", "Think about caching strategies", "Plan for unique ID generation"]
            },
            {
              "id": "q-sys-002",
              "text": "Design a distributed cache system. How would you ensure consistency and handle cache invalidation?",
              "type": "system_design",
              "difficulty": "hard",
              "expected_time": 50,
              "hints": ["Consider consistency models", "Think about cache coherence protocols", "Plan for network partitions"]
            }
          ]
        }
      ],
      "categories": [
        {
          "id": "cat-se-001",
          "name": "Algorithms",
          "description": "Algorithm design and analysis questions"
        },
        {
          "id": "cat-se-002",
          "name": "Data Structures",
          "description": "Data structure implementation and usage"
        },
        {
          "id": "cat-se-003",
          "name": "System Design",
          "description": "Large-scale system architecture and design"
        },
        {
          "id": "cat-se-004",
          "name": "Database Design",
          "description": "Database schema and query optimization"
        }
      ]
    },
    "metadata": {
      "author": "Interview Drills Team",
      "tags": ["software-engineering", "algorithms", "system-design"],
      "target_roles": ["software-engineer", "senior-engineer", "tech-lead"],
      "compatibility": {
        "minVersion": "1.0.0"
      }
    }
  }',
  '{
    "author": "Interview Drills Team",
    "tags": ["software-engineering", "algorithms", "system-design"],
    "target_roles": ["software-engineer", "senior-engineer", "tech-lead"],
    "difficulty_levels": ["intermediate", "advanced"],
    "estimated_completion_time": "2-3 hours"
  }',
  'activated',
  true,
  null,
  15360,
  'a1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef123456'
),

-- Product Management Content Pack
(
  '550e8400-e29b-41d4-a716-446655440002',
  'Product Management Essentials',
  '1.0.0',
  'Product management interview questions covering strategy, metrics, user research, and product development lifecycle.',
  '1.0.0',
  '{
    "version": "1.0.0",
    "name": "Product Management Essentials",
    "description": "Comprehensive product management interview questions",
    "content": {
      "evaluations": [
        {
          "id": "eval-pm-001",
          "title": "Product Strategy & Vision",
          "description": "Test strategic thinking and product vision",
          "difficulty": "intermediate",
          "estimated_duration": 40,
          "criteria": [
            {
              "id": "crit-strategy-001",
              "name": "Strategic Thinking",
              "weight": 0.4,
              "description": "Ability to think strategically about product direction"
            },
            {
              "id": "crit-strategy-002",
              "name": "Market Understanding",
              "weight": 0.3,
              "description": "Understanding of market dynamics and competition"
            },
            {
              "id": "crit-strategy-003",
              "name": "Vision Communication",
              "weight": 0.3,
              "description": "Clarity in communicating product vision"
            }
          ],
          "questions": [
            {
              "id": "q-pm-001",
              "text": "How would you prioritize features for a new mobile app that helps people track their fitness goals?",
              "type": "product_strategy",
              "difficulty": "medium",
              "expected_time": 20,
              "hints": ["Consider user needs", "Think about business impact", "Evaluate technical feasibility"]
            },
            {
              "id": "q-pm-002",
              "text": "Design a product roadmap for the next 6 months for an e-commerce platform. What factors would influence your decisions?",
              "type": "product_strategy",
              "difficulty": "hard",
              "expected_time": 25,
              "hints": ["Consider business objectives", "Think about user feedback", "Evaluate market trends"]
            }
          ]
        },
        {
          "id": "eval-pm-002",
          "title": "Metrics & Analytics",
          "description": "Understanding of product metrics and data-driven decision making",
          "difficulty": "intermediate",
          "estimated_duration": 35,
          "criteria": [
            {
              "id": "crit-metrics-001",
              "name": "Metric Selection",
              "weight": 0.4,
              "description": "Choosing appropriate metrics for different scenarios"
            },
            {
              "id": "crit-metrics-002",
              "name": "Data Analysis",
              "weight": 0.3,
              "description": "Ability to analyze and interpret data"
            },
            {
              "id": "crit-metrics-003",
              "name": "Actionable Insights",
              "weight": 0.3,
              "description": "Deriving actionable insights from data"
            }
          ],
          "questions": [
            {
              "id": "q-metrics-001",
              "text": "What metrics would you track for a social media app to measure user engagement? How would you define success?",
              "type": "metrics",
              "difficulty": "medium",
              "expected_time": 15,
              "hints": ["Consider different types of engagement", "Think about leading vs lagging indicators", "Define success criteria"]
            },
            {
              "id": "q-metrics-002",
              "text": "If user retention dropped by 20% month-over-month, how would you investigate and what actions would you take?",
              "type": "metrics",
              "difficulty": "hard",
              "expected_time": 20,
              "hints": ["Segment the data", "Look for patterns", "Consider external factors"]
            }
          ]
        }
      ],
      "categories": [
        {
          "id": "cat-pm-001",
          "name": "Product Strategy",
          "description": "Strategic thinking and product vision"
        },
        {
          "id": "cat-pm-002",
          "name": "User Research",
          "description": "Understanding users and their needs"
        },
        {
          "id": "cat-pm-003",
          "name": "Metrics & Analytics",
          "description": "Data-driven decision making"
        },
        {
          "id": "cat-pm-004",
          "name": "Cross-functional Collaboration",
          "description": "Working with engineering, design, and other teams"
        }
      ]
    },
    "metadata": {
      "author": "Interview Drills Team",
      "tags": ["product-management", "strategy", "metrics"],
      "target_roles": ["product-manager", "senior-pm", "product-director"],
      "compatibility": {
        "minVersion": "1.0.0"
      }
    }
  }',
  '{
    "author": "Interview Drills Team",
    "tags": ["product-management", "strategy", "metrics"],
    "target_roles": ["product-manager", "senior-pm", "product-director"],
    "difficulty_levels": ["intermediate", "advanced"],
    "estimated_completion_time": "1.5-2 hours"
  }',
  'valid',
  false,
  null,
  12800,
  'b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef1234567'
),

-- Data Science Content Pack
(
  '550e8400-e29b-41d4-a716-446655440003',
  'Data Science & Machine Learning',
  '1.0.0',
  'Data science interview questions covering statistics, machine learning, data analysis, and model evaluation.',
  '1.0.0',
  '{
    "version": "1.0.0",
    "name": "Data Science & Machine Learning",
    "description": "Comprehensive data science interview questions",
    "content": {
      "evaluations": [
        {
          "id": "eval-ds-001",
          "title": "Statistics & Probability",
          "description": "Test fundamental statistical knowledge",
          "difficulty": "intermediate",
          "estimated_duration": 30,
          "criteria": [
            {
              "id": "crit-stats-001",
              "name": "Statistical Concepts",
              "weight": 0.4,
              "description": "Understanding of core statistical concepts"
            },
            {
              "id": "crit-stats-002",
              "name": "Problem Solving",
              "weight": 0.3,
              "description": "Applying statistics to real-world problems"
            },
            {
              "id": "crit-stats-003",
              "name": "Interpretation",
              "weight": 0.3,
              "description": "Interpreting statistical results"
            }
          ],
          "questions": [
            {
              "id": "q-ds-001",
              "text": "Explain the difference between Type I and Type II errors. How would you minimize each in a hypothesis test?",
              "type": "conceptual",
              "difficulty": "medium",
              "expected_time": 10,
              "hints": ["Think about false positives vs false negatives", "Consider the trade-off between them"]
            },
            {
              "id": "q-ds-002",
              "text": "A coin is flipped 10 times and lands on heads 8 times. Is this evidence that the coin is biased? How would you test this?",
              "type": "problem_solving",
              "difficulty": "medium",
              "expected_time": 15,
              "hints": ["Use hypothesis testing", "Consider the null hypothesis", "Calculate p-value"]
            }
          ]
        },
        {
          "id": "eval-ds-002",
          "title": "Machine Learning",
          "description": "Machine learning algorithms and model evaluation",
          "difficulty": "advanced",
          "estimated_duration": 45,
          "criteria": [
            {
              "id": "crit-ml-001",
              "name": "Algorithm Knowledge",
              "weight": 0.3,
              "description": "Understanding of ML algorithms"
            },
            {
              "id": "crit-ml-002",
              "name": "Model Evaluation",
              "weight": 0.4,
              "description": "Evaluating and comparing models"
            },
            {
              "id": "crit-ml-003",
              "name": "Practical Application",
              "weight": 0.3,
              "description": "Applying ML to real problems"
            }
          ],
          "questions": [
            {
              "id": "q-ml-001",
              "text": "Compare and contrast random forests and gradient boosting. When would you use each?",
              "type": "conceptual",
              "difficulty": "hard",
              "expected_time": 20,
              "hints": ["Consider bias-variance trade-off", "Think about interpretability", "Consider training time"]
            },
            {
              "id": "q-ml-002",
              "text": "How would you handle overfitting in a deep learning model? Provide multiple strategies.",
              "type": "problem_solving",
              "difficulty": "hard",
              "expected_time": 25,
              "hints": ["Consider regularization techniques", "Think about data augmentation", "Consider early stopping"]
            }
          ]
        }
      ],
      "categories": [
        {
          "id": "cat-ds-001",
          "name": "Statistics",
          "description": "Statistical concepts and probability"
        },
        {
          "id": "cat-ds-002",
          "name": "Machine Learning",
          "description": "ML algorithms and model evaluation"
        },
        {
          "id": "cat-ds-003",
          "name": "Data Analysis",
          "description": "Data exploration and analysis techniques"
        },
        {
          "id": "cat-ds-004",
          "name": "Data Engineering",
          "description": "Data pipelines and infrastructure"
        }
      ]
    },
    "metadata": {
      "author": "Interview Drills Team",
      "tags": ["data-science", "machine-learning", "statistics"],
      "target_roles": ["data-scientist", "ml-engineer", "data-analyst"],
      "compatibility": {
        "minVersion": "1.0.0"
      }
    }
  }',
  '{
    "author": "Interview Drills Team",
    "tags": ["data-science", "machine-learning", "statistics"],
    "target_roles": ["data-scientist", "ml-engineer", "data-analyst"],
    "difficulty_levels": ["intermediate", "advanced"],
    "estimated_completion_time": "2-2.5 hours"
  }',
  'valid',
  false,
  null,
  14080,
  'c3d4e5f6789012345678901234567890abcdef1234567890abcdef12345678'
);

-- ==============================================
-- EVALUATION CATEGORIES SEED DATA
-- ==============================================

-- Insert comprehensive evaluation categories
INSERT INTO public.evaluation_categories (name, description, weight) VALUES
('Technical Accuracy', 'Correctness of technical knowledge and implementation', 1.0),
('Problem Solving', 'Logical approach and problem breakdown methodology', 1.0),
('Communication', 'Clarity and effectiveness of communication', 0.9),
('Code Quality', 'Clean, readable, and maintainable code', 0.8),
('System Design', 'Architecture and scalability considerations', 0.9),
('Time Management', 'Efficiency in time usage during evaluation', 0.6),
('Creativity', 'Innovative solutions and thinking outside the box', 0.7),
('Business Acumen', 'Understanding of business context and impact', 0.8),
('User Focus', 'Consideration of user needs and experience', 0.7),
('Data Analysis', 'Ability to analyze and interpret data', 0.8),
('Leadership', 'Leadership qualities and team collaboration', 0.6),
('Adaptability', 'Ability to adapt to changing requirements', 0.7)
ON CONFLICT (name) DO NOTHING;
-- Note: Re-added ON CONFLICT for idempotency

-- ==============================================
-- SAMPLE USERS SEED DATA
-- ==============================================

-- Note: These are sample user records that would typically be created through Supabase Auth
-- In a real scenario, users would be created through the authentication system
-- These are provided for development/testing purposes

-- First, create users in auth.users (required for foreign key constraint)
-- Use DO block with exception handling for idempotency
DO $$
BEGIN
  INSERT INTO auth.users (
    id,
    instance_id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    recovery_sent_at,
    last_sign_in_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    confirmation_token,
    email_change,
    email_change_token_new,
    recovery_token
  ) VALUES
  (
    '11111111-1111-1111-1111-111111111111',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'john.doe@example.com',
    '$2a$10$placeholder.hash.for.development.only',
    NOW(),
    NULL,
    NOW() - INTERVAL '5 days',
    '{"provider": "email", "providers": ["email"]}',
    '{"full_name": "John Doe"}',
    NOW() - INTERVAL '30 days',
    NOW() - INTERVAL '5 days',
    '',
    '',
    '',
    ''
  ),
  (
    '22222222-2222-2222-2222-222222222222',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'jane.smith@example.com',
    '$2a$10$placeholder.hash.for.development.only',
    NOW(),
    NULL,
    NOW() - INTERVAL '2 days',
    '{"provider": "email", "providers": ["email"]}',
    '{"full_name": "Jane Smith"}',
    NOW() - INTERVAL '15 days',
    NOW() - INTERVAL '2 days',
    '',
    '',
    '',
    ''
  ),
  (
    '33333333-3333-3333-3333-333333333333',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'mike.johnson@example.com',
    '$2a$10$placeholder.hash.for.development.only',
    NOW(),
    NULL,
    NOW() - INTERVAL '1 day',
    '{"provider": "email", "providers": ["email"]}',
    '{"full_name": "Mike Johnson"}',
    NOW() - INTERVAL '7 days',
    NOW() - INTERVAL '1 day',
    '',
    '',
    '',
    ''
  ),
  (
    '44444444-4444-4444-4444-444444444444',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'sarah.wilson@example.com',
    '$2a$10$placeholder.hash.for.development.only',
    NOW(),
    NULL,
    NOW() - INTERVAL '3 days',
    '{"provider": "email", "providers": ["email"]}',
    '{"full_name": "Sarah Wilson"}',
    NOW() - INTERVAL '45 days',
    NOW() - INTERVAL '3 days',
    '',
    '',
    '',
    ''
  ),
  (
    '55555555-5555-5555-5555-555555555555',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'alex.brown@example.com',
    '$2a$10$placeholder.hash.for.development.only',
    NOW(),
    NULL,
    NOW() - INTERVAL '1 day',
    '{"provider": "email", "providers": ["email"]}',
    '{"full_name": "Alex Brown"}',
    NOW() - INTERVAL '10 days',
    NOW() - INTERVAL '1 day',
    '',
    '',
    '',
    ''
  );
EXCEPTION
  WHEN unique_violation THEN
    -- Users already exist, skip insert
    RAISE NOTICE 'Sample auth users already exist, skipping insert';
END $$;

-- Now insert corresponding records in public.users
INSERT INTO public.users (
  id,
  email,
  full_name,
  avatar_url,
  entitlement_level,
  created_at,
  updated_at
) VALUES
(
  '11111111-1111-1111-1111-111111111111',
  'john.doe@example.com',
  'John Doe',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=John',
  'PRO',
  NOW() - INTERVAL '30 days',
  NOW() - INTERVAL '5 days'
),
(
  '22222222-2222-2222-2222-222222222222',
  'jane.smith@example.com',
  'Jane Smith',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Jane',
  'TRIAL',
  NOW() - INTERVAL '15 days',
  NOW() - INTERVAL '2 days'
),
(
  '33333333-3333-3333-3333-333333333333',
  'mike.johnson@example.com',
  'Mike Johnson',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Mike',
  'FREE',
  NOW() - INTERVAL '7 days',
  NOW() - INTERVAL '1 day'
),
(
  '44444444-4444-4444-4444-444444444444',
  'sarah.wilson@example.com',
  'Sarah Wilson',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah',
  'PRO',
  NOW() - INTERVAL '45 days',
  NOW() - INTERVAL '3 days'
),
(
  '55555555-5555-5555-5555-555555555555',
  'alex.brown@example.com',
  'Alex Brown',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Alex',
  'TRIAL',
  NOW() - INTERVAL '10 days',
  NOW() - INTERVAL '1 day'
) ON CONFLICT (id) DO NOTHING;
-- Note: Re-added ON CONFLICT for idempotency

-- ==============================================
-- USER ENTITLEMENTS SEED DATA
-- ==============================================

-- Insert user entitlements for sample users
INSERT INTO public.user_entitlements (
  user_id,
  entitlement_level,
  expires_at,
  created_at,
  updated_at
) VALUES
(
  '11111111-1111-1111-1111-111111111111',
  'PRO',
  NOW() + INTERVAL '1 year',
  NOW() - INTERVAL '30 days',
  NOW() - INTERVAL '5 days'
),
(
  '22222222-2222-2222-2222-222222222222',
  'TRIAL',
  NOW() + INTERVAL '14 days',
  NOW() - INTERVAL '15 days',
  NOW() - INTERVAL '2 days'
),
(
  '33333333-3333-3333-3333-333333333333',
  'FREE',
  NOW() + INTERVAL '1 year',
  NOW() - INTERVAL '7 days',
  NOW() - INTERVAL '1 day'
),
(
  '44444444-4444-4444-4444-444444444444',
  'PRO',
  NOW() + INTERVAL '1 year',
  NOW() - INTERVAL '45 days',
  NOW() - INTERVAL '3 days'
),
(
  '55555555-5555-5555-5555-555555555555',
  'TRIAL',
  NOW() + INTERVAL '14 days',
  NOW() - INTERVAL '10 days',
  NOW() - INTERVAL '1 day'
) ON CONFLICT (user_id) DO NOTHING;
-- Note: Re-added ON CONFLICT for idempotency

-- ==============================================
-- SAMPLE EVALUATION RESULTS SEED DATA
-- ==============================================

-- Insert sample evaluation results
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
-- John Doe's Software Engineering evaluation
(
  '11111111-1111-1111-1111-111111111111',
  '550e8400-e29b-41d4-a716-446655440001',
  'For the longest common subsequence problem, I would use dynamic programming. The key insight is that if two characters match, we take the diagonal value plus 1. If they don''t match, we take the maximum of the left or top value. The time complexity is O(m*n) where m and n are the lengths of the two strings. For the getRandom data structure, I would use a combination of a hash map and an array. The hash map stores the value to index mapping, and the array stores the actual values. When deleting, I swap the element to delete with the last element and update the hash map accordingly.',
  'text',
  1800,
  156,
  5.2,
  '{"Technical Accuracy": 85, "Problem Solving": 90, "Communication": 80, "Code Quality": 85}',
  'Excellent problem-solving approach. You demonstrated strong understanding of dynamic programming and provided a clear explanation of the data structure design. Consider mentioning space complexity as well.',
  87.5,
  'COMPLETED',
  NOW() - INTERVAL '5 days',
  NOW() - INTERVAL '5 days'
),

-- Jane Smith's Product Management evaluation
(
  '22222222-2222-2222-2222-222222222222',
  '550e8400-e29b-41d4-a716-446655440002',
  'For prioritizing features in a fitness tracking app, I would use a framework that considers user impact, business value, and technical feasibility. First, I''d conduct user research to understand pain points. High-impact features might include: 1) Basic activity tracking (walking, running), 2) Goal setting and progress visualization, 3) Social features for motivation. I''d prioritize based on user needs, market research, and our business objectives. For the e-commerce roadmap, I''d focus on: Q1 - Mobile optimization and checkout improvements, Q2 - Personalization features, Q3 - Advanced analytics, Q4 - International expansion. Each decision would be data-driven using A/B testing and user feedback.',
  'text',
  2400,
  198,
  4.95,
  '{"Strategic Thinking": 88, "Market Understanding": 85, "Vision Communication": 90, "Business Acumen": 87}',
  'Strong strategic thinking and clear communication of priorities. Good use of frameworks and consideration of multiple factors. Consider adding more specific metrics for success measurement.',
  87.5,
  'COMPLETED',
  NOW() - INTERVAL '3 days',
  NOW() - INTERVAL '3 days'
),

-- Mike Johnson's Data Science evaluation
(
  '33333333-3333-3333-3333-333333333333',
  '550e8400-e29b-41d4-a716-446655440003',
  'Type I error is rejecting a true null hypothesis (false positive), while Type II error is failing to reject a false null hypothesis (false negative). To minimize Type I errors, I would use a lower significance level (α). To minimize Type II errors, I would increase the sample size or use a higher significance level. For the coin bias test, I would use a binomial test with H0: p=0.5 (fair coin) vs H1: p≠0.5 (biased coin). With 8 heads out of 10 flips, the p-value would be approximately 0.11, which is greater than α=0.05, so we cannot reject the null hypothesis. However, this is close to significance and warrants further testing with a larger sample.',
  'text',
  1200,
  134,
  6.7,
  '{"Statistical Concepts": 92, "Problem Solving": 88, "Interpretation": 85, "Communication": 90}',
  'Excellent understanding of statistical concepts and clear explanation of the hypothesis testing process. Good interpretation of results and practical recommendations.',
  88.75,
  'COMPLETED',
  NOW() - INTERVAL '2 days',
  NOW() - INTERVAL '2 days'
),

-- Sarah Wilson's Software Engineering evaluation
(
  '44444444-4444-4444-4444-444444444444',
  '550e8400-e29b-41d4-a716-446655440001',
  'For the URL shortener design, I would implement: 1) A distributed system with multiple servers behind a load balancer, 2) Database sharding by hash of the original URL, 3) Redis cache for frequently accessed URLs, 4) Base62 encoding for short URLs (6-7 characters), 5) Rate limiting to prevent abuse. For 100M URLs/day, I''d need approximately 1,200 URLs/second. I would use consistent hashing for database sharding and implement read replicas for better performance. The system would be designed for 99.9% availability with proper monitoring and alerting.',
  'text',
  2700,
  189,
  4.2,
  '{"System Design": 92, "Scalability": 90, "Reliability": 88, "Communication": 85}',
  'Comprehensive system design with good consideration of scalability and reliability. Excellent understanding of distributed systems concepts. Consider adding more details about data consistency and backup strategies.',
  88.75,
  'COMPLETED',
  NOW() - INTERVAL '1 day',
  NOW() - INTERVAL '1 day'
),

-- Alex Brown's Product Management evaluation
(
  '55555555-5555-5555-5555-555555555555',
  '550e8400-e29b-41d4-a716-446655440002',
  'For social media engagement metrics, I would track: 1) Daily/Monthly Active Users (DAU/MAU), 2) Time spent in app, 3) Posts created per user, 4) Likes, comments, shares per post, 5) User retention rates (1-day, 7-day, 30-day), 6) Session frequency and duration. Success would be defined as increasing user engagement while maintaining or improving retention. For the 20% retention drop, I would: 1) Segment users by demographics, behavior, and acquisition channel, 2) Analyze the timing of the drop, 3) Check for external factors (competitor launches, app store changes), 4) Review recent product changes, 5) Conduct user surveys and interviews. Based on findings, I would implement targeted interventions and A/B test solutions.',
  'text',
  2100,
  178,
  5.1,
  '{"Metric Selection": 90, "Data Analysis": 85, "Actionable Insights": 88, "Problem Solving": 87}',
  'Strong analytical approach with comprehensive metric selection. Good problem-solving methodology for investigating the retention drop. Consider adding more specific action items and success metrics.',
  87.5,
  'COMPLETED',
  NOW() - INTERVAL '1 day',
  NOW() - INTERVAL '1 day'
);

-- ==============================================
-- USER PROGRESS SEED DATA
-- ==============================================

-- Insert user progress data
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
(
  '11111111-1111-1111-1111-111111111111',
  '550e8400-e29b-41d4-a716-446655440001',
  5,
  3,
  87.5,
  90,
  85,
  5400,
  NOW() - INTERVAL '5 days',
  NOW() - INTERVAL '30 days',
  NOW() - INTERVAL '5 days'
),
(
  '22222222-2222-2222-2222-222222222222',
  '550e8400-e29b-41d4-a716-446655440002',
  4,
  2,
  87.5,
  90,
  85,
  4500,
  NOW() - INTERVAL '3 days',
  NOW() - INTERVAL '15 days',
  NOW() - INTERVAL '3 days'
),
(
  '33333333-3333-3333-3333-333333333333',
  '550e8400-e29b-41d4-a716-446655440003',
  3,
  1,
  88.75,
  88.75,
  88.75,
  1200,
  NOW() - INTERVAL '2 days',
  NOW() - INTERVAL '7 days',
  NOW() - INTERVAL '2 days'
),
(
  '44444444-4444-4444-4444-444444444444',
  '550e8400-e29b-41d4-a716-446655440001',
  5,
  4,
  88.75,
  90,
  87,
  8100,
  NOW() - INTERVAL '1 day',
  NOW() - INTERVAL '45 days',
  NOW() - INTERVAL '1 day'
),
(
  '55555555-5555-5555-5555-555555555555',
  '550e8400-e29b-41d4-a716-446655440002',
  4,
  2,
  87.5,
  88,
  87,
  4200,
  NOW() - INTERVAL '1 day',
  NOW() - INTERVAL '10 days',
  NOW() - INTERVAL '1 day'
) ON CONFLICT (user_id, content_pack_id) DO NOTHING;
-- Note: Re-added ON CONFLICT for idempotency

-- ==============================================
-- EVALUATION ANALYTICS SEED DATA
-- ==============================================

-- Insert evaluation analytics data
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
(
  '11111111-1111-1111-1111-111111111111',
  CURRENT_DATE - INTERVAL '5 days',
  1,
  87.5,
  1800,
  '{"Technical Accuracy": 85, "Problem Solving": 90, "Communication": 80, "Code Quality": 85}',
  '{"trend": "improving", "score_change": 5.2}',
  NOW() - INTERVAL '5 days',
  NOW() - INTERVAL '5 days'
),
(
  '22222222-2222-2222-2222-222222222222',
  CURRENT_DATE - INTERVAL '3 days',
  1,
  87.5,
  2400,
  '{"Strategic Thinking": 88, "Market Understanding": 85, "Vision Communication": 90, "Business Acumen": 87}',
  '{"trend": "stable", "score_change": 0}',
  NOW() - INTERVAL '3 days',
  NOW() - INTERVAL '3 days'
),
(
  '33333333-3333-3333-3333-333333333333',
  CURRENT_DATE - INTERVAL '2 days',
  1,
  88.75,
  1200,
  '{"Statistical Concepts": 92, "Problem Solving": 88, "Interpretation": 85, "Communication": 90}',
  '{"trend": "improving", "score_change": 3.1}',
  NOW() - INTERVAL '2 days',
  NOW() - INTERVAL '2 days'
),
(
  '44444444-4444-4444-4444-444444444444',
  CURRENT_DATE - INTERVAL '1 day',
  1,
  88.75,
  2700,
  '{"System Design": 92, "Scalability": 90, "Reliability": 88, "Communication": 85}',
  '{"trend": "improving", "score_change": 2.8}',
  NOW() - INTERVAL '1 day',
  NOW() - INTERVAL '1 day'
),
(
  '55555555-5555-5555-5555-555555555555',
  CURRENT_DATE - INTERVAL '1 day',
  1,
  87.5,
  2100,
  '{"Metric Selection": 90, "Data Analysis": 85, "Actionable Insights": 88, "Problem Solving": 87}',
  '{"trend": "stable", "score_change": 0}',
  NOW() - INTERVAL '1 day',
  NOW() - INTERVAL '1 day'
) ON CONFLICT (user_id, date) DO NOTHING;
-- Note: Re-added ON CONFLICT for idempotency

-- ==============================================
-- SYSTEM STATUS SEED DATA
-- ==============================================

-- Insert system status data (using function to handle upserts)
SELECT public.update_system_status('content_pack_status', 'active', '{"message": "Software Engineering Fundamentals content pack is active", "active_pack_id": "550e8400-e29b-41d4-a716-446655440001"}', 'system');
SELECT public.update_system_status('fallback_mode', 'inactive', '{"message": "System is running with active content pack", "fallback_active": false}', 'system');
SELECT public.update_system_status('database_connection', 'connected', '{"message": "Database connection is healthy", "response_time_ms": 12}', 'system');
SELECT public.update_system_status('analytics_service', 'active', '{"message": "Analytics service is operational", "posthog_available": true}', 'system');
SELECT public.update_system_status('system_health', 'operational', '{"message": "System is fully operational", "overall_status": "healthy"}', 'system');
SELECT public.update_system_status('performance_metrics', 'excellent', '{"average_response_time_ms": 45, "error_rate_percent": 0.1, "request_count": 1250}', 'system');

-- ==============================================
-- VALIDATION RESULTS SEED DATA
-- ==============================================

-- Insert validation results for content packs
INSERT INTO public.validation_results (
  content_pack_id,
  is_valid,
  errors,
  warnings,
  validated_at,
  validated_by,
  schema_version,
  validation_time_ms,
  created_at,
  updated_at
) VALUES
(
  '550e8400-e29b-41d4-a716-446655440001',
  true,
  null,
  '{"warnings": ["Consider adding more beginner-level questions", "Some questions could benefit from additional hints"]}',
  NOW() - INTERVAL '1 day',
  'system',
  '1.0.0',
  245,
  NOW() - INTERVAL '1 day',
  NOW() - INTERVAL '1 day'
),
(
  '550e8400-e29b-41d4-a716-446655440002',
  true,
  null,
  '{"warnings": ["Consider adding more case study questions", "Some questions could benefit from sample answers"]}',
  NOW() - INTERVAL '2 days',
  'system',
  '1.0.0',
  198,
  NOW() - INTERVAL '2 days',
  NOW() - INTERVAL '2 days'
),
(
  '550e8400-e29b-41d4-a716-446655440003',
  true,
  null,
  '{"warnings": ["Consider adding more practical coding exercises", "Some statistical concepts could use more examples"]}',
  NOW() - INTERVAL '3 days',
  'system',
  '1.0.0',
  312,
  NOW() - INTERVAL '3 days',
  NOW() - INTERVAL '3 days'
) ON CONFLICT (content_pack_id) DO NOTHING;
-- Note: Re-added ON CONFLICT for idempotency

-- ==============================================
-- UPLOAD QUEUE SEED DATA
-- ==============================================

-- Insert sample upload queue entries
INSERT INTO public.upload_queue (
  user_id,
  file_name,
  file_size,
  status,
  progress,
  started_at,
  completed_at,
  content_pack_id,
  created_at,
  updated_at
) VALUES
(
  '11111111-1111-1111-1111-111111111111',
  'software_engineering_advanced.json',
  20480,
  'completed',
  100,
  NOW() - INTERVAL '2 days',
  NOW() - INTERVAL '2 days',
  '550e8400-e29b-41d4-a716-446655440001',
  NOW() - INTERVAL '2 days',
  NOW() - INTERVAL '2 days'
),
(
  '22222222-2222-2222-2222-222222222222',
  'product_management_intermediate.json',
  15360,
  'completed',
  100,
  NOW() - INTERVAL '3 days',
  NOW() - INTERVAL '3 days',
  '550e8400-e29b-41d4-a716-446655440002',
  NOW() - INTERVAL '3 days',
  NOW() - INTERVAL '3 days'
),
(
  '33333333-3333-3333-3333-333333333333',
  'data_science_fundamentals.json',
  17920,
  'completed',
  100,
  NOW() - INTERVAL '4 days',
  NOW() - INTERVAL '4 days',
  '550e8400-e29b-41d4-a716-446655440003',
  NOW() - INTERVAL '4 days',
  NOW() - INTERVAL '4 days'
),
(
  '44444444-4444-4444-4444-444444444444',
  'system_design_advanced.json',
  25600,
  'failed',
  75,
  NOW() - INTERVAL '1 day',
  NOW() - INTERVAL '1 day',
  null,
  NOW() - INTERVAL '1 day',
  NOW() - INTERVAL '1 day'
);

-- Update the failed upload with error message
UPDATE public.upload_queue
SET error_message = 'Schema validation failed: Missing required field "difficulty" in evaluation eval-sys-003'
WHERE file_name = 'system_design_advanced.json';

-- ==============================================
-- FINAL COMMENTS
-- ==============================================

-- This seed file provides comprehensive sample data for the Interview Drills application
-- It includes:
-- 1. Three content packs (Software Engineering, Product Management, Data Science)
-- 2. Evaluation categories for scoring
-- 3. Sample users with different entitlement levels
-- 4. Sample evaluation results with realistic responses
-- 5. User progress tracking data
-- 6. Evaluation analytics
-- 7. System status information
-- 8. Validation results
-- 9. Upload queue entries

-- The data is designed to be realistic and useful for development and testing
-- All timestamps are relative to the current time for dynamic testing
