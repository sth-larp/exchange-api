import * as express from "express";
import* as  bodyParser from 'body-parser';
import * as fs from 'fs';

import { Observable, BehaviorSubject  } from 'rxjs/Rx';
import * as moment from "moment";
import * as commandLineArgs  from 'command-line-args';
import * as winston from 'winston';
import * as shell from 'node-powershell';

import { config } from './config';

interface MailboxData {
    id: string,
    login: string,
    password: string,
    fullName: string,
    firstName: string,
    lastName: string
}

interface ResultData {
    id: string,
    login: string,
    result: string
}

interface TaskData {
    state: string;
    request: MailboxData[];
    response: ResultData[];
}

//Сheck CLI arguments
const cliDefs = [
        { name: 'id', type: String },
        { name: 'test', type: Boolean }
];

const params = commandLineArgs(cliDefs);

//start logging
configureLogger();

//текущая задач
let currentTask:TaskData = {
    state : "wait",
    request: [],
    response: []
};


winston.info(JSON.stringify(params));

if(params.id || params.test){
   
}else{
    
    winston.info(`Start HTTP-server on port: ${config.port} and run import loop`);

    var app = express();

    // parse application/json 
    app.use(bodyParser.json())

    app.use((err, req, res, next) => {
        winston.err("Incorrect request: " + err)
        res.status(400).json({code: 400, message: "Incorrect body playload format"});
    });

    app.listen(config.port);

    app.get('/', function (req, res) {
        res.send(JSON.stringify({ Name: "Exchange API Server" }));
    });

    app.post('/mailbox', function (req, res) {
        if(req.body && req.body.users){
            winston.info("Request: " + req.url + ", data: " + JSON.stringify(req.body));
            res.status(201).json(createMailboxes(req.body.users));
        }else{
            winston.err("Incorrect Request: " + req.url + ", data: " + req.body);    
            res.status(400).json({code: 400, message: "Incorrect body playload format"});
        }
    });

    app.get('/mailbox/task', function (req, res) {
        res.status(200).json( {
                            code: 200, 
                            state: currentTask.state, 
                            results: currentTask.response 
                        });
    });
    
    
}

function createMailboxes(data: MailboxData[]): any {

    if(currentTask.state == 'progress'){
        return {result: 429, message: "Previous request process in progresss"}
    }

    currentTask.state = 'progress';

    fs.writeFileSync(config.tempFileName, JSON.stringify( {users: data} ));

    let ps = new shell({
        executionPolicy: 'Bypass',
        noProfile: true
    });

    let command  = `./src/create-mailboxes.ps1 -InputFile ${config.tempFileName}`;

    ps.addCommand(command);

    winston.info(`Run PS command: ${command}`);

    ps.invoke()
        .then(output => {
            currentTask.response = JSON.parse(output);

            console.log("PS Command finished, result: " + JSON.stringify(currentTask.response));
            ps.dispose();
            currentTask.state = "Completed";
        })
        .catch(err => {
            console.log(`PS Command error: ${err}`);
            ps.dispose();
            currentTask.state = "Errors";
        });

    return {result: 201, message: `Accepted ${data.length} create/update requests` };
}

function configureLogger(){
    winston.add(winston.transports.File, { 
                filename: config.logFileName,
                level: 'debug',
                json: false
            });
    winston.handleExceptions(new winston.transports.File({
                filename: config.logFileName ,
                handleExceptions: true,
                humanReadableUnhandledException: true,
                level: 'debug',
                json: false
            }));
}

