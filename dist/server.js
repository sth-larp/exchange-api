"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express = require("express");
const bodyParser = require("body-parser");
const commandLineArgs = require("command-line-args");
const winston = require("winston");
const config_1 = require("./config");
//Сheck CLI arguments
const cliDefs = [
    { name: 'id', type: String },
    { name: 'test', type: Boolean }
];
const params = commandLineArgs(cliDefs);
//start logging
configureLogger();
winston.info(JSON.stringify(params));
if (params.id || params.test) {
}
else {
    winston.info(`Start HTTP-server on port: ${config_1.config.port} and run import loop`);
    var app = express();
    // parse application/json 
    app.use(bodyParser.json());
    app.listen(config_1.config.port);
    app.get('/', function (req, res) {
        res.send(JSON.stringify({ Name: "Exchange API Server" }));
    });
    app.post('/mailbox', function (req, res) {
        //if(req.body && req.body.)
        console.log(JSON.stringify(req.body));
        //res.send(JSON.stringify({ Name: "Exchange API Server" }));
        res.status(200).json({ "count": "1" });
    });
}
function createMailboxes(data) {
}
function configureLogger() {
    winston.add(winston.transports.File, { filename: config_1.config.logFileName });
    winston.handleExceptions(new winston.transports.File({
        filename: 'path/to/exceptions.log',
        handleExceptions: true,
        humanReadableUnhandledException: true,
        level: 'debug',
        json: false
    }));
}
//# sourceMappingURL=server.js.map