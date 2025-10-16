# Template Configuration Check

## Critical: Check for Unconfigured Template

**Before any deployment or development work**, always check if the project is still using default template values.

### Detection Pattern

Check `wrangler.toml` for these default values:

```toml
name = "deco-create"
scope = "kmute"

[deco]
workspace = "kmute"
```

### If Template Values Are Detected

**STOP and inform the user:**

```
⚠️ IMPORTANT: Your app is still using template default values.

Before you can develop or deploy, you need to configure your app:

1. Run: npm run configure

This will set up:
- Your app name (determines the deployment URL: <app-name>.deco.page)
- The scope (maps to your org/project)
- The workspace (maps to your org/project)

After configuration, you can proceed with development.
```

### Why This Matters

- **Deployment URLs**: The app name determines your public URL (`<app-name>.deco.page`)
- **Project Organization**: Scope and workspace map to your deco organization/project
- **Unique Identity**: Each app needs its own configuration to avoid conflicts

### Quick Start Options

Users can start a new app in two ways:

1. **Using npm create (recommended):**
   ```bash
   npm create deco@latest my-app-name
   cd my-app-name
   npm run configure
   ```

2. **Using GitHub template:**
   ```bash
   # Create a new repo from deco-cx/deco-create template on GitHub
   git clone <your-new-repo>
   cd <your-new-repo>
   npm install
   npm run configure
   ```

### Exception

If the user explicitly says they want to work on the template itself (not a derived app), you can skip this check.

### Automated Check

Before executing any of these commands, verify the configuration:
- `npm run dev`
- `npm run deploy`
- `npm run build`
- Any deployment or development-related tasks

If template values are detected, prompt the user to run `npm run configure` first.

