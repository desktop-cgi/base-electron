'use strict';

const express = require('express');
const cgijs = require("cgijs");
const path = require("path");
const url = require("url");
let cUtils = cgijs.utils();

module.exports = (dirname, configurations, options, data = {}) => {
    let pr = new Promise(function (resolve, reject) {
        console.log("DesktopCGI-Express Bridge: recursive-cgifiles.js: Starting CGI Files ");
        try {

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

            var app = express();
            let cgifiles = Object.keys(configurations.cgifiles);

            for (let i = 0; i < cgifiles.length; i++) {
                let inst = configurations.cgifiles[cgifiles[i]];
                let lang_type_config = configurations[inst.lang_type];
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

            console.log("Desktop-CGI-Express Bridge: recursive-cgifiles.js: Started files recursive ");
            resolve(app);
        } catch (e) {
            // throw new Error(e);
            console.log("Desktop-CGI-Express Bridge: recursive-cgifiles.js: Error occured in files recursive # ", e.toString());
            reject(e);
        }
    });
    return pr;
}
