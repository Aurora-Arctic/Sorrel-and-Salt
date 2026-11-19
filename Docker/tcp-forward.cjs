// Usage: node tcp-forward.cjs <listen port> <target port>
//
// Listens on every address and passes each connection to the target port on
// this container's loopback, for a server that binds loopback alone whatever it
// is told. Node is in every image that runs this; socat is not.
const net = require('node:net');

const [listenPort, targetPort] = process.argv.slice(2).map(Number);
if (!listenPort || !targetPort) {
  process.stderr.write('usage: node tcp-forward.cjs <listen port> <target port>\n');
  process.exit(2);
}

net
  .createServer((client) => {
    const upstream = net.connect(targetPort, '127.0.0.1');
    client.pipe(upstream).pipe(client);
    // One side closing or failing ends the other; an unhandled 'error' would
    // otherwise take the whole forwarder down.
    for (const socket of [client, upstream]) {
      socket.on('error', () => {});
      socket.on('close', () => {
        client.destroy();
        upstream.destroy();
      });
    }
  })
  .on('error', (error) => {
    process.stderr.write(`tcp-forward ${listenPort} -> ${targetPort}: ${error.message}\n`);
    process.exit(1);
  })
  .listen(listenPort, '0.0.0.0');
