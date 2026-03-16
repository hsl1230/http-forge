# Flows

Flows are scripted sequences of requests for multi-step scenarios.

## When to use
- Multi-step authentication
- Setup/teardown sequences
- Data dependencies across requests

## Storage
Flows live under `storage.root/flows`.

## Execution
Use the CLI/standalone runner or integrated tools to run flows and inspect results in `storage.results`.

## Example
Flow: login → create resource → verify resource → logout.
