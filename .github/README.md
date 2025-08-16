# CI/CD Setup

This project uses GitHub Actions for continuous integration to ensure code quality and build stability.

## Workflows

### 1. Main CI Pipeline (`.github/workflows/ci.yml`)
Runs on every push to `main`, `develop`, `initialize` branches and on pull requests.

**Checks performed:**
- ✅ Dependency installation with frozen lockfile
- ✅ ESLint code linting 
- ✅ TypeScript type checking
- ✅ Next.js production build
- ✅ Build artifact validation

### 2. Pre-commit Checks (`.github/workflows/pre-commit.yml`)
Fast checks that can be triggered manually or called by other workflows.

**Checks performed:**
- ✅ Code formatting validation
- ✅ Linting
- ✅ Type checking
- ✅ Production build

## Local Development Scripts

### Pre-commit Workflow
Run before committing to ensure your code passes CI:
```bash
bun run pre-commit
```
This will:
1. Auto-format your code
2. Fix linting issues where possible
3. Run type checking

### CI Simulation
Run the full CI pipeline locally:
```bash
bun run ci
```

### Quick Checks
For faster feedback during development:
```bash
bun run ci:quick
```

## Environment Variables for CI

The CI pipeline uses minimal environment variables for testing:
- `DATABASE_URL`: Mock database connection
- `NEXTAUTH_SECRET`: Test authentication secret
- `NEXTAUTH_URL`: Test URL

## Best Practices

1. **Run `bun run pre-commit` before pushing** to catch issues early
2. **Fix all TypeScript errors** - builds will fail with type errors
3. **Follow linting rules** - use `bun run lint:fix` to auto-fix where possible
4. **Keep dependencies up to date** - CI uses frozen lockfile for reproducibility

## Troubleshooting CI Failures

### Build Failures
- Check that all required environment variables are set
- Ensure no TypeScript compilation errors
- Verify all imports are correct

### Linting Failures  
- Run `bun run lint:fix` to auto-fix issues
- Check ESLint configuration in `eslint.config.js`

### Type Checking Failures
- Run `bun run typecheck` locally
- Fix all TypeScript errors before pushing
- Ensure proper import paths and type definitions