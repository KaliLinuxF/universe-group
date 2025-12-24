# Event Processing Backend (Node.js · NATS · PostgreSQL)

## Overview

This project implements an event-driven backend system for ingesting, processing, storing, and analyzing high-throughput marketing events.

The system receives events via HTTP webhooks, forwards them asynchronously through NATS JetStream, persists them in PostgreSQL, and exposes analytical APIs for reporting and insights.

The solution is implemented as a modular monolith with clear asynchronous boundaries and is designed to demonstrate production-oriented engineering judgment rather than architectural overcomplexity.

## Architecture

### High-level flow

Publisher → HTTP Webhook → NATS JetStream → Event Consumer → PostgreSQL → Analytics API

### Key components

**Webhook layer**

- Accepts incoming events via HTTP
- Performs validation
- Publishes events to NATS
- No business logic or persistence

**Message broker**

- NATS JetStream used for reliable, asynchronous delivery
- At-least-once semantics
- Handles bursts, retries, and backpressure

**Event consumer**

- Pull-based JetStream consumer
- Batch processing
- Explicit acknowledgements
- Idempotent persistence

**Persistence**

- PostgreSQL
- Raw event storage in a unified events table
- Unique constraint on eventId for deduplication

**Analytics**

- Read-side analytics using SQL over JSONB
- Aggregations, funnel analysis, geo breakdowns

**Observability**

- Prometheus metrics
- Health checks
- Graceful shutdown

## Why a Modular Monolith

The solution is intentionally implemented as a modular monolith:

- Reduces operational complexity
- Faster to reason about and review
- Clear separation of concerns via modules
- Asynchronous boundaries already exist via NATS

NATS is used here as an internal async boundary, not as a microservices transport layer.
The architecture can be split into separate services later if required without changing core contracts.

## Event Ingestion & Delivery Semantics

Events are published to NATS JetStream

Consumer uses:

- Explicit ACKs
- Limited in-flight messages (max_ack_pending)
- Retry on failure (nak)

Delivery semantics: at-least-once

Duplicate events are expected and handled via:

- Unique index on eventId
- Graceful duplicate handling in consumer

Out-of-order events are tolerated by design.

## Persistence Strategy

All events are stored in a single events table:

- source
- funnelStage
- eventType
- timestamp
- data (JSONB)

This keeps ingestion simple and flexible

Analytical complexity is intentionally moved to the read side

## Analytics & Reporting

The system exposes analytical APIs including:

- Overall event statistics
- Time series of events
- Funnel analysis (top → bottom conversion)
- Country-level breakdowns
- Top campaigns and users
- Revenue aggregation

Analytics queries are implemented using raw SQL over JSONB for clarity and performance.

## Scalability

The system is horizontally scalable:

- Multiple application instances can run concurrently
- All instances can share the same JetStream durable consumer
- JetStream handles load distribution and message durability

Scaling does not require architectural changes, only additional instances.

## Observability

Prometheus metrics for:

- Received, processed, failed, duplicate events
- Consumer lag and in-flight messages

Health endpoints for liveness/readiness

Graceful shutdown with consumer drain

## Running the Project

The full infrastructure can be started with a single command:

```bash
docker-compose up
```

This starts:

- API service
- NATS JetStream
- PostgreSQL
- Event publisher (for load testing)

## Notes

The provided publisher may occasionally fail with network errors under burst load.
This is expected and does not indicate issues in the backend.

In a production setup, retries and backoff would be expected on the producer side.

## Summary

This project focuses on:

- Reliability over complexity
- Clear async boundaries
- Practical trade-offs
- Production-oriented design

The goal is to demonstrate sound engineering judgment rather than maximal architecture.
