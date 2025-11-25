# Data Model: Dev Environment & Tooling

**Feature**: 004-dev-environment-tooling
**Date**: 2025-01-27
**Purpose**: Define configuration entities and their relationships for the development environment

## Core Entities

### DevEnvironment

**Purpose**: Represents the complete development environment configuration

**Attributes**:

- `id: string` - Unique identifier for the environment
- `name: string` - Name of the environment (e.g., "local", "ci", "staging")
- `nodeVersion: string` - Node.js version (e.g., "20.10.0")
- `pnpmVersion: string` - pnpm version (e.g., "8.15.0")
- `tools: DevTool[]` - Array of development tools
- `extensions: VSCodeExtension[]` - Array of VS Code extensions
- `environmentVariables: EnvironmentVariable[]` - Array of environment variables
- `createdAt: Date` - When environment was created
- `lastUpdated: Date` - When environment was last updated

**Validation Rules**:

- `name` must be non-empty string
- `nodeVersion` must be valid semantic version
- `pnpmVersion` must be valid semantic version
- `tools` array must have at least 1 tool
- `extensions` array must have at least 1 extension

### DevTool

**Purpose**: Represents a development tool in the environment

**Attributes**:

- `id: string` - Unique identifier for the tool
- `name: string` - Name of the tool (e.g., "biome", "lefthook", "vitest")
- `version: string` - Version of the tool
- `type: ToolType` - Type of tool (linter, formatter, test, hook, etc.)
- `configuration: Record<string, any>` - Tool-specific configuration
- `isRequired: boolean` - Whether tool is required for development
- `installCommand: string` - Command to install the tool
- `verifyCommand: string` - Command to verify tool is working

**Validation Rules**:

- `name` must be non-empty string
- `version` must be valid semantic version
- `type` must be valid ToolType enum value
- `installCommand` must be non-empty string
- `verifyCommand` must be non-empty string

### VSCodeExtension

**Purpose**: Represents a VS Code extension for the development environment

**Attributes**:

- `id: string` - Unique identifier for the extension
- `publisher: string` - Extension publisher (e.g., "ms-vscode")
- `name: string` - Extension name (e.g., "typescript")
- `version: string` - Extension version
- `isRequired: boolean` - Whether extension is required
- `configuration: Record<string, any>` - Extension-specific settings

**Validation Rules**:

- `publisher` must be non-empty string
- `name` must be non-empty string
- `version` must be valid semantic version
- `isRequired` must be boolean

### EnvironmentVariable

**Purpose**: Represents an environment variable required for development

**Attributes**:

- `key: string` - Environment variable key
- `value?: string` - Default or example value
- `description: string` - Description of the variable
- `isRequired: boolean` - Whether variable is required
- `isSecret: boolean` - Whether variable contains sensitive data
- `category: EnvCategory` - Category of the variable (database, auth, external, etc.)
- `validation: ValidationRule[]` - Validation rules for the variable

**Validation Rules**:

- `key` must be valid environment variable name
- `description` must be non-empty string
- `isRequired` must be boolean
- `isSecret` must be boolean
- `category` must be valid EnvCategory enum value

### GitHook

**Purpose**: Represents a git hook configuration

**Attributes**:

- `id: string` - Unique identifier for the hook
- `name: string` - Name of the hook (e.g., "pre-commit", "pre-push")
- `commands: HookCommand[]` - Array of commands to execute
- `parallel: boolean` - Whether commands can run in parallel
- `timeout: number` - Timeout in seconds
- `enabled: boolean` - Whether hook is enabled
- `description: string` - Description of what the hook does

**Validation Rules**:

- `name` must be valid git hook name
- `commands` array must have at least 1 command
- `timeout` must be positive number
- `enabled` must be boolean
- `description` must be non-empty string

### HookCommand

**Purpose**: Represents a command within a git hook

**Attributes**:

- `id: string` - Unique identifier for the command
- `name: string` - Name of the command
- `command: string` - Command to execute
- `glob: string` - File glob pattern for command
- `failText: string` - Text to show on command failure
- `passText: string` - Text to show on command success
- `timeout: number` - Command timeout in seconds

**Validation Rules**:

- `name` must be non-empty string
- `command` must be non-empty string
- `glob` must be valid glob pattern
- `timeout` must be positive number

### TestConfiguration

**Purpose**: Represents test configuration for the project

**Attributes**:

- `id: string` - Unique identifier for the configuration
- `type: TestType` - Type of test (unit, integration, e2e)
- `framework: string` - Test framework (e.g., "vitest", "playwright")
- `config: Record<string, any>` - Framework-specific configuration
- `coverage: CoverageConfig` - Coverage configuration
- `timeout: number` - Test timeout in seconds
- `parallel: boolean` - Whether tests can run in parallel

**Validation Rules**:

- `type` must be valid TestType enum value
- `framework` must be non-empty string
- `timeout` must be positive number
- `parallel` must be boolean

### CoverageConfig

**Purpose**: Represents test coverage configuration

**Attributes**:

- `enabled: boolean` - Whether coverage is enabled
- `threshold: number` - Coverage threshold percentage
- `reporter: string[]` - Coverage reporters
- `include: string[]` - Files to include in coverage
- `exclude: string[]` - Files to exclude from coverage

**Validation Rules**:

- `enabled` must be boolean
- `threshold` must be between 0 and 100
- `reporter` array must have at least 1 reporter
- `include` array must have at least 1 pattern

## Enums

### ToolType

- `LINTER` - Code linting tool
- `FORMATTER` - Code formatting tool
- `TEST` - Testing framework
- `HOOK` - Git hook tool
- `BUILD` - Build tool
- `PACKAGE_MANAGER` - Package management tool

### EnvCategory

- `DATABASE` - Database-related variables
- `AUTH` - Authentication-related variables
- `EXTERNAL` - External service variables
- `BUILD` - Build-related variables
- `TEST` - Test-related variables
- `DEPLOYMENT` - Deployment-related variables

### TestType

- `UNIT` - Unit tests
- `INTEGRATION` - Integration tests
- `E2E` - End-to-end tests
- `CONTRACT` - Contract tests

## Relationships

### DevEnvironment → DevTool (1:Many)

- Each environment can have multiple tools
- Tools are scoped to their environment
- Tools can be shared across environments

### DevEnvironment → VSCodeExtension (1:Many)

- Each environment can have multiple extensions
- Extensions are scoped to their environment
- Extensions can be shared across environments

### DevEnvironment → EnvironmentVariable (1:Many)

- Each environment can have multiple environment variables
- Variables are scoped to their environment
- Variables can be shared across environments

### DevEnvironment → GitHook (1:Many)

- Each environment can have multiple git hooks
- Hooks are scoped to their environment
- Hooks are typically shared across environments

### DevEnvironment → TestConfiguration (1:Many)

- Each environment can have multiple test configurations
- Configurations are scoped to their environment
- Configurations can be shared across environments

## Configuration Schemas

### DevEnvironment Schema

```typescript
const DevEnvironmentSchema = z.object({
  id: z.uuid(),
  name: z.string().min(1),
  nodeVersion: z.string().regex(/^\d+\.\d+\.\d+$/),
  pnpmVersion: z.string().regex(/^\d+\.\d+\.\d+$/),
  tools: z.array(DevToolSchema).min(1),
  extensions: z.array(VSCodeExtensionSchema).min(1),
  environmentVariables: z.array(EnvironmentVariableSchema),
  createdAt: z.date(),
  lastUpdated: z.date()
});
```

### DevTool Schema

```typescript
const DevToolSchema = z.object({
  id: z.uuid(),
  name: z.string().min(1),
  version: z.string().regex(/^\d+\.\d+\.\d+$/),
  type: z.enum(['LINTER', 'FORMATTER', 'TEST', 'HOOK', 'BUILD', 'PACKAGE_MANAGER']),
  configuration: z.record(z.any()),
  isRequired: z.boolean(),
  installCommand: z.string().min(1),
  verifyCommand: z.string().min(1)
});
```

### EnvironmentVariable Schema

```typescript
const EnvironmentVariableSchema = z.object({
  key: z.string().regex(/^[A-Z_][A-Z0-9_]*$/),
  value: z.string().optional(),
  description: z.string().min(1),
  isRequired: z.boolean(),
  isSecret: z.boolean(),
  category: z.enum(['DATABASE', 'AUTH', 'EXTERNAL', 'BUILD', 'TEST', 'DEPLOYMENT']),
  validation: z.array(ValidationRuleSchema)
});
```

## Data Flow

1. **Environment Setup**: Developer clones repository and runs setup script
2. **Tool Installation**: Script installs all required tools and extensions
3. **Configuration**: Tools are configured with project-specific settings
4. **Validation**: Environment is validated to ensure all tools work correctly
5. **Documentation**: Setup process is documented for future reference

## Error Handling

### Setup Errors

- Missing required tools
- Version conflicts
- Permission issues
- Network connectivity problems

### Configuration Errors

- Invalid configuration files
- Missing environment variables
- Tool-specific configuration errors
- Extension compatibility issues

### Validation Errors

- Tool verification failures
- Test execution failures
- Hook execution failures
- Coverage threshold violations

## Performance Considerations

- **Parallel Installation**: Tools and extensions are installed in parallel when possible
- **Caching**: Package manager caches are used to speed up installations
- **Lazy Loading**: Extensions are loaded only when needed
- **Incremental Setup**: Only missing tools are installed on subsequent runs
- **Validation Caching**: Tool verification results are cached to avoid repeated checks
