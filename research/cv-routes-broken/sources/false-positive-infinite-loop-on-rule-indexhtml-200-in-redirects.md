# False positive "Infinite loop" on rule `/ /index.html 200` in `_redirects` · Issue #11824 · cloudflare/workers-sdk · GitHub

Source: https://github.com/cloudflare/workers-sdk/issues/11824

---

### What versions & operating system are you using?

```
  System:
    OS: macOS 26.1
    CPU: (10) arm64 Apple M4
    Memory: 516.30 MB / 32.00 GB
    Shell: 5.9 - /bin/zsh
  Binaries:
    Node: 25.1.0 - /opt/homebrew/bin/node
    npm: 11.6.2 - /opt/homebrew/bin/npm
  npmPackages:
    wrangler: ^4.54.0 => 4.57.0
```

### Please provide a link to a minimal reproduction

<https://github.com/Bi11/bug-report-infinite-loop.git>

### Describe the Bug

Wrangler incorrectly flags a valid `_redirects` rule `/ /index.html 200` as an "Infinite loop", blocking deployment.

#### Why this is a bug

1. **No Implicit Loop:** According to the [HTML handling docs](https://developers.cloudflare.com/workers/static-assets/routing/advanced/html-handling/#disable-html-handling), when `html_handling` is set to `"none"`, requesting `/` does not automatically serve `index.html` (it results in a 404 or falls back to `not_found_handling`). Therefore, explicitly rewriting `/` to `/index.html` is necessary logic, not a conflict.
2. **Proxying is Non-Recursive:** The rule uses status `200` (Proxying). The [Redirects docs](https://developers.cloudflare.com/workers/static-assets/redirects/#proxying) explicitly state: *"Only the first redirect in your will apply."* Even if the paths were identical, the proxy logic stops after one hop.
3. **Validation Logic Error:** The error message claims the rule will *"cause a redirect to strip .html"*. However, stripping `.html` is a behavior of `auto-trailing-slash` or standard handling. Since `html_handling` is set to `"none"`, this stripping behavior is disabled, making the described loop impossible.

##### Reproduction

1. Set `html_handling: "none"` in `wrangler.jsonc`.
2. Add the rule `/ /index.html 200` to `public/_redirects`.
3. Run `npx wrangler pages dev` or `npm run deploy`.

#### Actual Behavior

**`npm run dev` output:**

```
Infinite loop detected in this rule and has been ignored. This will cause a redirect to strip .html or /index and end up triggering this rule again. Please fix or remove this rule to silence this warning.
at public/_redirects:1 | / /index.html 200
```

**`npm run deploy` output:**

```
Invalid _redirects configuration:
Line 1: Infinite loop detected in this rule. This would cause a redirect to
strip `.html` or `/index` and end up triggering this rule again. [code: 10021]
```

#### Workaround

I am migrating a legacy site that requires `html_handling: "none"`. To bypass this validation error, I had to rename the index file to `_index.html` and update the rule to:

This confirms the platform supports the behavior, and the blockage is purely due to Wrangler's over-aggressive validation.

### Please provide any relevant error logs

*No response*
