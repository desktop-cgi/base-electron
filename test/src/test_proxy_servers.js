const sinon = require('sinon');
const chai = require('chai');
const chaiHttp = require('chai-http');
const expect = chai.expect;
const createHttpProxy = require('../src/create-http-proxy');
const createWebSocketProxy = require('../src/create-websocket-proxy');

chai.use(chaiHttp);

describe('createHttpProxy', () => {
  let server;

  beforeEach(() => {
    server = createHttpProxy('localhost', 3000, 'localhost', 8080);
  });

  afterEach(() => {
    server.close();
  });

  it('proxies HTTP requests to target server', (done) => {
    chai.request(server)
      .get('/api')
      .end((err, res) => {
        expect(res).to.have.status(200);
        expect(res.text).to.equal('Hello, world!');
        done();
      });
  });

  it('handles proxy errors', (done) => {
    const stub = sinon.stub(console, 'error');
    const targetServer = { close: () => {} };
    const proxyServer = createHttpProxy('localhost', 3000, 'localhost', 8080);

    sinon.stub(proxyServer._proxy, 'web').callsFake((req, res, opts) => {
      // Simulate a proxy error
      opts.onError(new Error('Proxy error'));
    });

    // Simulate a connection to the target server being closed
    targetServer.close();

    chai.request(proxyServer)
      .get('/api')
      .end((err, res) => {
        expect(res).to.have.status(500);
        expect(stub.calledWith('HTTP proxy error:', sinon.match.instanceOf(Error))).to.be.true;
        stub.restore();
        proxyServer.close();
        done();
      });
  });
});

describe('createWebSocketProxy', () => {
  let server;

  beforeEach(() => {
    server = createWebSocketProxy('localhost', 3000, 'localhost', 8080);
  });

  afterEach(() => {
    server.close();
  });

  it('proxies WebSocket connections to target server', (done) => {
    const targetServer = new WebSocket.Server({ port: 8080 });
    const ws = new WebSocket('ws://localhost:3000');
    ws.on('open', () => {
      ws.send('Hello, world!');
    });
    targetServer.on('connection', (ws) => {
      ws.on('message', (message) => {
        expect(message).to.equal('Hello, world!');
        ws.send('Hi there!');
      });
    });
    ws.on('message', (message) => {
      expect(message).to.equal('Hi there!');
      targetServer.close();
      done();
    });
  });

  it('handles proxy errors', (done) => {
    const stub = sinon.stub(console, 'error');
    const proxyServer = createWebSocketProxy('localhost', 3000, 'localhost', 8080);

    sinon.stub(proxyServer._proxy, 'ws').callsFake((req, ws, opts) => {
      // Simulate a proxy error
      opts.onError(new Error('Proxy error'));
    });

    const ws = new WebSocket('ws://localhost:3000');
    ws.on('error', () => {
      expect(stub.calledWith('WebSocket proxy error:', sinon.match.instanceOf(Error))).to.be.true;
      stub.restore();
      proxyServer.close();
      done();
    });
  });
});
