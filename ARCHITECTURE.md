# Architecture

The current shape of this library, with the rationale inline: why each part is
shaped the way it is, stated where the shape is described. This file is kept
current in the same change set that alters the shape; it overwrites in place and
records no history. History lives elsewhere: CHANGELOG.md for what landed,
`decisions/` for durable decisions with their rejected alternatives and revisit
criteria, and the archived roadmap for the work items. Reference decision
records from here where the resulting shape is described, instead of re-arguing
them.

Several conventions lean on this file, so keep it accurate and current: the
design gate defines a cross-cutting item as one touching an invariant documented
here, a `touches:` entry names this file as a deliverable in its own right, and
the breaking-release audit checks its statements against the code.

## Layer map

The module tour: what lives where, and the dependency direction between the
parts. One line per module or directory is enough while the library is small.

```
src/index.ts             Public entry point (the export map's only door)
src/CapabilityAgent.ts   The CapabilityAgent class and its private
                         derivation helpers (seed hashing, HMAC key
                         derivation)
```

Dependencies point outward only: `@interop/ed25519-verification-key` for the key
pair, `@interop/data-integrity-core` for the shared signer and key descriptor
types, and `globalThis.crypto.subtle` for SHA-256 and HMAC. There is no
dependency on any KMS or HTTP layer; `@interop/webkms-client` depends on this
package, not the other way round.

## Invariants

The rules the code upholds that a reader cannot infer from any one call site,
numbered so items and reviews can cite them. Each entry states the rule, why it
holds, and the code that upholds it. This list is what the design gate's
invariant inventory walks; an undocumented invariant is unprotected by the gate.

1. The derivation is byte-stable. `seedFromSecret` hashes
   `encodeURIComponent(handle):encodeURIComponent(secret)` (string secrets) or
   the encoded handle prefix followed by the raw secret bytes (binary secrets)
   with SHA-256; `fromSeed` uses HMAC-SHA-256 of `keyName` keyed by the seed as
   the Ed25519 seed; the key id is `did:key:<fp>#<fp>`. Why: wallets rebuild
   long-lived identities from stored seeds, and downstream repos (was-client,
   wallet-core, wallet-request, freewallet) pin the resulting did:keys in
   fixtures. Upheld by the golden values in `test/node/CapabilityAgent.test.ts`.
2. `fromSeed` and `fromSecret` are not interchangeable. Feeding a seed to
   `fromSecret` hashes it again and yields a different agent. Why: a stored seed
   must stand in for the secret exactly. Upheld by the "does NOT equal" test in
   the same suite.

## Ownership heuristics

This repo owns one thing: turning a seed into a did:key signer. Ed25519 key
generation, fingerprints, and export formats belong to
`@interop/ed25519-verification-key`. KMS-backed keys, keystores, and HTTP
signing belong to `@interop/webkms-client`. Signing zcap invocations with the
resulting signer belongs to `@interop/ezcap`. Encoding primitives come from
`@scure/base` if ever needed; nothing is re-derived here.

## Glossary

The repo's domain vocabulary: one canonical term per concept, used the same way
in code, tests, docs, commit messages, and conversation. This is the bounded
context's ubiquitous language in the domain-driven-design sense. A repo is one
bounded context; when a term carries a different meaning in a neighbouring repo,
the entry says so and points at that repo's glossary.

One bullet per term. Lead with what the term is, in one or two sentences; say
where it lives if that helps the reader find it; leave how it works to the
section that describes the mechanism and link there. Close the entry with
`Avoid:` and the synonyms the repo does not use, whenever a plausible synonym
exists. That list is what lets a reviewer, or an agent, challenge a term that
drifts. General programming concepts do not belong here; only concepts specific
to this repo's domain.

- **CapabilityAgent** -- a did:key Ed25519 identity plus the signer used for
  zcap invocation and delegation proofs, derived deterministically from a seed.
  Lives in `src/CapabilityAgent.ts`. Avoid: KMS agent, controller key.
- **handle** -- the semantic identifier (an account id, for example) mixed into
  the secret as a salt by `seedFromSecret`, and carried on the agent for
  identification. It does not affect `fromSeed`. Avoid: salt, account.
- **seed** -- the 32-byte SHA-256 output of `seedFromSecret`, the value a wallet
  stores (encrypted) to rebuild the agent without the secret. Avoid: secret, key
  material.
- **keyName** -- the HMAC message that lets one seed yield several distinct
  agents. Defaults to `default`. Avoid: key id, purpose.

## Current State labels

Everything above is current. There is no transitional structure.
