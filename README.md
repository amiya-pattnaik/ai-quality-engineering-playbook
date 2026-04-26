# AI Quality Engineering Playbook

This module is a blueprint for an AI-driven Quality Engineering system that is intended to combine `RAG + GenAI + Agentic AI` to turn requirements and code changes into functional test cases, targeted automation assets, execution runs, and release-quality insights.

The repo now includes a runnable V1 scaffold in `Node.js`. It validates a scenario file, loads Jira and Gherkin requirement inputs, generates traceable functional test cases, produces deterministic API/UI automation files, and writes basic QE reports.

## Current V1 Scaffold

What works now:

- scenario-driven CLI with validation
- Jira requirement ingestion from scenario JSON
- Gherkin feature ingestion from local `.feature` files
- multiple Gherkin files in one scenario
- optional feature-level generation filter from CLI
- functional test case generation before automation generation
- API automation generation from Restlyn-style API Gherkin steps
- UI automation generation in `Playwright` or `WebdriverIO`
- selector alias overrides via `selector-aliases.json`
- GitHub change analysis from supplied change metadata
- SonarQube summary enrichment from supplied quality metadata
- Markdown reporting for functional cases, traceability, impacted selection, and execution summary

What is intentionally not active in V1 runtime:

- no live LLM invocation
- no live RAG pipeline or vector retrieval
- no agent runtime or multi-agent orchestration
- no LangChain, LangGraph, or LlamaIndex execution flow behind the generators

What is adapter-ready but not yet connected live:

- direct Jira API authentication and ticket fetch
- direct GitHub API / PR diff fetch
- direct SonarQube API fetch
- live LLM invocation through provider SDKs
- real execution orchestration of the generated tests

## Version Scope

### V1

V1 is deterministic and implementation-first.

- Jira input from scenario JSON
- local Gherkin ingestion
- functional test case generation
- Playwright or WebdriverIO UI generation
- Playwright or `basic-rest` API generation/execution
- GitHub change analysis from supplied metadata
- SonarQube summary enrichment from supplied metadata
- local preflight and execution commands
- Markdown reporting

### V2

V2 is where the AI-heavy architecture should become real.

- live Jira integration
- live GitHub and pull request diff integration
- live SonarQube integration
- RAG ingestion and retrieval over project artifacts
- GenAI-backed test design and automation generation
- Agentic AI orchestration across specialized QE agents
- full Restlyn-style API capability expansion
- advanced change impact analysis
- richer CI/CD and release-quality decisioning

## Quick Start

```bash
cd ai-quality-engineering-playbook
npm run lint
npm run preflight
npm run demo
node src/run.js scenarios/sample-qe-scenario.json --feature requirements/scheduled-transfer.feature
```

Generated outputs:

- `reports/functional-test-cases.md`
- `reports/test-traceability.md`
- `reports/impacted-test-selection.md`
- `reports/execution-summary.md`
- `tests/generated/api/*`
- `tests/generated/ui/*`

Execution commands:

```bash
npm run test:ui
npm run test:api
npm run test:generated
```

Notes:

- `test:ui` runs the selected UI framework from the scenario
- `test:api` runs generated API tests through the selected API runner
- `test:generated` runs both paths when the scenario mode is `both`

Preflight commands:

```bash
npm run preflight
npm run preflight:fix
```

The preflight command checks:

- `node` and `npm`
- framework-specific local packages for the selected scenario
- `playwright` binary availability when Playwright is the selected path
- `wdio` CLI availability when WebdriverIO is the selected path
- shipped framework config presence (`playwright.config.js`, `wdio.conf.js`)

## Project Structure

- `src/run.js` - CLI entrypoint
- `src/preflight.js` - tooling and dependency preflight checks
- `src/scenario.js` - scenario loading and validation
- `src/orchestrator.js` - V1 orchestration flow
- `src/connectors/` - Jira, Gherkin, GitHub, and SonarQube adapters
- `src/generators/` - functional test, automation, and impact generation
- `src/reporters/` - Markdown report rendering
- `scenarios/` - input scenario files
- `requirements/` - local Gherkin feature files used by scenarios
- `reports/` - generated Markdown outputs
- `tests/generated/` - generated automation scaffolds
- `selector-aliases.example.json` - sample selector override file for project-specific DOM mappings
- `route-aliases.example.json` - sample route override file for page navigation mapping

## Multi-Feature Support

The scenario contract supports more than one `.feature` file.

- Add multiple Gherkin entries under `requirementSources`
- mark each one with optional `usage`: `ui`, `api`, or `both`
- run the full scenario or narrow execution with `--feature`

Example:

```json
{
  "type": "gherkin",
  "path": "requirements/scheduled-transfer.feature",
  "usage": "ui"
}
```

```json
{
  "type": "gherkin",
  "path": "requirements/scheduled-transfer-api.feature",
  "usage": "api"
}
```

CLI filter:

```bash
node src/run.js scenarios/sample-qe-scenario.json --feature requirements/scheduled-transfer.feature
```

You can also pass more than one file:

```bash
node src/run.js scenarios/sample-qe-scenario.json --feature requirements/scheduled-transfer.feature,requirements/scheduled-transfer-api.feature
```

## Gherkin Styles

UI Gherkin and API Gherkin should be authored differently.

UI-style feature files:

- focus on user navigation, form entry, clicks, selections, and visible outcomes
- generate page objects plus Playwright or WebdriverIO specs
- choose one UI framework per scenario through `automationTargets.ui`

Example:

```gherkin
Scenario: Create a scheduled transfer for a future date
  Given the user is on the transfer form
  When the user enters a transfer date in the future
  And submits the transfer request
  Then the system shows a scheduled transfer confirmation
```

API-style feature files:

- follow Restlyn-like request/assertion steps
- generate API test specs
- support either `playwright` or `basic-rest` execution via `automationTargets.api`

Example:

```gherkin
Scenario: Create a scheduled transfer
  Given base URL is "http://localhost:3000"
  When I POST "/api/transfers"
    | amount        | 250.00     |
    | sourceAccount | checking   |
    | targetAccount | savings    |
    | transferDate  | 2026-05-01 |
  Then response status should be 200
  And response body should contain key "id"
```

## Selector Overrides

Default UI selector fallbacks are intentionally broad and generic, but they should be overridden per application when stable selectors are known.

- copy `selector-aliases.example.json` to `selector-aliases.json`
- replace values with project-specific selectors
- generated UI page objects will prefer these aliases over default heuristics

## Route Overrides

UI navigation paths inferred from Gherkin remain heuristic. If your app uses stable routes, provide explicit mappings.

- edit `route-aliases.json` or start from `route-aliases.example.json`
- map human phrases such as `the transfer form` to real routes such as `/transfer`
- generated UI page objects will use these route mappings when they infer navigation steps

## Framework Selection

In V1, a team should select one UI automation framework per scenario and one API runner per scenario.

Example:

```json
"automationTargets": {
  "api": "playwright",
  "ui": "playwright"
}
```

Or:

```json
"automationTargets": {
  "api": "basic-rest",
  "ui": "webdriverio"
}
```

The selected value controls:

- which UI test code is generated
- which API runtime is generated
- which dependencies preflight checks
- which local install commands `preflight:fix` applies

Supported values:

- `automationTargets.ui`: `playwright` or `webdriverio`
- `automationTargets.api`: `playwright` or `basic-rest`

Execution model:

- `playwright` API runner generates and runs Playwright API tests
- `basic-rest` API runner generates and runs plain Node REST tests from Restlyn-style Gherkin
- `basic-rest` is intentionally a lightweight V1 runner, not full Restlyn feature parity
- `playwright` UI runner is the most stable V1 path
- `webdriverio` UI runner is supported, but local execution depends on browser/driver compatibility

## WebdriverIO Caveat

WebdriverIO generation is supported in V1, and preflight validates the local WDIO toolchain, but successful execution still depends on the local browser and driver being compatible.

For example:

- local Chrome major version must match the installed `chromedriver` major version
- preflight reports this mismatch explicitly when detected

If you want the most reliable V1 execution path, use:

- `automationTargets.ui = "playwright"`
- `automationTargets.api = "playwright"` or `automationTargets.api = "basic-rest"`

It is intentionally different from the broader `agentic-engineering-playbook`:

- `agentic-engineering-playbook` models a cross-functional engineering workflow where quality is one step in a larger chain.
- `quality-engineering-playbook` makes quality the primary operating domain:
  - requirements to functional test design
  - functional test design to automation
  - automation to execution
  - code changes to impacted test selection
  - execution to quality decisioning

## V1 Scope

Version 1 is intentionally narrow and implementation-focused.

Included in V1:

- Jira connector to read ticket details, descriptions, and acceptance criteria
- Gherkin connector to read `.feature` files
- functional test case generation before automation generation
- output mode selection: `api`, `ui`, or `both`
- REST API automation generation
- UI automation generation in `Playwright` or `WebdriverIO`
- `Node.js` implementation
- pluggable LLM provider/model configuration placeholder
- GitHub connector for code change analysis
- SonarQube integration for code metrics and quality-gate signals
- reporting for traceability, impacted scope, automation output, and execution summary

Deferred to V2:

- live RAG pipeline and retrieval indexing
- live GenAI orchestration and provider invocation
- agentic QE workflow execution
- Confluence and OpenAPI ingestion
- advanced RAG indexing over large enterprise corpora
- dependency graph and historical defect-based impact analysis
- synthetic test data generation
- flaky test intelligence and retry heuristics
- CI/CD environment integrations beyond local or basic pipeline execution

## Positioning

Use this playbook when the goal is to answer questions like:

- What should be tested from the requirement?
- What functional test cases should be created before automation?
- What can be automated now?
- What test data is needed?
- What changed in the code and what tests are impacted?
- What should run in CI for this change?
- What quality risks remain before release?

## Core Idea

The system operates in two connected modes.

### 1. Specification-to-Testing

Read requirement sources such as:

- Jira stories
- Gherkin feature files

Then:

- generate functional test cases
- derive automation-ready scenarios from those test cases
- convert them into automated API tests
- convert them into automated UI tests
- execute tests and summarize results

### 2. Intelligent Change-Aware Testing

Read change signals such as:

- GitHub diff / pull request metadata
- changed APIs, components, pages, services
- dependency or ownership metadata

Then:

- identify affected functionality
- select relevant tests
- add nearby regression coverage
- recommend missing tests when coverage is weak
- execute a targeted suite
- produce a quality-risk summary

## Why It Needs RAG + GenAI + Agentic AI

These sections describe the target architecture. They are not fully implemented in V1 runtime.

### RAG

Used to ground the system in real project artifacts:

- requirements and acceptance criteria
- feature behavior captured in Gherkin
- existing test assets
- code ownership and dependency metadata

Without grounding, generated tests drift away from actual product intent.

### GenAI

Used for high-value transformations:

- requirement to functional test cases
- functional test cases to API/UI automation code
- result logs to human-readable summaries

### Agentic AI

Used to orchestrate the full loop across specialized roles:

- requirement reader
- traceability mapper
- risk analyst
- functional test designer
- automation generator
- change impact analyzer
- execution coordinator
- triage and reporting agent

## Suggested Agent Flow

```text
Inputs
  |
  +--> Requirement Sources
  |      - Jira / Gherkin
  |
  +--> Change Sources
         - GitHub PR diff / changed files / ownership metadata
  |
  v
[Ingestion Agent]
  |
  v
[RAG Retrieval Agent]
  |
  +--> [Requirement Analysis Agent]
  |         -> acceptance criteria, entities, business rules
  |
  +--> [Change Impact Agent]
  |         -> affected modules, flows, APIs, risk areas
  |
  v
[Test Design Agent]
  |
  +--> functional test cases
  +--> negative tests
  +--> edge cases
  +--> risk-priority tags
  |
  v
[Automation Agent]
  |
  +--> REST API tests
  +--> UI tests (Playwright or WebdriverIO)
  |
  v
[Execution Agent]
  |
  v
[Result / Release Agent]
  |
  +--> failure summary
  +--> impacted coverage
  +--> missing tests
  +--> release quality recommendation
```

## V1 Architecture

```text
Inputs
  |
  +--> Jira Ticket Connector
  |
  +--> Gherkin Feature Connector
  |
  +--> GitHub Change Connector
  |
  +--> SonarQube Metrics Connector
  |
  v
[Normalization Layer]
  |
  v
[Deterministic Orchestration Layer in Node.js]
  |
  +--> Requirement Analysis Agent
  +--> Functional Test Design Agent
  +--> Automation Generation Agent
  +--> Change Impact Agent
  +--> Reporting Agent
  |
  v
Outputs
  |
  +--> functional-test-cases.md
  +--> test-traceability.md
  +--> impacted-test-selection.md
  +--> execution-summary.md
  +--> generated API/UI automation
```

## Scenario Contract

The current V1 scaffold expects a JSON input shaped like `scenarios/sample-qe-scenario.json` with:

- scenario identity and goal
- generation mode: `api`, `ui`, or `both`
- runtime/model preferences
- Jira requirement sources
- Gherkin feature paths
- GitHub change context
- SonarQube quality signal metadata
- automation target selection

This contract is now executable, not just conceptual.

## V1 Limitations

- Jira ingestion is currently scenario-backed rather than fetched from Jira APIs.
- GitHub and SonarQube use supplied metadata rather than live server calls.
- Generated automation is intentionally scaffold-level and still contains `TODO` placeholders.
- `LangChain` and `LlamaIndex` are represented in the runtime contract and architecture, but full SDK-based integration is a next implementation step.
- `GenAI`, `RAG`, and `Agentic AI` are architectural targets for V2, not active runtime capabilities in V1.
- Live execution is wired for the shipped Playwright and `basic-rest` paths.
- Full Restlyn runtime capabilities are not embedded in V1. The `basic-rest` option does not yet include Restlyn features such as data-driven execution, schema tooling, token chaining, tags, mock server support, warnings aggregation, or `.restlynrc`.

## Capability Areas

### 1. Knowledge Ingestion

Inputs:

- Jira stories and epics
- Gherkin feature files
- existing test repositories
- code diffs and repo metadata

Outputs:

- normalized requirement objects
- linked artifacts for retrieval
- traceability identifiers

### 2. Functional Test Design

Generate:

- traceable functional test cases
- happy-path scenarios
- negative validations
- boundary cases
- authorization / role cases
- business rule validations
- regression recommendations

Every output should retain traceability back to source requirement IDs.

### 3. Automation Generation

Generate:

- API tests for REST endpoints
- UI tests in `Playwright` or `WebdriverIO`
- selectors, fixtures, reusable helpers
- assertions mapped to acceptance criteria and functional test case IDs

The generator should avoid producing only raw one-off scripts. It should prefer reusable test structure and stable conventions.

### 4. Intelligent Test Selection

Given a code change, identify:

- directly impacted tests
- neighboring regression tests
- missing impacted coverage
- risky areas with no automation

This can start simple in v1:

- file-path mapping
- API-path mapping
- feature-tag mapping
- ownership-based heuristics

Then expand in v2:

- dependency graph analysis
- call graph / route graph enrichment
- historical defect weighting

### 5. Quality Signals and Metrics

Read:

- SonarQube quality gate
- code smells
- bug and vulnerability counts
- coverage and duplication metrics

Use these signals to enrich release recommendations and impacted-test reporting.

### 6. Execution and Triage

Run:

- impacted API tests
- impacted UI tests
- optional smoke/regression packs

Then produce:

- pass/fail summary
- flaky test hints
- failure clustering
- requirement coverage status
- release risk recommendation

## Recommended Inputs and Outputs

### Inputs

- `requirements/`
  - Jira export or story JSON
  - `.feature` files
- `changes/`
  - diff summary
  - changed files list
  - PR metadata
- `knowledge/`
  - defect history
  - existing test inventory
  - ownership / system map
- `quality/`
  - SonarQube metrics snapshot
  - quality gate status

### Outputs

- `reports/functional-test-cases.md`
- `reports/test-traceability.md`
- `reports/impacted-test-selection.md`
- `reports/execution-summary.md`
- `tests/generated/api/*`
- `tests/generated/ui/*`

## Example Workflow

1. Load requirement artifacts and normalize them.
2. Generate functional test cases with traceability to Jira and Gherkin sources.
3. Generate API tests, UI tests, or both based on selected mode.
4. Read GitHub change signals and recommend impacted tests.
5. Read SonarQube metrics and enrich the quality summary.
6. Execute selected automation and publish reports.
2. Retrieve relevant project context from the knowledge base.
3. Build a requirement model with acceptance criteria, entities, and constraints.
4. Generate functional scenarios and traceable test cases.
5. Convert high-value scenarios into API and UI automation.
6. Generate synthetic test data aligned to the scenarios.
7. If a code change is provided, calculate impacted functionality and test scope.
8. Execute targeted tests.
9. Publish a quality report with coverage gaps, failures, and release recommendation.

## v1 Scope

The v1 should stay narrow and finishable.

Recommended v1:

- ingest `Gherkin + OpenAPI + simple Jira-style story JSON`
- generate functional test cases
- generate REST API tests
- generate Playwright UI tests
- generate synthetic test data
- execute generated tests
- run simple impacted-test selection from changed files and tags
- publish one consolidated markdown report

## v1 Non-Goals

Avoid these in the first version:

- full Confluence integration at scale
- advanced self-healing automation
- deep semantic dependency graphing
- flaky-test prediction models
- autonomous production release approvals

## Suggested Tech Choices

Keep the stack pragmatic:

- orchestration: Node.js
- retrieval store: local JSON/Markdown first, vector store later
- UI automation: Playwright first
- API automation: Playwright API or a lightweight REST test layer
- model providers: mock + OpenAI provider abstraction
- outputs: Markdown / HTML reports

WebdriverIO can be added later as a second automation target once the abstraction is stable.

## Differentiation From Existing Playbooks

### Compared to Generative AI Engineering Playbook

- generative playbooks focus on content generation and prompt-driven transformation
- this playbook owns traceability, risk, execution, and quality decisions

### Compared to Agentic Engineering Playbook

- the current agentic repo is broad and cross-functional
- this playbook is domain-specialized for QE and testing workflows
- quality is not one step here; it is the system's central purpose

### Compared to RAG Engineering Playbook

- RAG supplies grounded context retrieval
- this playbook uses RAG as one subsystem, not the end product

## Future Extensions

- flaky test intelligence
- release readiness scoring
- defect clustering and escape analysis
- accessibility and performance test generation
- contract test generation from API changes
- traceability dashboards
- CI policy integration for go / no-go recommendations

## Suggested Next Implementation Step

Before building the full toolchain, define a strict contract for:

- requirement document schema
- generated functional test case schema
- generated automation metadata schema
- impacted test selection schema
- final report schema

That contract will keep generation, execution, and reporting aligned as the system grows.
