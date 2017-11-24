const Pool = require('./Pool')
const Grabber = require('./Grabber')
const Storage = require('./Storage')

class Mailer {
  constructor() {
    this.pool = new Pool()

    this.job({
      'init': this.init
    })
  }

  job(jobs) {
    this.pool.job(jobs)
  }

  async init(worker, user, job) {
    // Grab all headers for a box.
    await worker.open(job.data.box)

    if (worker.box.messages.total) {
      await worker.read(job.data.box, '1:*', Grabber.HEADERS, (headers) => {
        // Storage.mail.save(user, headers)
      })
    }
  }
}

;(async () => {
  const mailer = new Mailer()

  mailer.pool.init('popey@debenclipper.com', 'BEcBx9kVVqbH38cd', 'just94.justhost.com', 993, true)

  await mailer.pool.add('popey@debenclipper.com', {
    name: 'init',
    data: {
      box: 'INBOX',
    }
  })
  
  mailer.pool.close('popey@debenclipper.com')
})()