import { Application } from 'spectron'
import electronBin     from 'electron-bin-path'
import test            from 'ava'
let path = require('path')

test.beforeEach(t => {
  return electronBin().then(p => {
    t.context.app = new Application({
      args: [path.join(__dirname, '..', 'index.js')],
      path: p
    })

    return t.context.app.start()
  })
})

test.afterEach(t => {
  return t.context.app.stop()
})

test('Ensure application window opens and is visible.', async t => {
  const app = t.context.app
  await app.client.waitUntilWindowLoaded()
  const win = app.browserWindow

  t.is(await app.client.getWindowCount(), 2)
  t.false(await win.isMinimized())
  t.true(await win.isDevToolsOpened())
  t.true(await win.isVisible())
  t.true(await win.isFocused())

  const {width, height} = await win.getBounds()
  t.true(width > 0)
  t.true(height > 0)
})

// test('Determine values of input', async t => {
//   const app = t.context.app

//   await app.client.waitUntilWindowLoaded()
//   t.is('some_value', await app.client.getValue('#form input[name=some_name]'))
// })