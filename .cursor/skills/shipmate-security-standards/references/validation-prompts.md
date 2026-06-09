# Validation Prompts

Use this reference when the risk is centered on AI inputs, outputs, runtime
guards, or abuse prevention.

## What It Covers

- Security validation prompts for prompt injection, obfuscation, harmful content,
  and denial-of-service style abuse
- Content-verification prompts for RAG pipelines, training data, and domain-specific
  guardrails

## When To Reach For It

- The system processes LLM prompts, model output, or retrieved content.
- You need stronger runtime controls around acceptance, blocking, or sanitization.
- You are designing or reviewing inference-time security guardrails.

## Best Fit

This prompt family is for runtime validation and AI safety controls. It complements,
but does not replace, the baseline review in `security-standards`.
