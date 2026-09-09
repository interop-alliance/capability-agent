# @interop/capability-agent Changelog

## 0.1.1 - TBD

### Fixed

- `getVerificationKeyPair()` now throws when the key pair lacks a private key
  instead of returning a descriptor with `privateKeyMultibase: undefined`;
  `VerificationKeyDescriptor` declares that field as required.
- `secret` is typed as required on `fromSecret()` and `seedFromSecret()`,
  matching the runtime check. The JSDoc no longer refers to a nonexistent
  `cache` option.

### Changed

- The key-name HMAC step uses `SHA256HMACKey` from
  `@interop/data-integrity-core` instead of a local WebCrypto call. Derivation
  output is unchanged.
- Derived key pairs carry `controller` (the agent's did:key) alongside `id`.

## 0.1.0 - 2026-09-09

### Added

- Initial release. `CapabilityAgent` and the `VerificationKeyDescriptor` type,
  extracted verbatim from `@interop/webkms-client@14.7.5` so libraries that only
  need a seed-to-did:key signer no longer depend on the KMS client. The
  derivation is byte-identical; the golden fixtures moved with it.

### Removed

- The `fromBiometric` and `fromFido` stubs, which only threw "Not implemented".
