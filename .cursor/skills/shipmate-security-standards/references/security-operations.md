# Security Operations

Use this reference for exposed secrets, dependency hygiene, recurring maintenance,
and operational follow-up after a security-sensitive change.

## Exposed Secret Response

If a secret is exposed in code, history, logs, prompts, screenshots, or artifacts:

1. Rotate or revoke it immediately.
2. Identify where it was exposed and who could have accessed it.
3. Remove it from active surfaces and, if required, from history.
4. Document the incident and notify the right owners.
5. Add follow-up checks so the same leak path does not recur.

Do not treat "we will rotate it later" as an acceptable mitigation.

## Dependency Hygiene

When adding or updating dependencies:

- Prefer fewer dependencies over more.
- Prefer maintained dependencies over abandoned ones.
- Scan for known vulnerabilities before merge.
- Review install scripts, hooks, code generation, and runtime permissions.
- Record why a sensitive dependency is required.

## Logging And Monitoring

Security-sensitive changes should define:

- what gets logged
- what must never be logged
- what gets alerted
- what metrics reveal abuse or failure
- who responds when a control fails

Useful examples:

- repeated auth failures
- unexpected authorization denials
- rate-limit bursts
- file-upload rejections
- dependency vulnerability alerts
- unusual agent or tool activity

## Incident Severity Heuristics

### Immediate Escalation

- exposed credentials
- active exploitation
- tenant or customer data exposure
- authorization bypass
- unsafe autonomous execution

### Short-Term Follow-Up

- vulnerable dependencies with a known fix
- missing audit signals on high-risk paths
- weak validation on newly introduced inputs
- privacy or retention gaps without confirmed exposure

## Recurring Maintenance

- Review dependency alerts regularly.
- Run secret scanning before merge and in CI.
- Re-check high-risk routes when auth, data handling, or trust boundaries change.
- Revisit controls when new tools, plugins, or external services are introduced.

## Recommended Tool Categories

- Secret detection
- Dependency and CVE scanning
- Static analysis for security patterns
- Runtime monitoring and audit trails

The exact tools may vary by stack, but the control goals do not.
