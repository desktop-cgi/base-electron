'use strict';

const path = require("path");
const app = require("./server/express_cluster_threads").runClusterThreads;
const config = require("..")


module.exports = (dirname, configurations, options) => {
    try {
        // Load The FS Module & The Config File
        var express = require('express');

        // var bodyParser = require('body-parser');
        var app = express();

        const cgifiles = require("./recursive/cgifiles");
        const proxies = require("./recursive/proxies");
        const processes = require("./recursive/processes");
        let stores = {};


    } catch (e) {
        // throw new Error(e.toString());
        console.log("Desktop-CGI-Express Bridge: index.js: ", e.toString());
        reject(e);
    }
}

