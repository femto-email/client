let test = require('ava').test

test('foo', t => {
  t.pass()
})

test('bar', async t => {
  const bar = Promise.resolve(new Promise((resolve, reject) => {
    setTimeout(() => {
      resolve('bar')
    }, 2000)
  }))

  t.is(await bar, 'bar')
})

test.todo('we really should add some tests...')