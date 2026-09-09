/*!
 * Copyright (c) 2019-2022 Digital Bazaar, Inc. All rights reserved.
 * Copyright (c) 2026 Interop Alliance. All rights reserved.
 */

/**
 * A deterministic did:key Ed25519 invocation signer derived from a seed, or
 * from a secret mixed with a handle. The derivation is a permanent wire
 * convention: the same inputs must reconstitute the same did:key forever, so
 * consumers pin its output in fixtures. Do not change the hashing, the HMAC
 * step, or the id shape.
 */
import { type ISigner, SHA256HMACKey } from '@interop/data-integrity-core'
import { Ed25519VerificationKey } from '@interop/ed25519-verification-key'

const { subtle } = globalThis.crypto
const textEncoder = new TextEncoder()
const textDecoder = new TextDecoder()

export class CapabilityAgent {
  handle: string
  id: string
  signer: ISigner
  // Underlying Ed25519 key pair used for invocation signing. Read it through
  // getVerificationKeyPair() rather than touching this field directly.
  private _keyPair: Ed25519VerificationKey

  /**
   * Wraps an already-derived key pair and its signer. Callers normally use
   * one of the static constructors (`fromSecret`, `fromSeed`) instead of
   * calling this directly.
   *
   * @param options {object}
   * @param options.handle {string} The semantic identifier that was used to
   *   create the key.
   * @param options.signer {ISigner} An API with an `id` property and a
   *   `sign` function.
   * @param options.keyPair {Ed25519VerificationKey} Underlying key pair.
   */
  constructor({
    handle,
    signer,
    keyPair
  }: {
    handle: string
    signer: ISigner
    keyPair: Ed25519VerificationKey
  }) {
    this.handle = handle
    // signer is a did:key
    this.id = signer.id.replace(/#.*$/, '')
    this.signer = signer
    // reference to core key pair used for invocation signing
    this._keyPair = keyPair
  }

  /**
   * Gets a signer API, typically for signing capability invocation or
   * delegation proofs.
   *
   * @returns {object} An API with an `id` property and a `sign` function.
   */
  getSigner(): ISigner {
    return this.signer
  }

  /**
   * Returns the Ed25519 key fields backing this agent's invocation signer,
   * with `controller` set to this agent's did:key id. Exposed so callers can
   * derive related keys -- e.g. the X25519 key agreement key (the Montgomery
   * form of this signing key) used for encrypted storage, via
   * `X25519KeyAgreementKey2020.fromEd25519()` -- without reaching into
   * private internals.
   *
   * @returns {object} The signing key fields. Includes the private key
   *   material; treat the result as sensitive.
   */
  getVerificationKeyPair(): {
    id: string
    type: string
    controller: string
    publicKeyMultibase: string
    privateKeyMultibase: string
  } {
    const { id, type, controller, publicKeyMultibase, privateKeyMultibase } =
      this._keyPair
    if (
      !id ||
      !type ||
      !controller ||
      !publicKeyMultibase ||
      !privateKeyMultibase
    ) {
      throw new Error(
        'CapabilityAgent is missing Ed25519 key material; cannot export ' +
          'verification key pair.'
      )
    }
    return { id, type, controller, publicKeyMultibase, privateKeyMultibase }
  }

  /**
   * Deterministically generates a CapabilityAgent from a secret, a semantic
   * handle to uniquely identify the secret, and a key name. The same secret
   * can be used to generate multiple keys by using different key names.
   *
   * Equivalent to `seedFromSecret()` followed by `fromSeed()`; use those
   * directly to capture the intermediate seed (e.g. to store it wrapped so
   * the same agent can later be reconstituted without the secret).
   *
   * @param options {object}
   * @param options.secret {string|Uint8Array} A secret to use as input when
   *   generating the key, e.g., a bcrypt hash of a password.
   * @param options.handle {string} A semantic identifier for the secret that
   *   is mixed with it to produce a seed. A common use for this field is the
   *   account ID for a user in a system.
   * @param [options.keyName='default'] {string} An optional name to use to
   *   generate the key.
   *
   * @returns {Promise<CapabilityAgent>} The new CapabilityAgent instance.
   */
  static async fromSecret({
    secret,
    handle,
    keyName = 'default'
  }: {
    secret: string | Uint8Array
    handle: string
    keyName?: string
  }): Promise<CapabilityAgent> {
    const seed = await CapabilityAgent.seedFromSecret({ secret, handle })
    return CapabilityAgent.fromSeed({ seed, handle, keyName })
  }

  /**
   * Computes the deterministic seed `fromSecret()` derives its keys from: the
   * SHA-256 hash of the secret mixed with the handle. Exposed so callers can
   * persist the seed (suitably encrypted) and later reconstitute the same
   * agent via `fromSeed()` without the original secret.
   *
   * @param options {object}
   * @param options.secret {string|Uint8Array} A secret to use as input when
   *   generating the key, e.g., a bcrypt hash of a password.
   * @param options.handle {string} A semantic identifier for the secret that
   *   is mixed with it to produce the seed.
   *
   * @returns {Promise<Uint8Array>} The 32-byte seed.
   */
  static async seedFromSecret({
    secret,
    handle
  }: {
    secret: string | Uint8Array
    handle: string
  }): Promise<Uint8Array> {
    _assertHandle(handle)
    // do not pre-encode a string secret here; `_computeSeed` needs the
    // original type to hash binary secrets without a lossy UTF-8 round-trip
    if (typeof secret !== 'string' && !(secret instanceof Uint8Array)) {
      throw new TypeError('"secret" must be a Uint8Array or a string.')
    }

    // compute the SHA-256 hash of handle and secret as the seed for the key
    return _computeSeed({ secret, handle })
  }

  /**
   * Deterministically generates a CapabilityAgent from an already-derived
   * seed (see `seedFromSecret()`), skipping the secret-hashing step: the same
   * seed and key name always reconstitute the same agent, so a stored seed
   * stands in for the original secret. Note the seed enters the derivation
   * as-is -- passing it to `fromSecret()` instead would hash it again and
   * yield a different agent.
   *
   * @param options {object}
   * @param options.seed {Uint8Array} The seed to derive the key from, as
   *   produced by `seedFromSecret()`.
   * @param options.handle {string} The semantic identifier for the secret the
   *   seed was derived from (identifies the agent; it does not affect the
   *   key, which the seed already encodes).
   * @param [options.keyName='default'] {string} An optional name to use to
   *   generate the key.
   *
   * @returns {Promise<CapabilityAgent>} The new CapabilityAgent instance.
   */
  static async fromSeed({
    seed,
    handle,
    keyName = 'default'
  }: {
    seed: Uint8Array
    handle: string
    keyName?: string
  }): Promise<CapabilityAgent> {
    _assertHandle(handle)
    if (!(seed instanceof Uint8Array) || seed.length === 0) {
      throw new TypeError('"seed" must be a non-empty Uint8Array.')
    }

    const { signer, keyPair } = await _keyFromSeedAndName({ seed, keyName })
    return new CapabilityAgent({ handle, signer, keyPair })
  }
}

function _assertHandle(handle: unknown): asserts handle is string {
  if (typeof handle !== 'string') {
    throw new TypeError('"handle" must be a string.')
  }
}

async function _computeSeed({
  secret,
  handle
}: {
  secret: string | Uint8Array
  handle: string
}): Promise<Uint8Array> {
  // compute SHA-256 hash of the handle-prefixed secret
  let toHash: Uint8Array
  if (typeof secret === 'string') {
    // the UTF-8 round-trip replaces lone surrogates with U+FFFD so that
    // `encodeURIComponent` cannot throw; it is part of the pinned derivation
    secret = textDecoder.decode(textEncoder.encode(secret))
    toHash = textEncoder.encode(
      `${encodeURIComponent(handle)}:${encodeURIComponent(secret)}`
    )
  } else {
    // hash the raw secret bytes directly to avoid a lossy UTF-8 round-trip that
    // would collapse distinct binary secrets to the same seed; encodeURIComponent
    // percent-encodes ':' so the encoded handle prefix is an unambiguous
    // separator
    const prefix = textEncoder.encode(`${encodeURIComponent(handle)}:`)
    toHash = new Uint8Array(prefix.length + secret.length)
    toHash.set(prefix)
    toHash.set(secret, prefix.length)
  }
  const algorithm = { name: 'SHA-256' }
  return new Uint8Array(
    await subtle.digest(algorithm, toHash as Uint8Array<ArrayBuffer>)
  )
}

async function _keyFromSeedAndName({
  seed,
  keyName
}: {
  seed: Uint8Array
  keyName: string
}): Promise<{ signer: ISigner; keyPair: Ed25519VerificationKey }> {
  // HMAC-SHA-256 of the key name under the seed; the key id is ephemeral
  const hmacKey = await SHA256HMACKey.fromSecret({ id: keyName, secret: seed })
  const signature = await hmacKey.sign({ data: textEncoder.encode(keyName) })
  // generate Ed25519 key from HMAC signature
  const keyPair = await Ed25519VerificationKey.generate({ seed: signature })

  // specify controller and ID for key using fingerprint; must be set before
  // `signer()`
  const fingerprint = keyPair.fingerprint()
  keyPair.controller = `did:key:${fingerprint}`
  keyPair.id = `${keyPair.controller}#${fingerprint}`

  // create signer for the key (includes the key's `id`, set above)
  const signer = keyPair.signer()
  return { signer, keyPair }
}
