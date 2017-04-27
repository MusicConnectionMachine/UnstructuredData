import * as cluster from "cluster";
import * as path from "path";
import {params} from "./param-loader"

export let winston = require('winston');
let processName = cluster.isMaster ? 'Master' : 'Worker-' + process.pid;
let logPath = path.join(__dirname, "../../logs/", processName + '.log');
console.log(logPath);
winston.add(winston.transports.File, { filename: logPath });
if (params.all.fileOnlyLogging) {
    winston.remove(winston.transports.Console);
}