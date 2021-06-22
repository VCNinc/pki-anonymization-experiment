const { performance } = require('perf_hooks')

class Application {
  constructor (gossip, dandelion, report, id) {
    this.gossip = gossip
    this.dandelion = dandelion
    this.report = report
    this.id = id
    this.router = []
    this.times = { events: {} }
    this.results = {}
    this.route('start', async (msg) => {
      this.times.start = performance.now()
      await this.run()
      this.times.end = performance.now()
      this.finish()
    })
    this.collect = {}
    this.receiver = {}
  }

  async step (event, func, prefix) {
    this.times.events[prefix + '::' + event] = { type: prefix, start: performance.now() }
    await func()
    this.times.events[prefix + '::' + event].end = performance.now()
  }

  finish () {
    this.report({ id: this.id, times: this.times, results: this.results })
  }

  async record (result, data, prefix = 'compute') {
    this.results[prefix + '::' + result] = data
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

  async openBroadcast (route, data) {
    await this.step(route, async () => {
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
    await this.computeStep('log1', async () => {
      console.log('app starting!')
    })

    await this.openBroadcast('hello!', {})

    const hello = await this.receiveAll('hello!')

    await this.computeStep('log2', async () => {
      console.log('app midpoint!')
    })

    await this.covertBroadcast('hidden!', {})

    const hidden = await this.receiveAll('hidden!')

    await this.computeStep('log3', async () => {
      console.log('app ending!')
    })

    await this.record('hellos', hello.length)
    await this.record('hiddens', hidden.length)
  }
}

module.exports = Application
