# ES Modules in Astro Components Guide

This guide explains the proper way to import and use ES modules in Astro components, based on the implementation in the GitHubAccountManager component.

## Overview

Astro components have two distinct execution contexts:
1. **Server-side** (frontmatter): Runs during build/SSR
2. **Client-side** (script tags): Runs in the browser

ES module imports behave differently in each context and require specific configuration.

## Client-Side ES Modules

### Correct Implementation

Use the `client:load` directive (or other client directives) for scripts that need ES module imports:

```astro
<script client:load define:vars={{ serverData }}>
  // ✅ This works - proper module context
  import { myFunction } from '../lib/myModule';
  import { anotherFunction } from '../stores/myStore';
  
  // Use imported functions
  myFunction();
</script>
```

### Why This Works

1. **Module Context**: The `client:load` directive ensures the script runs in a proper ES module context
2. **Bundling**: Astro handles module resolution and bundling automatically
3. **Server-Client Bridge**: `define:vars` allows passing server-side data to client scripts

### Common Mistakes

#### ❌ Script Without Client Directive

```astro
<script>
  // This will throw: "Cannot use import statement outside a module"
  import { myFunction } from '../lib/myModule';
</script>
```

**Problem**: Regular script tags in Astro don't run in module context.

#### ❌ Type="module" Without Integration

```astro
<script type="module">
  // This might work but doesn't integrate with Astro's build system
  import { myFunction } from '../lib/myModule';
</script>
```

**Problem**: No access to `define:vars` and bypasses Astro's optimization.

#### ❌ Is:inline With Imports

```astro
<script is:inline>
  // This will throw an error
  import { myFunction } from '../lib/myModule';
</script>
```

**Problem**: `is:inline` scripts are included as-is without module processing.

## Client Directives Comparison

### client:load
- **When**: Hydrates immediately when page loads
- **Use for**: Critical functionality that needs immediate availability
- **Example**: Authentication status, essential UI interactions

```astro
<script client:load>
  import { checkAuthStatus } from '../stores/auth';
  checkAuthStatus(); // Runs immediately
</script>
```

### client:idle
- **When**: Hydrates when browser is idle
- **Use for**: Non-critical interactive features
- **Example**: Analytics, optional enhancements

```astro
<script client:idle>
  import { initAnalytics } from '../lib/analytics';
  initAnalytics(); // Runs when browser is idle
</script>
```

### client:visible
- **When**: Hydrates when component enters viewport
- **Use for**: Below-the-fold interactive content
- **Example**: Image carousels, lazy-loaded widgets

```astro
<script client:visible>
  import { initCarousel } from '../lib/carousel';
  initCarousel(); // Runs when component is visible
</script>
```

## Server-Side Imports

In the Astro frontmatter (between `---` markers), you can use imports normally:

```astro
---
// ✅ Server-side imports work normally
import { getUser } from '../lib/auth';
import { formatDate } from '../utils/date';

const user = await getUser();
const formattedDate = formatDate(new Date());
---

<div>Welcome, {user.name}!</div>
<p>Today is {formattedDate}</p>
```

## Passing Data Between Server and Client

Use `define:vars` to pass server-side data to client scripts:

```astro
---
const serverData = {
  userId: user.id,
  apiUrl: import.meta.env.PUBLIC_API_URL,
  translations: getTranslations(lang)
};
---

<script client:load define:vars={{ serverData }}>
  import { apiClient } from '../lib/api';
  
  // serverData is available in client script
  apiClient.setBaseUrl(serverData.apiUrl);
  console.log('User ID:', serverData.userId);
</script>
```

## Best Practices

### 1. Choose the Right Client Directive

- Use `client:load` for critical functionality
- Use `client:idle` for enhancements
- Use `client:visible` for below-the-fold content

### 2. Minimize Client-Side JavaScript

- Keep client scripts focused and lightweight
- Prefer server-side rendering when possible
- Only hydrate what needs interactivity

### 3. Handle Loading States

```astro
<script client:load>
  import { heavyFunction } from '../lib/heavy';
  
  // Show loading state
  const loader = document.getElementById('loader');
  loader.style.display = 'block';
  
  try {
    await heavyFunction();
  } finally {
    loader.style.display = 'none';
  }
</script>
```

### 4. Error Handling

```astro
<script client:load>
  import { riskyFunction } from '../lib/risky';
  
  try {
    await riskyFunction();
  } catch (error) {
    console.error('Operation failed:', error);
    // Show user-friendly error message
  }
</script>
```

## Troubleshooting

### "Cannot use import statement outside a module"

**Cause**: Using import statements in a script without proper module context.

**Solution**: Add a client directive to your script tag:

```astro
<!-- Before (broken) -->
<script>
  import { myFunction } from '../lib/myModule';
</script>

<!-- After (fixed) -->
<script client:load>
  import { myFunction } from '../lib/myModule';
</script>
```

### Module Not Found Errors

**Cause**: Incorrect import paths or missing dependencies.

**Solutions**:
1. Check that the import path is correct relative to the component
2. Ensure the imported module exists
3. Verify the module exports the expected functions

### Define:vars Not Working

**Cause**: Using `define:vars` without a client directive.

**Solution**: Client directives are required for `define:vars`:

```astro
<!-- This won't work -->
<script define:vars={{ data }}>
  console.log(data); // undefined
</script>

<!-- This works -->
<script client:load define:vars={{ data }}>
  console.log(data); // Available
</script>
```

## Real-World Example

The GitHubAccountManager component demonstrates these concepts:

```astro
---
// Server-side: Handle props and translations
const { lang = 'en' } = Astro.props;
const t = translations[lang];
---

<!-- HTML structure -->
<div class="github-manager">
  <!-- Component markup -->
</div>

<script client:load define:vars={{ t }}>
  // Client-side: Handle interactivity with proper ES modules
  import { linkGitHubAccount, unlinkGitHubAccount } from '../stores/auth';
  import { supabase } from '../lib/supabase';
  
  // Use imported functions and server data
  async function handleLink() {
    const result = await linkGitHubAccount();
    showMessage(t.linkSuccess);
  }
</script>
```

This pattern ensures:
- Proper module context for imports
- Access to server-side data via `define:vars`
- Optimal loading strategy with `client:load`
- Clean separation between server and client code