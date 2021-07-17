const axios = require('axios')
const node = require('./node/node')

axios.get('http://169.254.169.254/latest/meta-data/local-ipv4').then((data) => {
  console.log(data)
})
