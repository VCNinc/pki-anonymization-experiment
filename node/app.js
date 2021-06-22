const {performance} = require('perf_hooks');

class Application {
  constructor(gossip, dandelion, report, id) {
    this.gossip = gossip;
    this.dandelion = dandelion;
    this.report = report;
    this.id = id;
    this.router = [];
    this.times = {events: {}};
    this.results = {};
    this.route('start', async (msg) => {
      this.times.start = performance.now();
      await this.run();
      this.times.end = performance.now();
      this.finish();
    });
  }

  async step(event, func, prefix) {
    this.times.events[prefix + '::' + event] = {type: prefix, start: performance.now()};
    await func();
    this.times.events[prefix + '::' + event].end = performance.now();
  }

  finish() {
    this.report({id: this.id, times: this.times, results: this.results});
  }

  deliver(message) {
    if (this.router[message.route] !== undefined) {
      this.router[message.route](message.data);
    }
  }

  route(route, func) {
    this.router[route] = func;
  }

  async openBroadcast(route, data) {
    await this.step(route, async () => {
      this.gossip({route: route, data: data});
    }, 'broadcast/open');
  }

  async covertBroadcast(route, data) {
    await this.step(route, async () => {
      this.dandelion({route: route, data: data});
    }, 'broadcast/covert');
  }

  computeStep(event, func) {
    return this.step(event, func, 'compute');
  }

  async run() {
    await this.computeStep('log1', async () => {
      console.log('app starting!');
    });

    await this.openBroadcast('hello!', {});

    // await this.computeStep('log2', async () => {
    //   console.log('app midpoint!');
    // });

    // await this.covertBroadcast('sneaky!', {});

    await this.computeStep('log3', async () => {
      console.log('app ending!');
    });
  }
}

module.exports = Application;
