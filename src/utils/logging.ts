import * as cluster from "cluster";

export let winston = require('winston');
let processName = cluster.isMaster ? 'Master' : 'Worker-' + process.pid;
winston.add(winston.transports.File, { filename: './logs/' + processName + '.log' });
winston.remove(winston.transports.Console);