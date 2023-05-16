'use strict';

const path = require("path");
const runClusterThreads = require("./server/express_cluster_threads").runClusterThreads;

module.exports = (dirname, configurations, options) => {
    return runClusterThreads("127.0.0.1", 3000, 4, require("C:\\Users\\GB\\Documents\\projects\\allprojects\\desktopcgi\\desktop-cgi\\www\\configs\\config-windows_nt_demo.json"));
}

