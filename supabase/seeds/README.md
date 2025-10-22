# Supabase Seed Data

This directory contains comprehensive seed data for the Interview Drills application, providing realistic sample data for development and testing.

## Files Overview

### Main Seed Files

- **`../seed.sql`** - Main seed file with core data including:
  - 3 primary content packs (Software Engineering, Product Management, Data Science)
  - Evaluation categories and scoring criteria
  - Sample users with different entitlement levels
  - Sample evaluation results with realistic responses
  - User progress tracking data
  - System status and validation results

- **`content_packs.sql`** - Additional specialized content packs:
  - UX/UI Design Fundamentals
  - DevOps & Infrastructure
  - Marketing & Growth

- **`sample_evaluations.sql`** - Additional sample evaluation results:
  - More comprehensive evaluation responses
  - Different difficulty levels and completion statuses
  - Additional user progress data
  - Extended analytics data

## Content Packs Included

### 1. Software Engineering Fundamentals
- **Focus**: Algorithms, data structures, system design
- **Difficulty**: Intermediate to Advanced
- **Questions**: 5 comprehensive questions
- **Topics**: Dynamic programming, system architecture, scalability

### 2. Product Management Essentials
- **Focus**: Strategy, metrics, user research
- **Difficulty**: Intermediate to Advanced
- **Questions**: 4 strategic questions
- **Topics**: Feature prioritization, roadmap planning, analytics

### 3. Data Science & Machine Learning
- **Focus**: Statistics, ML algorithms, model evaluation
- **Difficulty**: Intermediate to Advanced
- **Questions**: 4 technical questions
- **Topics**: Hypothesis testing, ensemble methods, overfitting

### 4. UX/UI Design Fundamentals
- **Focus**: User research, design systems, usability testing
- **Difficulty**: Intermediate to Advanced
- **Questions**: 4 design-focused questions
- **Topics**: Research methods, accessibility, design systems

### 5. DevOps & Infrastructure
- **Focus**: CI/CD, containerization, monitoring
- **Difficulty**: Intermediate to Advanced
- **Questions**: 4 infrastructure questions
- **Topics**: Pipeline design, Kubernetes, deployment strategies

### 6. Marketing & Growth
- **Focus**: Digital marketing, growth hacking, analytics
- **Difficulty**: Intermediate to Advanced
- **Questions**: 4 marketing questions
- **Topics**: Channel strategy, campaign design, growth experiments

## Sample Users

The seed data includes 5 sample users with different profiles:

1. **John Doe** (PRO) - Software Engineer with multiple evaluations
2. **Jane Smith** (TRIAL) - Product Manager with UX design experience
3. **Mike Johnson** (FREE) - Data Scientist exploring DevOps
4. **Sarah Wilson** (PRO) - Senior Engineer with marketing interest
5. **Alex Brown** (TRIAL) - Data Analyst with product management goals

## Evaluation Categories

Comprehensive scoring categories include:
- Technical Accuracy
- Problem Solving
- Communication
- Code Quality
- System Design
- Time Management
- Creativity
- Business Acumen
- User Focus
- Data Analysis
- Leadership
- Adaptability

## Usage

To apply the seed data to your Supabase database:

```bash
# Reset and apply all migrations and seeds
supabase db reset

# Or apply seeds to existing database
supabase db seed
```

## Data Characteristics

- **Realistic Responses**: All evaluation responses are written as if by real candidates
- **Varied Difficulty**: Questions range from medium to hard difficulty
- **Comprehensive Scoring**: Multiple evaluation criteria with weighted scores
- **Time-based Data**: Timestamps are relative to current time for dynamic testing
- **Status Variety**: Includes completed, processing, and failed evaluations
- **Progress Tracking**: User progress data shows realistic learning patterns

## Customization

You can modify the seed data by:
1. Editing the SQL files directly
2. Adding new content packs following the JSON schema
3. Creating additional sample users and evaluations
4. Adjusting scoring criteria and weights

## Schema Compliance

All seed data follows the database schema defined in the migration files:
- Proper foreign key relationships
- Correct data types and constraints
- Valid JSON structures for content packs
- Appropriate enum values for status fields

## Testing Scenarios

The seed data supports various testing scenarios:
- User authentication and authorization
- Content pack loading and validation
- Evaluation submission and scoring
- Progress tracking and analytics
- System status monitoring
- Upload queue processing
