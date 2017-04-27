import * as cluster from "cluster";
import {params} from "./param-loader"

export let winston = require('winston');
let processName = cluster.isMaster ? 'Master' : 'Worker-' + process.pid;
winston.add(winston.transports.File, { filename: './logs/' + processName + '.log' });
if (params.all.fileOnlyLogging) {
    winston.remove(winston.transports.Console);
}