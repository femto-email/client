const Grabber = require('./Grabber')

class Pool {
  constructor() {
    // { available, current, max }
    this.accounts = {}
    this.jobs = {}
  }

  init(user, password, host, port, tls) {
    this.accounts[user] = {
      queue: [],
      available: [],
      current: 0,
      max: 2,
      details: [user, password, host, port, tls]
    }
  }

  job(jobs) {
    Object.assign(this.jobs, jobs)
  }

  async close(user) {
    let promises = []

    this.accounts[user].available.forEach((grabber) => {
      promises.push(grabber.close())
    })

    this.accounts[user] = {
      closed: true
    }

    return promises
  }

  async enact(worker, user, job) {
    if (job.name in this.jobs) {
      await this.jobs[job.name](worker, user, job)

      if (this.accounts[user].closed) {
        worker.close()
        return
      }
    } else {
      console.log(`Unknown job, ${job.name}`)
    }

    this.accounts[user].available.push(worker)
  }

  async add(user, action, force = false) {
    if (this.accounts[user].available.length) {
      // WE HAVE A WORKER AVAILBLE
      this.enact(this.accounts[user].available.shift(), user, action)
      return
    }

    if (this.accounts[user].current < this.accounts[user].max) {
      const worker = new Grabber(...this.accounts[user].details)
      await worker.init()
      this.enact(worker, user, action)
    }

    if (force) {
      this.accounts[user].queue.unshift(action)
      return
    }
    
    this.accounts[user].queue.push(action)
  }
}

module.exports = Pool