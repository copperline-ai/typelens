# TypeLens Two-Week Feature Roadmap and Prioritized Backlog

Date: 2026-05-28
Owner: CTO (COP-626)
Horizon: 2 weeks

## Objectives

1. Improve first-time user activation by reducing setup friction and time-to-value.
2. Increase reliability in auth + MCP connection paths.
3. Deliver one externally usable MCP integration milestone for pilots.

## Prioritization framework

- P0: Critical for activation, reliability, or near-term pilot readiness.
- P1: High value and should be pulled if capacity remains.
- P2: Valuable but deferrable beyond this 2-week window.

## Two-week roadmap

### Week 1 (2026-05-28 to 2026-06-03)

#### Track A: Activation and onboarding (P0)

- Guided first-run onboarding with explicit completion checkpoint.
- Persist setup progress so users can resume after refresh/login.
- Clarify auth/setup screen copy and failure hints.

Definition of done:
- New user can complete onboarding without external docs.
- Onboarding progress survives refresh/login.
- QA passes onboarding happy path plus one failure path.

#### Track B: Reliability hardening (P0)

- Deterministic connection state handling and retry UX for MCP/auth calls.
- Normalize timeout/retry behavior for key network operations.
- Add targeted regression coverage around callback/connect edge cases.

Definition of done:
- Auth and MCP failures present actionable user messages.
- Added regression tests pass in CI.

### Week 2 (2026-06-04 to 2026-06-10)

#### Track C: MCP integration usability milestone (P0)

- Finalize Claude Team connector setup flow for pilot users.
- Ensure token lifecycle and connector instructions are clear in settings.
- Validate end-to-end setup in a clean environment.

Definition of done:
- Pilot user can complete connector setup without engineer intervention.
- Clean-environment smoke evidence is attached to issue/PR.

#### Track D: Telemetry baseline + polish (P1)

- Instrument funnel events: signup -> onboarding complete -> connector configured.
- Add minimal weekly product readout/dashboard source.
- Resolve highest-impact UX papercuts found in Week 1 QA.

Definition of done:
- Funnel events are emitted with stable schema.
- Team can report conversion to first successful connector setup.

## Prioritized backlog

### P0 (commit in this two-week window)

1. Guided onboarding flow with persisted progress and completion state.
2. Auth/MCP failure handling with consistent timeout/retry behavior.
3. Claude Team connector settings usability pass + clean-env E2E validation.
4. Regression tests for auth callback and MCP connection edge cases.

### P1 (pull as capacity allows)

1. Funnel telemetry and simple weekly conversion report.
2. Week-1 QA papercut fixes.
3. Runbook updates for onboarding and connector troubleshooting.

### P2 (defer unless priorities shift)

1. Broad design-system refactor.
2. Advanced MCP tool permissioning.
3. Non-critical settings expansion.

## Risks and mitigations

- Risk: reliability work expands into broad refactor.
  - Mitigation: constrain to explicit acceptance criteria and retry/error UX path.

- Risk: MCP scope creep into provider-specific edge features.
  - Mitigation: lock scope to pilot setup success and protocol-compliant core path.

- Risk: environment-specific breakage discovered late.
  - Mitigation: require clean-environment smoke before merge.

## Delegation and ownership

- Implementation owner: Founding Engineer (same-issue handoff model).
- CTO owner: scope/acceptance criteria, tradeoff decisions, PR review/merge/deploy gate.

