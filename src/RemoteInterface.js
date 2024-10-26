const {
  MAX_IDLE_TIMEOUT,
  PORT
} = require('./constants')

const net = require('net');

/**
 * @class UserInterface
 *
 * Interact with the input (keyboard directions) and output (creating screen and
 * drawing pixels to the screen). Currently this class is one hard-coded
 * interface, but could be made into an abstract and extended for multiple
 * interfaces - web, terminal, etc.
 */
class RemoteInterface {
  constructor() {
    this.clients = []
    this.launchServer()
  }

  launchServer() {
    this.server = net.createServer((socket) => {
      // Important: This error handler  is different than the one below! - KV
      socket.on('error', (err) => {
        // ignore errors! - Without this callback, we can get a ECONNRESET error that crashes the server - KV
      });
    })
      .on('connection', this.handleNewClient.bind(this))
      .on('error', (err) => {
        // handle errors here
        console.log('Error: ', err);
        // throw err
      })
      .listen(PORT, () => {
        console.log('opened server on', this.server.address());
      });
  }

  idleBoot(client) {
    try {
      client.write('you ded cuz you idled\n', () => client.end());
    } catch (e) {
      // nothing to do really.
    }
  }

  resetIdleTimer(client, time) {
    if (client.idleTimer) clearTimeout(client.idleTimer);
    client.idleTimer = setTimeout(
      this.idleBoot.bind(this, client),
      time
    );
  }

  // Broadcast a message to all connected clients
  broadcast(message) {
    this.clients.forEach((client) => {
      try {
        client.write(message);
      } catch (err) {
        console.log("Failed to send message to client:", err);
      }
    });
  }

  // handle player count message
  getPlayerCountMessage() {
    const playerCount = this.clients.length;
    if (playerCount === 1) {
      return "1 player is connected.";
    } else {
      return `${playerCount} players are connected.`;
    }
  }

  handleNewClient(client) {
    // process.stdout.write('\x07');
    client.setEncoding('utf8');
    this.clients.push(client);
    this.resetIdleTimer(client, MAX_IDLE_TIMEOUT / 2);

    // Send the broadcast message to all clients
    this.broadcast("A new player joined!\n");

    // broadcast the current number of active connections
    this.broadcast(this.getPlayerCountMessage());

    if (this.newClientHandler) this.newClientHandler(client);

    client.on('data', this.handleClientData.bind(this, client));
    client.on('end', this.handleClientEnded.bind(this, client));
  }

  handleClientData(client, data) {
    if (this.clientDataHandler) {
      if (this.clientDataHandler(data, client)) {
        this.resetIdleTimer(client, MAX_IDLE_TIMEOUT); 
      }
    }
  }

  handleClientEnded(client) {
    if (client.idleTimer) clearTimeout(client.idleTimer);
    if (this.clientEndHandler) this.clientEndHandler(client);

    // Remove the client from the list of clients on disconnection
    this.clients = this.clients.filter((c) => c !== client);

    // Send the broadcast message to all clients
    this.broadcast("A player has left!\n");
    
    // Log the current number of active connections
    this.broadcast(this.getPlayerCountMessage());
  }

  bindHandlers(clientDataHandler, newClientHandler, clientEndHandler) {
    // Event to handle keypress i/o
    this.newClientHandler = newClientHandler
    this.clientDataHandler = clientDataHandler
    this.clientEndHandler = clientEndHandler
    // this.screen.on('keypress', keyPressHandler)
    // this.screen.key(['escape', 'q', 'C-c'], quitHandler)
    // this.screen.key(['enter'], enterHandler)
  }
}

module.exports = { RemoteInterface }
