const { performance } = require('perf_hooks')
const { createHash } = require('crypto')

class Application {
  constructor (gossip, dandelion, report, id, database, threephase) {
    this.gossip = gossip
    this.dandelion = dandelion
    this.report = report
    this.id = id
    this.database = database
    this.threephase = threephase
    this.router = []
    this.times = { events: {} }
    this.results = {}
    this.route('start', async (msg) => {
      this.times.start = performance.now()
      this.inputs = msg
      await this.run()
      this.times.end = performance.now()
      this.finish()
    })
    this.collect = {}
    this.receiver = {}
    this.perfect = true
  }

  async input () {
    const input = Math.random()
    return input
  }

  async step (event, func, prefix) {
    this.times.events[prefix + '::' + event] = { type: prefix, start: performance.now() }
    await func()
    this.times.events[prefix + '::' + event].end = performance.now()
  }

  finish () {
    this.report({ id: this.id, times: this.times, results: this.results })
  }

  async assert (result, value) {
    this.perfect = this.perfect && value
    this.results['assert::perfect'] = (this.perfect ? 'true' : 'false')
    this.results['assert::' + result] = (value ? 'true' : 'false')
  }

  async record (result, data, prefix = 'compute') {
    let value = data
    if (Array.isArray(data)) {
      data.sort()
      const str = JSON.stringify(data)
      value = 'n=' + data.length + ',hash=' + createHash('sha256').update(str, 'utf8').digest('hex')
    } else if (typeof data === 'object') {
      value = Object.entries(data)
      value.sort()
      const str = JSON.stringify(value)
      value = 'n=' + value.length + ',hash=' + createHash('sha256').update(str, 'utf8').digest('hex')
    }
    this.results[prefix + '::' + result] = value
  }

  udeliver (id, hash, route) {
    if (this.collect[route] === undefined) this.collect[route] = { ids: new Set(), hashes: new Set() }

    this.collect[route].ids.add(id)
    this.collect[route].hashes.add(hash)

    if (this.collect[route].ids.size === this.total && this.receiver[route] !== undefined) {
      const collection = []
      this.collect[route].hashes.forEach((hash) => {
        collection.push(this.database.get(hash).data)
      })
      this.collect[route] = collection
      this.receiver[route]()
    }
  }

  deliver (message) {
    if (this.router[message.route] !== undefined) {
      this.router[message.route](message.data)
    } else {
      if (this.collect[message.route] === undefined) this.collect[message.route] = []
      this.collect[message.route].push(message.data)
      if (this.collect[message.route].length === this.total && this.receiver[message.route] !== undefined) {
        this.receiver[message.route]()
      }
    }
  }

  route (route, func) {
    this.router[route] = func
  }

  async threePhaseBroadcast (route, data) {
    await this.step(route, async () => {
      this.threephase({ route: route, data: data })
    }, 'broadcast/three-phase')
  }

  async openBroadcast (route, data) {
    await this.step(route, async () => {
      // data.from = this.id
      this.gossip({ route: route, data: data })
    }, 'broadcast/open')
  }

  async covertBroadcast (route, data) {
    await this.step(route, async () => {
      this.dandelion({ route: route, data: data })
    }, 'broadcast/covert')
  }

  receiveAll (route) {
    return new Promise((resolve, reject) => {
      this.times.events['receive::' + route] = { type: 'receive', start: performance.now() }
      if (this.collect[route] !== undefined && this.collect[route].length === this.total) {
        resolve(this.collect[route])
        this.times.events['receive::' + route].end = performance.now()
      } else {
        this.receiver[route] = () => {
          resolve(this.collect[route])
          this.times.events['receive::' + route].end = performance.now()
        }
      }
    })
  }

  computeStep (event, func) {
    return this.step(event, func, 'compute')
  }

  async run () {
    // await this.computeStep('log1', async () => {
    //   console.log('app starting!')
    // })

    await this.openBroadcast('hello!', { hello: 'world' })
    const hello = await this.receiveAll('hello!')
    //
    // await this.computeStep('log2', async () => {
    //   console.log('app midpoint!')
    // })
    //
    // await this.covertBroadcast('hidden!', { hello: 'hidden' })
    //
    // const hidden = await this.receiveAll('hidden!')
    //
    // await this.computeStep('log3', async () => {
    //   console.log('app midpoint 2!')
    // })
    //
    // await this.threePhaseBroadcast('threephase!', { hello: 'threephase' })
    //
    // const threephase = await this.receiveAll('threephase!')
    //
    // await this.computeStep('log4', async () => {
    //   console.log('app ending!')
    // })
    //
    // await this.record('hellos', hello)
    // await this.record('hiddens', hidden)
    // await this.record('threephases', threephase)
    // await this.record('inputs', this.inputs)
  }
}

module.exports = Application
