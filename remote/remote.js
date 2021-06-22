const axios = require('axios')

const core = 'http://localhost:3000/'

function connect () {
  console.log('waiting for server...')
  return new Promise((resolve, reject) => {
    const interval = setInterval(() => {
      axios.get(core + 'status').then((result) => {
        clearInterval(interval)
        resolve()
      }).catch(() => { console.log('still waiting...') })
    }, 1000)
  })
}

function waitFor (property, value) {
  console.log('waiting for ' + property + ' >= ' + value + '...')
  return new Promise((resolve, reject) => {
    const interval = setInterval(() => {
      axios.get(core + 'status').then((result) => {
        console.log(property + ' = ' + result.data[property])
        if (result.data[property] >= value) {
          clearInterval(interval)
          resolve()
        }
      })
    }, 1000)
  })
}

function spread () {
  console.log('building network...')
  return axios.get(core + 'spread')
}

function start (name) {
  console.log('starting execution: ' + name)
  return axios.get(core + 'start?app=' + name)
}

function reports () {
  return axios.get(core + 'reports')
}

function sleep (time) {
  console.log('sleeping for ' + time + 'ms...')
  return new Promise((resolve, reject) => {
    setTimeout(resolve, time)
  })
}

function reset () {
  console.log('resetting nodes...')
  return axios.get(core + 'reset')
}

async function run (name, total) {
  console.log('NOW RUNNING ' + name + ' WITH ' + total + ' NODES')
  await connect()
  await reset()
  await sleep(1000)
  await waitFor('connections', total)
  await sleep(1000)
  await spread()
  await sleep(1000)
  await waitFor('networks', total)
  await sleep(1000)
  await start(name)
  await sleep(30000)
  await waitFor('reports', total)
  await sleep(1000)
  return (await reports()).data
}

(async () => {
  console.log((await run('app', 100)).aggregates)
})()
