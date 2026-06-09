# AI And Agentic Security

Use this reference when the task involves LLMs, prompts, agents, tools, RAG, or
any workflow where model output can influence code or operations.

## Critical Never Rules

1. Never execute raw model output without validation, sandboxing, and approval.
2. Never treat prompt input as trusted just because it came from an internal user.
3. Never pass secrets or regulated data into a model unless explicitly required and protected.
4. Never give an agent broader file, tool, or network access than the task requires.
5. Never let a sub-agent or tool call escalate permissions beyond the parent context.

## Review Checklist

### Prompt And Input Safety

- Is user input clearly isolated from system instructions?
- Are prompts resilient to injection, instruction override, or data-exfiltration attempts?
- Are retrieved documents, files, and tool outputs treated as untrusted content?

### Output Safety

- Is model output validated against schema, policy, or allowlisted actions?
- Could output be interpreted as code, SQL, shell, markdown with active content, or config?
- Is there a human gate before risky actions such as edits, shell commands, network calls,
  deployments, or secret access?

### Tool And Agent Permissions

- Are tools grouped by risk, with explicit approval for high-impact actions?
- Is filesystem access scoped to the workspace or task surface only?
- Is network egress restricted or audited?
- Are sub-agents limited to a subset of parent permissions?

### Data Protection

- Are prompts and logs redacted for secrets, tokens, customer data, and PII?
- Are transcript, feedback, and trace artifacts safe to retain?
- Does retrieval or memory expose data across tenants, sessions, or roles?

### Abuse And Reliability

- Are token, cost, and rate limits enforced?
- Are there controls for denial-of-service, prompt flooding, or repeated tool abuse?
- Are audit logs sufficient to reconstruct who approved or executed risky actions?

## High-Risk Cases

- Agent can run shell commands or write files
- Model output is converted into executable code or infrastructure changes
- RAG system ingests untrusted content and can influence tool use
- Agent can read secrets, cloud credentials, or customer data
- Multi-agent workflows share context or memory without isolation

## Good Security Outcome

For AI or agentic work, the safe default is:

- untrusted inputs are isolated
- outputs are validated before action
- tools are least-privilege and approval-gated
- sensitive data is redacted
- every high-risk action is attributable and auditable
