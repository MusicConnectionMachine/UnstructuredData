export class Logger {
    static winston;

    static init(tag : String) {
        Logger.winston = require('winston');
        Logger.winston.add(Logger.winston.transports.File, { filename: './' + tag + '.log' });
        Logger.winston.remove(Logger.winston.transports.Console);
    }
}