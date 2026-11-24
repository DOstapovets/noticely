import { expect, test } from 'claude-code/testing'

import { newer } from './update'

test('versions are compared part by part, as numbers', () => {
  expect(newer('0.28.0', '0.27.0')).toBe(true)
  expect(newer('0.10.0', '0.9.0')).toBe(true)
  expect(newer('1.0.0', '0.99.99')).toBe(true)
  expect(newer('0.27.0', '0.27.0')).toBe(false)
  expect(newer('0.27.0', '0.28.0')).toBe(false)
  // What is not a release is never offered.
  expect(newer('0.28.0-beta', '0.27.0')).toBe(false)
})
