"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express = require("express");
const bodyParser = require("body-parser");
const fs = require("fs");
const commandLineArgs = require("command-line-args");
const winston = require("winston");
const shell = require("node-powershell");
const config_1 = require("./config");
//Сheck CLI arguments
const cliDefs = [
    { name: 'id', type: String },
    { name: 'test', type: Boolean }
];
const params = commandLineArgs(cliDefs);
//start logging
configureLogger();
//текущая задач
let currentTask = {
    state: "wait",
    request: [],
    response: []
};
winston.info(JSON.stringify(params));
if (params.id || params.test) {
}
else {
    winston.info(`Start HTTP-server on port: ${config_1.config.port} and run import loop`);
    var app = express();
    // parse application/json 
    app.use(bodyParser.json());
    app.use((err, req, res, next) => {
        winston.error("Incorrect request: " + err);
        res.status(400).json({ code: 400, message: "Incorrect body playload format" });
    });
    app.listen(config_1.config.port);
    app.get('/', function (req, res) {
        res.send(JSON.stringify({ Name: "Exchange API Server" }));
    });
    app.post('/mailbox', function (req, res) {
        if (req.body && req.body.users) {
            winston.info("Request: " + req.url + ", data: " + JSON.stringify(req.body));
            res.status(201).json(createMailboxes(req.body.users));
        }
        else {
            winston.error("Incorrect Request: " + req.url + ", data: " + req.body);
            res.status(400).json({ code: 400, message: "Incorrect body playload format" });
        }
    });
    app.get('/mailbox/task', function (req, res) {
        res.status(200).json({
            code: 200,
            state: currentTask.state,
            results: currentTask.response
        });
    });
}
function createMailboxes(data) {
    if (currentTask.state == 'progress') {
        return { result: 429, message: "Previous request process in progresss" };
    }
    currentTask.state = 'progress';
    fs.writeFileSync(config_1.config.tempFileName, JSON.stringify({ users: data }));
    let ps = new shell({
        executionPolicy: 'Bypass',
        noProfile: true
    });
    let command = `./src/create-mailboxes.ps1 -InputFile ${config_1.config.tempFileName}`;
    ps.addCommand(command);
    winston.info(`Run PS command: ${command}`);
    ps.invoke()
        .then(output => {
        currentTask.response = JSON.parse(output);
        winston.info("PS Command finished, result: " + JSON.stringify(currentTask.response));
        ps.dispose();
        currentTask.state = "Completed";
    })
        .catch(err => {
        winston.error(`PS Command error: ${err}`);
        ps.dispose();
        currentTask.state = "Errors";
    });
    return { result: 201, message: `Accepted ${data.length} create/update requests` };
}
function configureLogger() {
    winston.add(winston.transports.File, {
        filename: config_1.config.logFileName,
        level: 'debug',
        json: false
    });
    winston.handleExceptions(new winston.transports.File({
        filename: config_1.config.logFileName,
        handleExceptions: true,
        humanReadableUnhandledException: true,
        level: 'debug',
        json: false
    }));
}
//# sourceMappingURL=server.js.map