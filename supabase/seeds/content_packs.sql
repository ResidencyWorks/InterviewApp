-- Content Packs Seed Data
-- This file contains additional content packs for specific domains

-- ==============================================
-- ADDITIONAL CONTENT PACKS
-- ==============================================

-- UX/UI Design Content Pack
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
(
  '550e8400-e29b-41d4-a716-446655440004',
  'UX/UI Design Fundamentals',
  '1.0.0',
  'User experience and interface design interview questions covering user research, design systems, and usability testing.',
  '1.0.0',
  '{
    "version": "1.0.0",
    "name": "UX/UI Design Fundamentals",
    "description": "Comprehensive UX/UI design interview questions",
    "content": {
      "evaluations": [
        {
          "id": "eval-ux-001",
          "title": "User Research & Testing",
          "description": "Test knowledge of user research methods and usability testing",
          "difficulty": "intermediate",
          "estimated_duration": 35,
          "criteria": [
            {
              "id": "crit-ux-001",
              "name": "Research Methods",
              "weight": 0.4,
              "description": "Understanding of user research methodologies"
            },
            {
              "id": "crit-ux-002",
              "name": "User Empathy",
              "weight": 0.3,
              "description": "Ability to understand and advocate for users"
            },
            {
              "id": "crit-ux-003",
              "name": "Testing Design",
              "weight": 0.3,
              "description": "Designing effective usability tests"
            }
          ],
          "questions": [
            {
              "id": "q-ux-001",
              "text": "How would you conduct user research for a new mobile banking app? What methods would you use and why?",
              "type": "user_research",
              "difficulty": "medium",
              "expected_time": 20,
              "hints": ["Consider different research phases", "Think about user segments", "Balance qualitative and quantitative methods"]
            },
            {
              "id": "q-ux-002",
              "text": "Design a usability test for an e-commerce checkout process. What tasks would you include and how would you measure success?",
              "type": "usability_testing",
              "difficulty": "medium",
              "expected_time": 15,
              "hints": ["Focus on critical user journeys", "Define clear success metrics", "Consider different user scenarios"]
            }
          ]
        },
        {
          "id": "eval-ux-002",
          "title": "Design Systems & Visual Design",
          "description": "Test knowledge of design systems and visual design principles",
          "difficulty": "intermediate",
          "estimated_duration": 30,
          "criteria": [
            {
              "id": "crit-visual-001",
              "name": "Design Principles",
              "weight": 0.4,
              "description": "Understanding of visual design principles"
            },
            {
              "id": "crit-visual-002",
              "name": "Design Systems",
              "weight": 0.3,
              "description": "Knowledge of design system creation and maintenance"
            },
            {
              "id": "crit-visual-003",
              "name": "Accessibility",
              "weight": 0.3,
              "description": "Understanding of accessibility principles"
            }
          ],
          "questions": [
            {
              "id": "q-visual-001",
              "text": "How would you create a design system for a SaaS product with multiple applications? What components would you prioritize?",
              "type": "design_systems",
              "difficulty": "hard",
              "expected_time": 25,
              "hints": ["Consider scalability", "Think about component hierarchy", "Plan for documentation and maintenance"]
            },
            {
              "id": "q-visual-002",
              "text": "Explain how you would ensure a mobile app is accessible to users with visual impairments. What specific considerations would you make?",
              "type": "accessibility",
              "difficulty": "medium",
              "expected_time": 15,
              "hints": ["Consider screen readers", "Think about color contrast", "Plan for keyboard navigation"]
            }
          ]
        }
      ],
      "categories": [
        {
          "id": "cat-ux-001",
          "name": "User Research",
          "description": "User research methods and techniques"
        },
        {
          "id": "cat-ux-002",
          "name": "Usability Testing",
          "description": "Designing and conducting usability tests"
        },
        {
          "id": "cat-ux-003",
          "name": "Design Systems",
          "description": "Creating and maintaining design systems"
        },
        {
          "id": "cat-ux-004",
          "name": "Visual Design",
          "description": "Visual design principles and practices"
        }
      ]
    },
    "metadata": {
      "author": "Interview Drills Team",
      "tags": ["ux-design", "ui-design", "user-research"],
      "target_roles": ["ux-designer", "ui-designer", "product-designer"],
      "compatibility": {
        "minVersion": "1.0.0"
      }
    }
  }',
  '{
    "author": "Interview Drills Team",
    "tags": ["ux-design", "ui-design", "user-research"],
    "target_roles": ["ux-designer", "ui-designer", "product-designer"],
    "difficulty_levels": ["intermediate", "advanced"],
    "estimated_completion_time": "1-1.5 hours"
  }',
  'valid',
  false,
  null,
  12288,
  'd4e5f6789012345678901234567890abcdef1234567890abcdef123456789'
),

-- DevOps & Infrastructure Content Pack
(
  '550e8400-e29b-41d4-a716-446655440005',
  'DevOps & Infrastructure',
  '1.0.0',
  'DevOps and infrastructure interview questions covering CI/CD, containerization, monitoring, and cloud platforms.',
  '1.0.0',
  '{
    "version": "1.0.0",
    "name": "DevOps & Infrastructure",
    "description": "Comprehensive DevOps and infrastructure interview questions",
    "content": {
      "evaluations": [
        {
          "id": "eval-devops-001",
          "title": "CI/CD & Automation",
          "description": "Test knowledge of continuous integration and deployment practices",
          "difficulty": "intermediate",
          "estimated_duration": 40,
          "criteria": [
            {
              "id": "crit-cicd-001",
              "name": "Pipeline Design",
              "weight": 0.4,
              "description": "Designing effective CI/CD pipelines"
            },
            {
              "id": "crit-cicd-002",
              "name": "Automation",
              "weight": 0.3,
              "description": "Understanding of automation principles"
            },
            {
              "id": "crit-cicd-003",
              "name": "Best Practices",
              "weight": 0.3,
              "description": "Knowledge of DevOps best practices"
            }
          ],
          "questions": [
            {
              "id": "q-devops-001",
              "text": "Design a CI/CD pipeline for a microservices application. What stages would you include and how would you handle failures?",
              "type": "system_design",
              "difficulty": "hard",
              "expected_time": 30,
              "hints": ["Consider different environments", "Think about testing strategies", "Plan for rollback procedures"]
            },
            {
              "id": "q-devops-002",
              "text": "How would you implement blue-green deployment for a high-traffic web application? What are the benefits and challenges?",
              "type": "deployment_strategy",
              "difficulty": "medium",
              "expected_time": 20,
              "hints": ["Consider infrastructure requirements", "Think about data consistency", "Plan for monitoring and rollback"]
            }
          ]
        },
        {
          "id": "eval-devops-002",
          "title": "Containerization & Orchestration",
          "description": "Test knowledge of Docker, Kubernetes, and container orchestration",
          "difficulty": "advanced",
          "estimated_duration": 45,
          "criteria": [
            {
              "id": "crit-k8s-001",
              "name": "Kubernetes Knowledge",
              "weight": 0.4,
              "description": "Understanding of Kubernetes concepts and components"
            },
            {
              "id": "crit-k8s-002",
              "name": "Containerization",
              "weight": 0.3,
              "description": "Docker and container best practices"
            },
            {
              "id": "crit-k8s-003",
              "name": "Scaling & Performance",
              "weight": 0.3,
              "description": "Scaling applications in containerized environments"
            }
          ],
          "questions": [
            {
              "id": "q-k8s-001",
              "text": "Explain the difference between Deployments, ReplicaSets, and Pods in Kubernetes. When would you use each?",
              "type": "conceptual",
              "difficulty": "medium",
              "expected_time": 15,
              "hints": ["Think about the hierarchy", "Consider use cases for each", "Understand the relationships"]
            },
            {
              "id": "q-k8s-002",
              "text": "How would you design a Kubernetes cluster for a multi-tenant SaaS application? What considerations would you make for security and resource management?",
              "type": "system_design",
              "difficulty": "hard",
              "expected_time": 30,
              "hints": ["Consider namespace isolation", "Think about resource quotas", "Plan for network policies"]
            }
          ]
        }
      ],
      "categories": [
        {
          "id": "cat-devops-001",
          "name": "CI/CD",
          "description": "Continuous integration and deployment"
        },
        {
          "id": "cat-devops-002",
          "name": "Containerization",
          "description": "Docker and container technologies"
        },
        {
          "id": "cat-devops-003",
          "name": "Orchestration",
          "description": "Kubernetes and container orchestration"
        },
        {
          "id": "cat-devops-004",
          "name": "Monitoring",
          "description": "Application and infrastructure monitoring"
        }
      ]
    },
    "metadata": {
      "author": "Interview Drills Team",
      "tags": ["devops", "kubernetes", "docker", "ci-cd"],
      "target_roles": ["devops-engineer", "site-reliability-engineer", "platform-engineer"],
      "compatibility": {
        "minVersion": "1.0.0"
      }
    }
  }',
  '{
    "author": "Interview Drills Team",
    "tags": ["devops", "kubernetes", "docker", "ci-cd"],
    "target_roles": ["devops-engineer", "site-reliability-engineer", "platform-engineer"],
    "difficulty_levels": ["intermediate", "advanced"],
    "estimated_completion_time": "2-2.5 hours"
  }',
  'valid',
  false,
  null,
  13824,
  'e5f6789012345678901234567890abcdef1234567890abcdef1234567890a'
),

-- Marketing & Growth Content Pack
(
  '550e8400-e29b-41d4-a716-446655440006',
  'Marketing & Growth',
  '1.0.0',
  'Marketing and growth interview questions covering digital marketing, growth hacking, analytics, and campaign optimization.',
  '1.0.0',
  '{
    "version": "1.0.0",
    "name": "Marketing & Growth",
    "description": "Comprehensive marketing and growth interview questions",
    "content": {
      "evaluations": [
        {
          "id": "eval-marketing-001",
          "title": "Digital Marketing Strategy",
          "description": "Test knowledge of digital marketing channels and strategies",
          "difficulty": "intermediate",
          "estimated_duration": 35,
          "criteria": [
            {
              "id": "crit-marketing-001",
              "name": "Channel Strategy",
              "weight": 0.4,
              "description": "Understanding of different marketing channels"
            },
            {
              "id": "crit-marketing-002",
              "name": "Campaign Planning",
              "weight": 0.3,
              "description": "Planning and executing marketing campaigns"
            },
            {
              "id": "crit-marketing-003",
              "name": "ROI Analysis",
              "weight": 0.3,
              "description": "Measuring and optimizing marketing ROI"
            }
          ],
          "questions": [
            {
              "id": "q-marketing-001",
              "text": "How would you develop a digital marketing strategy for a B2B SaaS startup with a limited budget? What channels would you prioritize?",
              "type": "strategy",
              "difficulty": "medium",
              "expected_time": 20,
              "hints": ["Consider the sales cycle", "Think about content marketing", "Evaluate cost-effective channels"]
            },
            {
              "id": "q-marketing-002",
              "text": "Design a multi-channel campaign to launch a new mobile app. How would you measure success across different channels?",
              "type": "campaign_design",
              "difficulty": "hard",
              "expected_time": 25,
              "hints": ["Consider the customer journey", "Think about attribution modeling", "Plan for cross-channel optimization"]
            }
          ]
        },
        {
          "id": "eval-marketing-002",
          "title": "Growth Hacking & Analytics",
          "description": "Test knowledge of growth hacking techniques and marketing analytics",
          "difficulty": "advanced",
          "estimated_duration": 40,
          "criteria": [
            {
              "id": "crit-growth-001",
              "name": "Growth Experiments",
              "weight": 0.4,
              "description": "Designing and running growth experiments"
            },
            {
              "id": "crit-growth-002",
              "name": "Analytics",
              "weight": 0.3,
              "description": "Marketing analytics and data interpretation"
            },
            {
              "id": "crit-growth-003",
              "name": "Viral Mechanics",
              "weight": 0.3,
              "description": "Understanding viral growth mechanisms"
            }
          ],
          "questions": [
            {
              "id": "q-growth-001",
              "text": "How would you design a viral growth experiment for a social media app? What metrics would you track and how would you optimize for virality?",
              "type": "growth_experiment",
              "difficulty": "hard",
              "expected_time": 25,
              "hints": ["Consider network effects", "Think about sharing mechanisms", "Plan for measurement and iteration"]
            },
            {
              "id": "q-growth-002",
              "text": "Analyze the following funnel data: 10,000 visitors, 500 signups, 100 trials, 20 paid customers. What insights would you derive and what experiments would you run?",
              "type": "funnel_analysis",
              "difficulty": "medium",
              "expected_time": 15,
              "hints": ["Calculate conversion rates", "Identify bottlenecks", "Consider optimization opportunities"]
            }
          ]
        }
      ],
      "categories": [
        {
          "id": "cat-marketing-001",
          "name": "Digital Marketing",
          "description": "Digital marketing channels and strategies"
        },
        {
          "id": "cat-marketing-002",
          "name": "Growth Hacking",
          "description": "Growth hacking techniques and experiments"
        },
        {
          "id": "cat-marketing-003",
          "name": "Analytics",
          "description": "Marketing analytics and measurement"
        },
        {
          "id": "cat-marketing-004",
          "name": "Campaign Management",
          "description": "Planning and executing marketing campaigns"
        }
      ]
    },
    "metadata": {
      "author": "Interview Drills Team",
      "tags": ["marketing", "growth-hacking", "digital-marketing"],
      "target_roles": ["marketing-manager", "growth-hacker", "digital-marketer"],
      "compatibility": {
        "minVersion": "1.0.0"
      }
    }
  }',
  '{
    "author": "Interview Drills Team",
    "tags": ["marketing", "growth-hacking", "digital-marketing"],
    "target_roles": ["marketing-manager", "growth-hacker", "digital-marketer"],
    "difficulty_levels": ["intermediate", "advanced"],
    "estimated_completion_time": "1.5-2 hours"
  }',
  'valid',
  false,
  null,
  11520,
  'f6789012345678901234567890abcdef1234567890abcdef1234567890ab'
)
-- Note: Removed ON CONFLICT clause to avoid constraint issues
