import test from 'ava';
import Keyv from 'keyv';
import keyvTestSuite, { keyvOfficialTests } from 'this';

keyvOfficialTests(test, Keyv, 'redis://localhost', 'redis://foo');

const store = () => new Map();
keyvTestSuite(test, Keyv, store);
