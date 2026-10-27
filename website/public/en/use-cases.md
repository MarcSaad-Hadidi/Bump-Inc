# Concrete scenarios, before the next step.

> Explore four illustrative SME use cases: quote automation, document search, service coordination and access review, with human checks and clear limits.

Canonical: __BUMP_ORIGIN__/en/use-cases
First published: 2026-10-27
Last updated: 2026-10-27

A starting problem. A proposed workflow. Criteria for deciding.

## At a glance

These four case studies are fictional scenarios explaining how a Bump engagement could address an SME need. They describe context, proposed workflows, human approvals and acceptance checks. They represent neither real clients nor completed deployments or measured improvements.

## From an email to a quote ready for review.

Illustrative case study — fictional scenario, not a client engagement.

### What is the starting problem?

In this fictional scenario, a manufacturing SME receives requests by email. A team member re-enters contact details in the CRM, finds attachments and follows up when information is missing.

### What workflow could address it?

The proposed workflow extracts useful fields, checks completeness and prepares a quote request. A person reviews the request and approves the next action. The system can then update the CRM and prepare a confirmation under the agreed rules.

### Which decisions remain human?

The workflow decides neither pricing nor commercial commitments. An incomplete request waits for clarification. If the CRM is unavailable, recovery and an alert are planned so the request is not lost.

### How would the result be evaluated?

Before implementation, record request volume, repeated entry and handling time. After validation and adoption, compare the same measures and exceptions. No improvement has been measured for this scenario.

### Deliverables to agree

- A structured entry point for requests and documents.
- An approval queue with an owner and request status.
- A CRM connection, an activity log and a recovery path.

### Acceptance checks

Acceptance checks to agree before implementation.

| Situation | Expected check |
| --- | --- |
| Complete request | A case is prepared and waits for approval. |
| Missing information | The request is flagged; final transmission does not run. |
| Approval rejected | The request returns to preparation with a reason. |
| CRM unavailable | The failure is visible and recovery does not create a duplicate. |

## Find the information that matters.

Illustrative case study — fictional scenario, not a client engagement.

### What is the starting problem?

In this fictional scenario, a service SME stores procedures in several document spaces. To answer an internal question, the team must find the applicable version and confirm it has permission to read it.

### What workflow could address it?

The proposed integration connects an assistant to a defined document collection. Answers show useful passages and references. When a source is missing, outdated or contradictory, the assistant states the limitation and asks for human verification.

### Which decisions remain human?

Read permissions remain those defined by the business. An answer must not reveal a restricted document. The assistant can prepare a next action; a person approves sensitive decisions before execution.

### How would the result be evaluated?

Evaluate answers against a team-approved question set: correctness, sources, limitations and access control. These criteria must be met before broader use. This scenario claims no measured accuracy rate.

### Deliverables to agree

- A map of sources, versions and access permissions.
- A question-and-answer interface with inspectable references.
- A team-approved evaluation set and rules for handing questions to a person.

### Acceptance checks

Acceptance checks to agree before implementation.

| Situation | Expected check |
| --- | --- |
| Documented question | The answer points to supporting sources. |
| Missing source | The assistant states its limitation instead of guessing. |
| Restricted document | The content is neither retrieved nor revealed to the person. |
| Conflicting versions | The conflict is shown and verification is requested. |

## One place to coordinate service work.

Illustrative case study — fictional scenario, not a client engagement.

### What is the starting problem?

In this fictional scenario, a maintenance SME coordinates requests through email and tracking files. The coordinator needs to identify who is assigned, what information is missing and which request needs attention.

### What workflow could address it?

The proposed application brings the request, documents, owner and next action together. Team and coordination views show the same statuses. Useful connections to existing tools are defined after reviewing their APIs and limitations.

### Which decisions remain human?

The coordinator retains priority and assignment decisions. Roles define permitted changes. Closing a request requires the agreed information, and synchronization failures remain visible.

### How would the result be evaluated?

Track unassigned requests, waiting work and manual recovery. Measure a baseline before launch and compare after adoption. Volumes and outcomes still need to be established in a real project.

### Deliverables to agree

- A web application with views for the defined roles.
- A workflow for intake, assignment, tracking and closure.
- Selected integrations, acceptance checks and engagement documentation.

### Acceptance checks

Acceptance checks to agree before implementation.

| Situation | Expected check |
| --- | --- |
| New request | An owner and a next action are identifiable. |
| Status change | Authorized people see the same progress. |
| Insufficient access | The change is refused without exposing the request. |
| Incomplete closure | Missing information is identified before approval. |

## From an identified risk to a verified fix.

Illustrative case study — fictional scenario, not a client engagement.

### What is the starting problem?

In this fictional scenario, an SME wants to review access to an internal application after staffing changes. Some accounts or permissions may no longer match current responsibilities.

### What workflow could address it?

The audit begins with written scope and authorization. Agreed access and settings are examined. Each finding records the risk, observed evidence, a priority and a proposed fix, followed up with the responsible person.

### Which decisions remain human?

No examination goes beyond the authorized scope. Changes are agreed with the business, tested and documented. Each fix is followed by verification; ongoing monitoring depends on the maintenance engagement.

### How would the result be evaluated?

Track open findings, verified fixes and reviewed access within the agreed scope. This scenario is not a completed audit and does not guarantee the absence of vulnerabilities.

### Deliverables to agree

- Approved scope and rules of engagement.
- A register of findings, priorities and agreed fixes.
- Verification of fixes and assigned follow-up responsibilities.

### Acceptance checks

Acceptance checks to agree before implementation.

| Situation | Expected check |
| --- | --- |
| Unneeded account | The owner confirms deactivation and its implications. |
| Excessive permissions | Access is aligned with actual responsibilities. |
| Applied fix | Expected operation and protection are verified. |
| Ongoing review | An owner and a condition for re-examination are defined. |

## Frequently asked questions

### Do these case studies describe Bump clients?

No. The four scenarios are fictional and illustrative. They show a possible project and its acceptance criteria without claiming a client, completed engagement or measured result.

### How can an example become a real project?

Your business operations, tools, access and constraints are examined. A proposal then defines scope, deliverables, budget, responsibilities and checks before implementation.

## About the publisher

[Bump](__BUMP_ORIGIN__/en/about#editorial-policy) — Bump is a technology consulting company founded by two entrepreneurs in Montréal. Its services connect workflow optimization, AI and software development, and cybersecurity for SMEs.
Technology consultant for SMEs · Montréal, Québec

## What changed

- Published four fictional scenarios with context, deliverables and acceptance checks.
- Explicitly distinguished engagement examples from client outcomes.

## Related

- [Workflow automation for small businesses.](__BUMP_ORIGIN__/en/services/workflow-automation) — Analyse processes, automate repetitive tasks and connect business software with Bump in Montréal. Workflows designed around your SME’s operations.
- [AI integration for your business.](__BUMP_ORIGIN__/en/services/ai-integration) — Integrate AI into business tools and processes with Bump: focused agents, document search, summaries and dashboards, with human approval.
- [Software built around your operations.](__BUMP_ORIGIN__/en/services/custom-software-development) — Web applications, portals and internal systems for Québec SMEs. Bump builds custom software connected to your CRM, ERP and APIs.
- [Cybersecurity, with a clear framework.](__BUMP_ORIGIN__/en/services/cybersecurity) — Authorized audits, vulnerability identification, remediation and system hardening. Bump supports SMEs in Montréal and Québec.
- [Understand before you build.](__BUMP_ORIGIN__/en/approach) — Explore the five stages of a Bump engagement: audit, analysis, proposal, implementation and maintenance. Technology consulting designed for SMEs.
