'use strict'

const keyvTestSuite = require('@keyvhq/test-suite')
const tk = require('timekeeper')
const test = require('ava')

const Keyv = require('..')

test.serial('Keyv is a class', t => {
  t.is(typeof Keyv, 'function')
  t.throws(() => Keyv()) // eslint-disable-line new-cap
  t.notThrows(() => new Keyv())
})

test.serial('Keyv accepts storage adapters', async t => {
  const store = new Map()
  const keyv = new Keyv({ store })
  t.is(store.size, 0)
  await keyv.set('foo', 'bar')
  t.is(await keyv.get('foo'), 'bar')
  t.is(store.size, 1)
})

test.serial('Keyv passes tll info to stores', async t => {
  t.plan(1)
  const store = new Map()
  const storeSet = store.set
  store.set = (key, value, ttl) => {
    t.is(ttl, 100)
    storeSet.call(store, key, value, ttl)
  }

  const keyv = new Keyv({ store })
  await keyv.set('foo', 'bar', 100)
})

test.serial('Keyv respects default tll option', async t => {
  const store = new Map()
  const keyv = new Keyv({ store, ttl: 100 })
  await keyv.set('foo', 'bar')
  t.is(await keyv.get('foo'), 'bar')
  tk.freeze(Date.now() + 150)
  t.is(await keyv.get('foo'), undefined)
  t.is(store.size, 0)
  tk.reset()
})

test.serial('.set(key, value, ttl) overwrites default tll option', async t => {
  const startTime = Date.now()
  tk.freeze(startTime)
  const store = new Map()
  const keyv = new Keyv({ store, ttl: 200 })
  await keyv.set('foo', 'bar')
  await keyv.set('fizz', 'buzz', 100)
  await keyv.set('ping', 'pong', 300)
  t.is(await keyv.get('foo'), 'bar')
  t.is(await keyv.get('fizz'), 'buzz')
  t.is(await keyv.get('ping'), 'pong')
  tk.freeze(startTime + 150)
  t.is(await keyv.get('foo'), 'bar')
  t.is(await keyv.get('fizz'), undefined)
  t.is(await keyv.get('ping'), 'pong')
  tk.freeze(startTime + 250)
  t.is(await keyv.get('foo'), undefined)
  t.is(await keyv.get('ping'), 'pong')
  tk.freeze(startTime + 350)
  t.is(await keyv.get('ping'), undefined)
  tk.reset()
})

test.serial(
  '.set(key, value, ttl) where ttl is "0" overwrites default tll option and sets key to never expire',
  async t => {
    const startTime = Date.now()
    tk.freeze(startTime)
    const store = new Map()
    const keyv = new Keyv({ store, ttl: 200 })
    await keyv.set('foo', 'bar', 0)
    t.is(await keyv.get('foo'), 'bar')
    tk.freeze(startTime + 250)
    t.is(await keyv.get('foo'), 'bar')
    tk.reset()
  }
)

test.serial(
  '.get(key, {raw: true}) returns the raw object instead of the value',
  async t => {
    const store = new Map()
    const keyv = new Keyv({ store })
    await keyv.set('foo', 'bar')
    const value = await keyv.get('foo')
    const rawObject = await keyv.get('foo', { raw: true })
    t.is(value, 'bar')
    t.is(rawObject.value, 'bar')
  }
)

test.serial(
  'Keyv uses custom serializer when provided instead of json-buffer',
  async t => {
    t.plan(3)
    const store = new Map()
    const serialize = data => {
      t.pass()
      return JSON.stringify(data)
    }

    const deserialize = data => {
      t.pass()
      return JSON.parse(data)
    }

    const keyv = new Keyv({ store, serialize, deserialize })
    await keyv.set('foo', 'bar')
    t.is(await keyv.get('foo'), 'bar')
  }
)

test.serial('Keyv supports async serializer/deserializer', async t => {
  t.plan(3)
  const store = new Map()

  const serialize = async data => {
    t.pass()
    return JSON.stringify(data)
  }

  const deserialize = async data => {
    t.pass()
    return JSON.parse(data)
  }

  const keyv = new Keyv({ store, serialize, deserialize })
  await keyv.set('foo', 'bar')
  t.is(await keyv.get('foo'), 'bar')
})

test.serial('Keyv uses a default namespace', async t => {
  const store = new Map()
  const keyv = new Keyv({ store })
  await keyv.set('foo', 'bar')
  t.is([...store.keys()][0], 'keyv:foo')
})

test.serial('Default namespace can be overridden', async t => {
  const store = new Map()
  const keyv = new Keyv({ store, namespace: 'magic' })
  await keyv.set('foo', 'bar')
  t.is([...store.keys()][0], 'magic:foo')
})

test.serial('An empty namespace stores the key as-is', async t => {
  const store = new Map()
  const keyv = new Keyv({ store, namespace: '' })
  await keyv.set(42, 'foo')
  t.is([...store.keys()][0], 42)
})

test('emit errors by default', async t => {
  const store = new Keyv()
  const keyv = new Keyv({ store, namespace: '' })
  await keyv.set(42, 'foo')
  t.is(store.listenerCount('error'), 1)
})

test('disable emit errors', async t => {
  const store = new Keyv({ emitErrors: false })
  const keyv = new Keyv({ store, emitErrors: false, namespace: '' })
  await keyv.set(42, 'foo')
  t.is(keyv.listenerCount('error'), 0)
})

const store = () => new Map()
keyvTestSuite(test, Keyv, store)
