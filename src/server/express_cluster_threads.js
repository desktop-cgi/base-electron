/**
 * 
 */

const path = require("path");
const url = require("url");

const express = require('express');
const cluster = require('cluster');
const { Worker, isMainThread } = require('worker_threads');

const numCPUs = require('os').cpus().length;

const httpProxy = require('http-proxy');
const WebSocket = require('ws');
const cgijs = require("cgijs");


/**
 *
 *
 * @param {*} host
 * @param {*} port
 * @param {*} targetHost
 * @param {*} targetPort
 * @return {*} 
 */
function createProxyServer(host, port, targetHost, targetPort) {
    const app = express();
    const proxy = httpProxy.createProxyServer();

    // // Example usage: create a proxy server on port 3000 that forwards to http://localhost:8080
    // const proxyServer = createProxyServer('localhost', 3000, 'localhost', 8080);

    // Define a middleware function that forwards requests to the target server
    app.use((req, res) => {
        const target = `http://${targetHost}:${targetPort}`;
        proxy.web(req, res, { target });
    });

    // Handle errors
    proxy.on('error', (err, req, res) => {
        console.error('createProxyServer: Proxy error:', err);
        res.status(500).send('Proxy error');
    });

    // Start the server
    app.listen(port, host, () => {
        console.log(`createProxyServer: Proxy server running at http://${host}:${port}`);
    });

    return app;
}


/**
 *
 *
 * @param {*} host
 * @param {*} port
 * @param {*} targetHost
 * @param {*} targetPort
 * @return {*} 
 */
function createWebSocketProxy(host, port, targetHost, targetPort) {
    const app = express();
    const proxy = httpProxy.createProxyServer();

    // // Example usage: create a WebSocket proxy server on port 3000 that forwards to ws://localhost:8080
    // const wsProxyServer = createWebSocketProxy('localhost', 3000, 'localhost', 8080);

    const server = app.listen(port, host, () => {
        console.log(`createWebSocketProxy: WebSocket proxy listening on ${host}:${port}`);
    });
    const wss = new WebSocket.Server({ server });

    // Handle WebSocket upgrade requests
    wss.on('connection', (ws, req) => {
        // Proxy WebSocket connections to the target server
        const target = `ws://${targetHost}:${targetPort}`;
        const socket = proxy.ws(req, ws, { target });

        // Handle errors
        socket.on('error', (err) => {
            console.error('createWebSocketProxy: WebSocket proxy error:', err);
        });
    });

    // Handle HTTP requests (upgrade to WebSocket if needed)
    app.use((req, res, next) => {
        const isWebSocket = req.headers.upgrade && req.headers.upgrade.toLowerCase() === 'websocket';
        if (isWebSocket) {
            // Prevent Express from sending a response before WebSocket upgrade is complete
            res.setHeader('Connection', 'Upgrade');
            res.setHeader('Upgrade', 'websocket');
            next();
        } else {
            // Proxy non-WebSocket requests to the target server
            const target = `http://${targetHost}:${targetPort}`;
            proxy.web(req, res, { target });
        }
    });

    // Handle errors
    proxy.on('error', (err, req, res) => {
        console.error('createWebSocketProxy: HTTP proxy error:', err);
        res.status(500).send('HTTP proxy error');
    });

    return server;
}


/**
 *
 *
 * @param {*} host
 * @param {*} port
 * @param {*} config
 * @return {*} 
 */
function startServer(host, port, config) {
    const app = express();
    let cUtils = cgijs.utils();

    function response(type, exeOptions) {
        return function (req, res) {
            let fileExecute = cgijs.cgi();

            return fileExecute.serve(type, req, exeOptions, (e, o, se) => {
                req = req, res = res;
                if (!!o) {
                    (!!exeOptions.script.transformResponse) ? res.set((!!o.headers) ? o.headers : { ...exeOptions.script.headers }) : null;
                    res.status((!o.statusCode) ? 200 : o.statusCode).send((!o.response) ? o : o.response);
                } else if (!!se) {
                    res.status((!e.statusCode) ? 500 : e.statusCode).send(se.toString());
                } else if (!!e) {
                    res.status((!se.statusCode) ? 500 : se.statusCode).send(e.toString());
                }
            });
        };
    }

    let cgifiles = Object.keys(config.cgifiles);
    for (let i = 0; i < cgifiles.length; i++) {
        let inst = config.cgifiles[cgifiles[i]];
        let lang_type_config = config[inst.lang_type];
        let server = (!!inst.script.server) ? { ...inst.script.server } : (!!lang_type_config.script.server) ? { ...lang_type_config.script.server } : {}
        // Check this again for use / all / specific method
        app.use(
            inst.path,
            response(inst.lang_type, {
                ...inst,
                embed: (!!inst.embed) ? { ...inst.embed } : { ...lang_type_config.embed },
                script: (!!inst.script) ? { ...inst.script, server: { ...server } } : { ...lang_type_config.script, server: { ...server } }
            })
        );
    }

    app.get('/', (req, res) => {
        res.send('startServer: Hello, World!');
    });

    // Start the server
    const server = app.listen(port, host, () => {
        console.log(`startServer: Server running on port ${port}`);
    });

    return app;
}


/**
 *
 *
 * @param {*} host
 * @param {*} port
 * @param {*} num
 * @param {*} config
 * @return {*} 
 */
function runClusterThreads(host, port, num, config) {
    host = host || "127.0.0.1";
    port = port || 3000;
    if (cluster.isMaster && isMainThread) {
        const numWorkers = num || numCPUs;  // process.argv[2] || numCPUs;
        const servers = [];

        console.log(`runClusterThreads: Starting ${numWorkers} worker processes`);

        for (let i = 0; i < numWorkers; i++) {
            cluster.fork();
        }

        cluster.on('exit', (worker, code, signal) => {
            console.log(`runClusterThreads: Worker ${worker.process.pid} died`);
            cluster.fork();
        });

        return cluster;
    } else {
        // This code will only be run inside worker threads
        const server = startServer(host, port + cluster.worker.id - 1, config);
        return server;
    }
}


module.exports.startServer = startServer;
module.exports.createWebSocketProxy = createWebSocketProxy;
module.exports.createProxyServer = createProxyServer;
module.exports.runClusterThreads = runClusterThreads;

// runClusterThreads("127.0.0.1", 3000, 4, require("C:\\Users\\GB\\Documents\\projects\\allprojects\\desktopcgi\\desktop-cgi\\www\\configs\\config-windows_nt_demo.json"))

