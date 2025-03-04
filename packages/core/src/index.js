'use strict'

const EventEmitter = require('events')
const JSONB = require('json-buffer')

class Keyv extends EventEmitter {
  constructor ({ emitErrors = true, ...options } = {}) {
    super()

    const normalizedOptions = Object.assign(
      {
        namespace: 'keyv',
        serialize: JSONB.stringify,
        deserialize: JSONB.parse,
        emitErrors: true,
        store: new Map()
      },
      options
    )

    Object.keys(normalizedOptions).forEach(
      key => (this[key] = normalizedOptions[key])
    )

    this.store.namespace = this.namespace

    if (typeof this.store.on === 'function' && emitErrors) {
      this.store.on('error', error => this.emit('error', error))
    }

    const generateIterator = iterator =>
      async function * () {
        for await (const [key, raw] of typeof iterator === 'function'
          ? iterator()
          : iterator) {
          const data = typeof raw === 'string' ? this.deserialize(raw) : raw
          if (!key.includes(this.namespace) || typeof data !== 'object') {
            continue
          }

          if (typeof data.expires === 'number' && Date.now() > data.expires) {
            this.delete(key)
            continue
          }

          yield [this._getKeyUnprefix(key), data.value]
        }
      }

    // Attach iterators
    if (
      typeof this.store[Symbol.iterator] === 'function' &&
      this.store instanceof Map
    ) {
      this.iterator = generateIterator(this.store)
    } else if (typeof this.store.iterator === 'function') {
      this.iterator = generateIterator(this.store.iterator.bind(this.store))
    } else {
      this.iteratorSupport = false
    }
  }

  _getKeyPrefix (key) {
    return this.namespace ? `${this.namespace}:${key}` : key
  }

  _getKeyUnprefix (key) {
    return this.namespace
      ? key
          .split(':')
          .splice(1)
          .join(':')
      : key
  }

  async get (key, { raw: asRaw = false } = {}) {
    const raw = await this.store.get(this._getKeyPrefix(key))
    if (raw === undefined) return undefined

    const data = typeof raw === 'string' ? await this.deserialize(raw) : raw

    if (typeof data.expires === 'number' && Date.now() > data.expires) {
      this.delete(key)
      return undefined
    }

    return asRaw ? data : data.value
  }

  async has (key) {
    return typeof this.store.has === 'function'
      ? this.store.has(this._getKeyPrefix(key))
      : (await this.store.get(this._getKeyPrefix(key))) !== undefined
  }

  async set (key, value, ttl) {
    if (value === undefined) return false
    if (ttl === undefined) ttl = this.ttl
    if (ttl === 0) ttl = undefined
    const expires = typeof ttl === 'number' ? Date.now() + ttl : null
    const valueSerialized = await this.serialize({ value, expires })
    await this.store.set(this._getKeyPrefix(key), valueSerialized, ttl)
    return true
  }

  async delete (key) {
    return this.store.delete(this._getKeyPrefix(key))
  }

  async clear () {
    if (!this.namespace) return undefined
    return this.store.clear()
  }
}
module.exports = Keyv
