const Application = require('./Application')

class FastBenchmark extends Application {
  async input () {
    this.input = Math.random()
    return this.input
  }

  async run () {
    // open, covert, three-phase
    // x
    // small (8 B), medium (1 kB)
    // x
    // identical, different

    const test = async (name, data) => {
      console.log('------ 1/3')
      await this.openBroadcast('open-' + name, data)
      const open = await this.receiveAll('open-' + name)

      console.log('------ 2/3')
      await this.covertBroadcast('covert-' + name, data)
      const covert = await this.receiveAll('covert-' + name)

      console.log('------ 3/3')
      await this.threePhaseBroadcast('threephase-' + name, data)
      const threephase = await this.receiveAll('threephase-' + name)

      return { open, covert, threephase }
    }

    const testIdentical = async (name, data) => {
      const { open, covert, threephase } = await test(name + '-identical', data)
      this.assert(name + '-identical-open', open.every(item => item === data))
      this.assert(name + '-identical-open-size', open.length === this.total)
      this.assert(name + '-identical-covert', covert.every(item => item === data))
      this.assert(name + '-identical-covert-size', covert.length === this.total)
      this.assert(name + '-identical-threephase', threephase[0] === data)
      this.assert(name + '-identical-threephase-size', threephase.length === 1)
    }

    const testRandom = async (name, data) => {
      const { open, covert, threephase } = await test(name + '-random', data)
      this.assert(name + '-random-open', open.includes(data))
      this.assert(name + '-random-open-size', open.length === this.total)
      this.assert(name + '-random-covert', covert.includes(data))
      this.assert(name + '-random-covert-size', covert.length === this.total)
      this.assert(name + '-random-threephase', threephase.includes(data))
      this.assert(name + '-random-threephase-size', threephase.length === this.total)
    }

    console.log('1/4')
    await testIdentical('small', '12345678')
    console.log('2/4')
    await testIdentical('medium', '12345678'.repeat(128))
    console.log('3/4')
    await testRandom('small', Math.random().toString(36).substring(8))
    console.log('4/4')
    await testRandom('medium', Math.random().toString(36).substring(8).repeat(128))
  }
}

module.exports = FastBenchmark
