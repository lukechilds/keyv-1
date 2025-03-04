'use strict'

const keyvTestSuite = require('@keyvhq/test-suite')
const Keyv = require('@keyvhq/core')
const test = require('ava')

const KeyvMongo = require('..')

const mongoURL = process.env.MONGO_URL || 'mongodb://127.0.0.1:27017'
const store = () => new KeyvMongo(mongoURL)
keyvTestSuite(test, Keyv, store)

test('Collection option merges into default options', t => {
  const store = new KeyvMongo({ collection: 'foo' })
  t.deepEqual(store.options, {
    url: 'mongodb://127.0.0.1:27017',
    mongoOptions: {
      useNewUrlParser: true,
      useUnifiedTopology: true
    },
    collection: 'foo',
    emitErrors: true
  })
})

test('Collection option merges into default options if URL is passed', t => {
  const store = new KeyvMongo(mongoURL, { collection: 'foo' })
  t.deepEqual(store.options, {
    url: mongoURL,
    mongoOptions: {
      useNewUrlParser: true,
      useUnifiedTopology: true
    },
    collection: 'foo',
    emitErrors: true
  })
})
