---
name: shipmate-security-standards
description: "Use this skill when planning, implementing, reviewing, or verifying changes with security impact, including authentication or authorization, secrets, input validation, file or network access, dependency changes, privacy-sensitive flows, AI-agent behavior, or exposed credentials. Provides Shipmate's global, stack-agnostic security baseline and bundled references for deeper follow-up."
license: "Copyright SailPoint Technologies, Inc; All rights reserved."
metadata:
  version: 1.0.0-beta.17
  category: shipmate:global
  updated: 2026-03-31
  author: @eng-ai-ops
---

# Security Standards

Global, stack-agnostic security guidance for Shipmate. Use this skill to turn
"be careful" into a repeatable security review.

## When to Use

- Authentication, authorization, session, or tenant-boundary changes
- Secrets, credentials, environment variables, or encryption handling
- Input validation, file uploads, path handling, template rendering, or command execution
- External APIs, webhooks, network access, or dependency changes
- Logging, auditability, privacy, data retention, or sensitive-data handling
- AI, LLM, agent, tool-execution, or prompt-processing behavior
- Any exposed secret, security incident, or pre-merge security review

If the change touches trust boundaries, untrusted input, permissions, code
execution, external connectivity, or sensitive data, load this skill.

## Workflow

1. Start with `./references/universal-security-foundations.md` for the baseline.
2. If the task involves AI, agents, tool execution, or model I/O, also read
   `./references/ai-agentic-security.md`.
3. If the task involves exposed credentials, dependency hygiene, monitoring, or
   recurring maintenance, read `./references/security-operations.md`.
4. If the task needs a deeper security workflow, read
   `./references/README.md` and then the relevant bundled category summary in `./references/`.

## Review Pass

For every security-sensitive change, answer these questions explicitly:

1. What are the trust boundaries and untrusted inputs?
2. What identity, role, ownership, or tenant checks must hold?
3. Could this path leak secrets, PII, tokens, or internal errors?
4. Could it execute code, commands, templates, queries, or remote requests unsafely?
5. What logging, audit, rate limits, alerts, rollback, or monitoring are required?
6. What negative tests prove the controls actually work?

## Response Format

When giving security guidance or review feedback, structure it as:

1. Risk summary
2. Sensitive surfaces touched
3. Required controls
4. Missing verifications or tests
5. Escalations needed before merge

## Escalate Immediately

- Exposed credential or secret in code, history, logs, screenshots, or prompts
- Authorization bypass, tenant-isolation risk, IDOR, or missing ownership checks
- Raw LLM output or untrusted input reaches execution
- Sensitive-data exposure, privacy breach, or unsafe retention
- Critical dependency or supply-chain issue without mitigation

## Red Flags

- "It is internal so auth is optional"
- "The MIME type looked right"
- "We validate on the frontend already"
- "The model would not generate anything dangerous"
- "We can rotate the secret after merge"
- "This endpoint is only for admins" without enforced checks

## Scope

This skill is the global baseline. Keep it stack-agnostic and use it first.
Apply stack-specific security guidance only after the global baseline is covered.
