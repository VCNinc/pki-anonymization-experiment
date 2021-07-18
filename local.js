const node = require('./node/node')

for (let i = 0; i < 1000; i++) {
  node(11000 + i, 'localhost', 'ws://localhost:8080')
}
