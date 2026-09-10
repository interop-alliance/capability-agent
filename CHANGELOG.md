# @interop/capability-agent Changelog

## 0.2.0 - 2026-09-10

### Changed

- Bumped `@interop/ed25519-verification-key` to `^8.2.0`.
- The invocation signer is now derived via the key pair's `didKeySigner()`
  instead of `signer()`. Output is unchanged.

## 0.1.1 - 2026-09-09

### Fixed

- `getVerificationKeyPair()` now throws when the key pair lacks a private key
  instead of returning a descriptor with `privateKeyMultibase: undefined`.
- `secret` is typed as required on `fromSecret()` and `seedFromSecret()`,
  matching the runtime check. The JSDoc no longer refers to a nonexistent
  `cache` option.

### Changed

- The key-name HMAC step uses `SHA256HMACKey` from
  `@interop/data-integrity-core` instead of a local WebCrypto call. Derivation
  output is unchanged.
- Derived key pairs carry `controller` (the agent's did:key) alongside `id`.
- `getVerificationKeyPair()` returns the key fields (`id`, `type`, `controller`,
  `publicKeyMultibase`, `privateKeyMultibase`) as a plain object instead of
  going through the VerificationKey2020 exporter. The shape is unchanged; the
  return type is inlined and the `VerificationKeyDescriptor` export is gone.

### Removed

- The `VerificationKeyDescriptor` type export. Use the inferred return type of
  `getVerificationKeyPair()`.

## 0.1.0 - 2026-09-09

### Added

- Initial release. `CapabilityAgent` and the `VerificationKeyDescriptor` type,
  extracted verbatim from `@interop/webkms-client@14.7.5` so libraries that only
  need a seed-to-did:key signer no longer depend on the KMS client. The
  derivation is byte-identical; the golden fixtures moved with it.

### Removed

- The `fromBiometric` and `fromFido` stubs, which only threw "Not implemented".
