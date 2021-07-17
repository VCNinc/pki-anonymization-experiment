const axios = require('axios')
const fs = require('fs')

const core = 'http://18.218.248.166:3000/'

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

function spread (name, total, target = 32) {
  console.log('building network...')
  return axios.get(core + 'spread?total=' + total + '&target=' + target + '&app=' + name)
}

function start () {
  console.log('starting execution')
  return axios.get(core + 'start')
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

async function run (name, total, target = 32, save = false) {
  target = Math.min(target, total - 1)
  console.log('NOW RUNNING ' + name + ' WITH ' + total + ' NODES')
  await connect()
  await reset()
  await sleep(1000)
  await waitFor('connections', total)
  await sleep(1000)
  await spread(name, total, target)
  await sleep(1000)
  await waitFor('networks', total)
  await sleep(1000)
  await start()
  await sleep(1000)
  await waitFor('reports', total)
  await sleep(1000)
  const data = (await reports()).data
  if (save) fs.writeFileSync('./results/' + name + '-' + total + '-' + Date.now() + '.json', JSON.stringify(data))
  console.log(data.aggregates)
  return data
}

(async () => {
  await run('single-value-consensus', 32, 32, true)
})()
