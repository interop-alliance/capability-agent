# @interop/capability-agent Changelog

## 0.1.0 - 2026-09-09

### Added

- Initial release. `CapabilityAgent` and the `VerificationKeyDescriptor` type,
  extracted verbatim from `@interop/webkms-client@14.7.5` so libraries that only
  need a seed-to-did:key signer no longer depend on the KMS client. The
  derivation is byte-identical; the golden fixtures moved with it.

### Removed

- The `fromBiometric` and `fromFido` stubs, which only threw "Not implemented".
