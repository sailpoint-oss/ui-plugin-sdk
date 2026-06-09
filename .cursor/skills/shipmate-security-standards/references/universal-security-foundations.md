# Universal Security Foundations

Use this reference for the baseline pass on any security-sensitive change.

## Universal Never Rules

1. Never trust external input by default.
2. Never hardcode secrets, credentials, or encryption material.
3. Never skip authorization because a route is "internal" or "admin only."
4. Never execute unvalidated input as code, shell, queries, templates, or paths.
5. Never leak secrets, PII, or internal stack traces in logs or user-visible errors.
6. Never assume a dependency, tool, or model output is safe without validation.
7. Never weaken tenant, ownership, or account-boundary checks for convenience.

## Always-Required Controls

- Validate input at the boundary closest to entry.
- Encode or sanitize output for the sink that renders or executes it.
- Use parameterized queries and typed APIs for data access.
- Enforce authentication and authorization separately.
- Log security-relevant events without logging secrets or sensitive payloads.
- Apply least privilege to credentials, roles, tokens, and service accounts.
- Add rate limits, quotas, or abuse controls where cost or amplification is possible.
- Add targeted negative tests for denial paths and malformed input.

## Baseline Review Matrix

### Trust Boundaries

- What input is untrusted: user, file, webhook, queue, LLM output, or third-party API?
- Where does data cross process, tenant, role, or network boundaries?
- What should happen when that input is malformed, malicious, or missing?

### Identity and Authorization

- Who can invoke this path?
- What resource-level checks prove ownership or entitlement?
- Are role checks enforced on the server side, not only in UI logic?
- If this is multi-tenant, where is tenant isolation enforced?

### Execution and Injection

- Can untrusted input influence queries, shell commands, templates, eval-like code paths,
  file system paths, redirects, fetch targets, or deserialization?
- Are uploads, archives, markup, or URLs treated as hostile until proven otherwise?
- Are downstream systems protected against SSRF, path traversal, and injection classes?

### Secrets and Sensitive Data

- Where do secrets come from, and how are they rotated?
- Could logs, error messages, telemetry, prompts, or screenshots expose secrets or PII?
- Is sensitive data stored only when necessary, for only as long as necessary?

### Dependencies and Supply Chain

- Does the change add a new dependency, build step, plugin, action, or external service?
- Is the dependency justified, maintained, and scanned?
- Are install-time scripts, hooks, or generated files introducing new trust assumptions?

## Threat Modeling Prompts

Ask these questions before merge:

- What is the attacker trying to gain here: data, execution, escalation, persistence, abuse?
- What is the highest-impact misuse path if every validation step fails?
- Which controls fail closed, and which silently fail open?
- What evidence will prove the mitigation works in tests or monitoring?

## Security Review Outcome

A useful review should end with:

- The highest-risk surfaces touched
- The controls that must exist before merge
- The tests or verification still missing
- Any escalation or follow-up required
