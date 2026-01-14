Below is a **deep, implementation-ready PRD** for the **Conversational Job Discovery & Guidance Agent**.
This is intentionally precise, constraint-driven, and aligned with the inmates.ai ecosystem and the future application executor.

---

# Product Requirements Document (PRD)

## Product: Conversational Job Discovery & Guidance Agent

## Platform: inmates.ai

## Version: v1.0

## Status: Definition Complete

---

## 1. Core Concept

Build a **conversational AI agent** that allows users to discover jobs using natural language (e.g. “I’m a software engineer, show me available jobs”), retrieves results strictly from inmates.ai’s internal job data, and guides users through understanding and applying to those jobs.

This agent:

* Understands user intent
* Translates intent into structured job queries
* Retrieves and ranks jobs deterministically
* Responds conversationally
* Guides users toward application actions

This agent **does not apply for jobs**.
This agent **does not browse external sites**.
This agent **does not act autonomously**.

It is a **query + guidance system**, not an execution system.

---

## 2. Goals and Non-Goals

### Goals

* Reduce friction in job discovery
* Replace rigid filters with natural language interaction
* Increase engagement with job listings
* Prepare users for application (manual or AI-assisted later)
* Establish a conversational front door for the platform

### Explicit Non-Goals (v1)

* No job applications submitted by the agent
* No browser automation
* No external web search
* No resume editing or generation
* No employer communication
* No long-term memory across sessions

---

## 3. Target User Experience

A user can type:

> “I’m a software engineer, can you show me available jobs?”

The agent:

* Understands the role intent
* Retrieves relevant jobs from inmates.ai
* Responds conversationally with summarized results
* Helps the user narrow down options
* Explains how to apply when a job is selected

The experience should feel:

* Natural
* Grounded
* Trustworthy
* Non-magical (no hallucinations)

---

## 4. Canonical User Flow

1. User opens chat interface on inmates.ai
2. User asks for jobs in natural language
3. Agent extracts intent and constraints
4. Agent converts intent into structured query
5. Agent calls internal jobs endpoint/search index
6. Agent receives job results
7. Agent summarizes and presents jobs conversationally
8. User refines request or selects a job
9. Agent provides job details and application guidance
10. User clicks “Apply” (manual or future AI executor)

Terminal state reached.

---

## 5. Functional Requirements

### 5.1 Natural Language Understanding

The agent must extract:

* Job role(s)
* Keywords / skills (if present)
* Job type (remote, full-time, contract, etc.)
* Seniority (only if explicitly stated)
* Location preferences (if stated)

The agent must **not assume** missing attributes.

---

### 5.2 Structured Query Generation

The agent must convert user intent into a structured query that maps directly to inmates.ai job data.

Rules:

* Queries must be deterministic
* Queries must be explainable
* No hidden filters
* No guessing

If intent is too broad:

* Agent may ask clarifying follow-ups (optional UX decision)

---

### 5.3 Job Retrieval

* Agent retrieves jobs **only** via internal endpoints or search indices
* No web browsing
* No scraping
* No hallucinated listings

If no jobs match:

* Agent must say so clearly
* Agent may suggest refinements

---

### 5.4 Job Ranking & Grouping

The agent may:

* Rank jobs by relevance to stated intent
* Group jobs logically (e.g. frontend, backend, full-stack)
* Highlight notable attributes (remote, salary if available, company)

Ranking must be:

* Transparent
* Based on job data only

---

### 5.5 Conversational Response Generation

Responses must:

* Be grounded strictly in retrieved data
* Avoid exaggeration
* Avoid promises
* Avoid invented details

The agent may:

* Summarize results
* Compare roles
* Ask narrowing questions
* Guide next steps

---

### 5.6 Job Detail Explanation

When a user selects a job, the agent must:

* Explain the role requirements
* Highlight important qualifications
* Clarify what the employer is looking for
* Explain the application process at a high level

No resume advice beyond explanation.

---

### 5.7 Application Guidance

The agent may:

* Explain what happens when the user clicks “Apply”
* Set expectations for third-party sites
* Prepare the user for possible steps (forms, questions, signup)

The agent must not:

* Initiate applications
* Fill forms
* Collect credentials

---

## 6. Data Boundaries (Critical)

The agent can access:

* Job listings
* Job metadata
* Job descriptions
* Company names
* Application URLs

The agent cannot access:

* User credentials
* Employer systems
* External job boards
* Application executor state (v1)

---

## 7. Architecture Overview

### 7.1 Agent Type

* Conversational, tool-calling agent
* Session-scoped memory only
* Stateless beyond the active conversation

---

### 7.2 Intelligence Layer

* LLM used for:

  * Intent extraction
  * Query formulation
  * Response synthesis

Constraints:

* Tool calls required for any factual claim about jobs
* No freeform job generation
* No speculation

---

### 7.3 Tooling / Endpoints

Required tools:

* `search_jobs(query)`
* `get_job_details(job_id)`

Optional tools:

* `list_job_categories`
* `list_locations`

All tools return structured data only.

---

### 7.4 Backend Integration

* Jobs sourced exclusively from inmates.ai data pipeline
* Search backed by validated storage (Postgres, OpenSearch, Meilisearch, etc.)
* Results returned with stable identifiers

---

## 8. Tech Stack (Validated)

* Language: **TypeScript**
* Backend: Node.js
* Agent Framework: Lightweight tool-calling agent (LangChain JS acceptable here, LangGraph not required)
* Database: PostgreSQL
* Search: OpenSearch / Meilisearch / Postgres full-text
* LLM: Production-grade model with tool-calling and JSON output support

No deprecated libraries.
No experimental autonomous agents.

---

## 9. Failure Handling

The agent must handle:

* No matching jobs
* Ambiguous user intent
* Empty or incomplete job data
* Backend errors

All failures must be:

* Explained clearly to the user
* Non-technical in wording
* Recoverable via conversation

---

## 10. Security & Trust Constraints

* No external network access
* No hidden actions
* No side effects
* No background execution

The agent must always be explainable.

---

## 11. Success Metrics (v1)

* Users successfully discover relevant jobs
* Reduced reliance on manual filters
* Increased job detail views
* Clear path to application initiation
* Zero hallucinated job listings

---

## 12. Strategic Positioning

This agent is:

* The **entry point** to inmates.ai
* The conversational layer over your job graph
* The foundation for the future AI application executor

It must remain:

* Conservative
* Deterministic
* Trust-preserving

---

## 13. Guiding Principle

If the agent cannot ground a response in retrieved data, it must not say it.

Conversation is the interface.
Truth is the constraint.

---
