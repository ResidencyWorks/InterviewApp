# Data Model: Project Structure Review

**Feature**: 008-project-structure-review
**Date**: 2025-01-27
**Purpose**: Define data structures for project structure analysis

## Core Entities

### ProjectStructure
Represents the overall organization of directories, files, and their relationships.

**Fields**:
- `id`: string - Unique identifier for the structure analysis
- `directories`: Directory[] - List of analyzed directories
- `totalFiles`: number - Total number of files analyzed
- `totalDirectories`: number - Total number of directories analyzed
- `analysisTimestamp`: Date - When the analysis was performed
- `duplications`: ServiceDuplication[] - List of identified duplications
- `inconsistencies`: StructuralInconsistency[] - List of structural issues
- `recommendations`: CleanupRecommendation[] - List of improvement recommendations

**Validation Rules**:
- `id` must be a valid UUID
- `totalFiles` and `totalDirectories` must be positive integers
- `analysisTimestamp` must be a valid date
- All arrays must contain valid entity instances

### Directory
Represents a single directory in the project structure.

**Fields**:
- `path`: string - Full path to the directory
- `name`: string - Directory name
- `files`: File[] - List of files in this directory
- `subdirectories`: Directory[] - Nested directories
- `purpose`: string - Intended purpose of the directory
- `patterns`: string[] - Architectural patterns used in this directory

**Validation Rules**:
- `path` must be a valid file system path
- `name` must be non-empty string
- `purpose` must be one of: "components", "services", "utilities", "types", "config", "assets", "tests"
- `patterns` must contain valid architectural pattern names

### File
Represents a single file in the project.

**Fields**:
- `path`: string - Full path to the file
- `name`: string - File name
- `extension`: string - File extension
- `size`: number - File size in bytes
- `lastModified`: Date - Last modification date
- `purpose`: string - Intended purpose of the file
- `dependencies`: string[] - Import/require dependencies
- `exports`: string[] - Exported functions/classes/interfaces

**Validation Rules**:
- `path` must be a valid file system path
- `name` must be non-empty string
- `extension` must be a valid file extension
- `size` must be non-negative integer
- `lastModified` must be a valid date
- `purpose` must be one of: "service", "component", "utility", "type", "config", "test", "migration"

### ServiceDuplication
Represents instances where similar functionality is implemented multiple times.

**Fields**:
- `id`: string - Unique identifier for the duplication
- `serviceName`: string - Name of the duplicated service
- `locations`: string[] - File paths where the service is implemented
- `duplicationType`: string - Type of duplication (interface, implementation, logic)
- `overlapPercentage`: number - Percentage of overlapping functionality (0-100)
- `severity`: string - Severity level (low, medium, high, critical)
- `consolidationEffort`: string - Estimated effort to consolidate (low, medium, high)
- `consolidationImpact`: string - Impact of consolidation (low, medium, high)

**Validation Rules**:
- `id` must be a valid UUID
- `serviceName` must be non-empty string
- `locations` must contain valid file paths
- `duplicationType` must be one of: "interface", "implementation", "logic", "utility"
- `overlapPercentage` must be between 0 and 100
- `severity` must be one of: "low", "medium", "high", "critical"
- `consolidationEffort` and `consolidationImpact` must be one of: "low", "medium", "high"

### StructuralInconsistency
Represents inconsistencies in architectural patterns across the codebase.

**Fields**:
- `id`: string - Unique identifier for the inconsistency
- `type`: string - Type of inconsistency
- `description`: string - Description of the inconsistency
- `locations`: string[] - File paths where inconsistency occurs
- `expectedPattern`: string - Expected architectural pattern
- `actualPattern`: string - Actual pattern being used
- `impact`: string - Impact on maintainability (low, medium, high)
- `fixEffort`: string - Effort required to fix (low, medium, high)

**Validation Rules**:
- `id` must be a valid UUID
- `type` must be one of: "naming", "architecture", "interface", "error-handling", "dependency"
- `description` must be non-empty string
- `locations` must contain valid file paths
- `expectedPattern` and `actualPattern` must be non-empty strings
- `impact` and `fixEffort` must be one of: "low", "medium", "high"

### CleanupRecommendation
Represents specific actions to improve project structure.

**Fields**:
- `id`: string - Unique identifier for the recommendation
- `title`: string - Short title of the recommendation
- `description`: string - Detailed description of the recommendation
- `type`: string - Type of recommendation
- `priority`: string - Priority level (low, medium, high, critical)
- `effort`: string - Implementation effort (low, medium, high)
- `impact`: string - Expected impact (low, medium, high)
- `files`: string[] - Files to be modified
- `steps`: string[] - Implementation steps
- `risks`: string[] - Potential risks and mitigation strategies

**Validation Rules**:
- `id` must be a valid UUID
- `title` and `description` must be non-empty strings
- `type` must be one of: "consolidation", "refactoring", "cleanup", "restructure", "optimization"
- `priority` must be one of: "low", "medium", "high", "critical"
- `effort` and `impact` must be one of: "low", "medium", "high"
- `files` must contain valid file paths
- `steps` and `risks` must be non-empty string arrays

## State Transitions

### Analysis States
- `pending` → `analyzing` → `completed` → `recommendations_generated`

### Recommendation States
- `draft` → `reviewed` → `approved` → `implemented` → `verified`

## Relationships

- `ProjectStructure` has many `Directory`
- `Directory` has many `File` and `Directory` (self-referential)
- `ProjectStructure` has many `ServiceDuplication`
- `ProjectStructure` has many `StructuralInconsistency`
- `ProjectStructure` has many `CleanupRecommendation`
- `ServiceDuplication` references multiple `File` instances
- `StructuralInconsistency` references multiple `File` instances
- `CleanupRecommendation` references multiple `File` instances
