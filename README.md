# Capability Agent _(@interop/capability-agent)_

[![Node.js CI](https://github.com/interop-alliance/capability-agent/workflows/CI/badge.svg)](https://github.com/interop-alliance/capability-agent/actions?query=workflow%3A%22CI%22)
[![NPM Version](https://img.shields.io/npm/v/@interop/capability-agent.svg)](https://npm.im/@interop/capability-agent)

> A deterministic did:key Ed25519 invocation signer, derived from a seed or a
> salted secret. For the browser, Node.js, and React Native.

## Table of Contents

- [Background](#background)
- [Security](#security)
- [Install](#install)
- [Usage](#usage)
- [Contribute](#contribute)
- [License](#license)

## Background

A `CapabilityAgent` turns a secret (or an already-derived 32-byte seed) into a
did:key identity with a signer suitable for signing zcap invocation and
delegation proofs. The same inputs always reconstitute the same did:key, which
is what lets a wallet rebuild its identity from a stored seed.

The class was extracted from
[`@interop/webkms-client`](https://github.com/interop-alliance/webkms-client),
which now depends on this package instead of shipping the class. It has no
dependency on a KMS: a library that only needs a seed-to-did:key signer depends
on this package alone.

The derivation:

1. `seedFromSecret`: SHA-256 over
   `encodeURIComponent(handle) + ':' + encodeURIComponent(secret)` (string
   secrets) or over the encoded handle prefix followed by the raw secret bytes
   (binary secrets).
2. `fromSeed`: HMAC-SHA-256 of `keyName` keyed by the seed, used as the Ed25519
   seed. The key id is `did:key:<fingerprint>#<fingerprint>`.

This derivation is a permanent convention. Consumers pin its output in fixtures;
do not change it.

## Security

The agent holds Ed25519 private key material in memory.
`getVerificationKeyPair()` exports it, including the private key, so treat the
result as sensitive.

## Install

- Node.js 24+ is recommended.

### PNPM

To install via PNPM:

```
pnpm install @interop/capability-agent
```

### Development

To install locally (for development):

```
git clone https://github.com/interop-alliance/capability-agent.git
cd capability-agent
pnpm install
```

## Usage

```ts
import { CapabilityAgent } from '@interop/capability-agent'

// From a secret salted with a handle (an account id, for example):
const agent = await CapabilityAgent.fromSecret({
  secret: 'correct horse battery staple',
  handle: 'urn:example:alice'
})
agent.id // did:key:z6Mk...
agent.getSigner() // { id, sign } for zcap invocation proofs

// Or capture the seed so the agent can be rebuilt without the secret:
const seed = await CapabilityAgent.seedFromSecret({ secret, handle })
const same = await CapabilityAgent.fromSeed({ seed, handle })

// Derive sibling keys from one seed with a key name:
const signing = await CapabilityAgent.fromSeed({
  seed,
  handle,
  keyName: 'signing'
})

// The backing key pair, e.g. to derive an X25519 key agreement key:
const keyPair = agent.getVerificationKeyPair()
```

## Contribute

PRs accepted. See [CONTRIBUTING.md](CONTRIBUTING.md) for editor setup (Prettier,
ESLint, and EditorConfig) and how it maps to CI.

If editing the Readme, please conform to the
[standard-readme](https://github.com/RichardLitt/standard-readme) specification.

## License

[BSD-3-Clause](LICENSE) Copyright 2019-2025 Digital Bazaar, Inc.; 2026 Interop
Alliance.
