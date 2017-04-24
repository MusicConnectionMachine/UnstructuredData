import * as cluster from "cluster";
import * as os from "os";
import * as readline from "readline";
import * as fs from "fs";
import {winston} from "./utils/logging";
import {TermLoader} from "./utils/term-loader";
import {Term} from "./utils/term";
import {CLI} from "./cli";


/**
 * The ProcessingManager
 * 1. fetches CC paths,
 * 2. fetches terms,
 * 3. processes files in forked processes
 */
export class ProcessingManager {


    private static DEFAULTS = {
        dbHost: "localhost",
        dbPort: "5432",
        dbDatabase: "mcm",
        blobAccount: "wetstorage",
        blobContainer: "websites",
        processes: os.cpus().length,
        crawlVersion: "CC-MAIN-2017-13",
        heuristicThreshold: 3,
        languageCodes: ["en"]
    };

    public static run() {

        // check if master process
        if (!cluster.isMaster) return;

        winston.info('Master created and running');

        let terms : Array<Term> = [];
        let termBlacklist : Set<string> = new Set();

        let dbParams = {
            dbHost: ProcessingManager.getParam("dbHost"),
            dbPort: ProcessingManager.getParam("dbPort"),
            dbUser: ProcessingManager.getParam("dbUser"),
            dbName: ProcessingManager.getParam("dbName"),
            dbPW: ProcessingManager.getParam("dbPW")
        };

        let loadBlacklist = () => {
            if (fs.existsSync("./term-blacklist.txt")) {
                let lineReader = readline.createInterface({input: fs.createReadStream("./term-blacklist.txt")});
                lineReader.on('line', (line) => {
                    termBlacklist.add(line);
                });
                lineReader.on('close', () => {
                    loadTerms();
                });
            } else {
                loadTerms();
            }
        };

        let loadTerms = () => {

            TermLoader.loadFromDB(dbParams, (err : Error, result : Array<Term>) => {
                if (err) {
                    winston.error(err);
                    process.exit(1);
                }

                // check length of terms
                for (let term of result) {
                    if (term.value !== null && !termBlacklist.has(term.value) && term.value.length > 2) {
                        terms.push(term);
                    }
                }
                winston.info("Successfully loaded terms!");

                spawnProcesses();
            });
        };

        let spawnProcesses = () => {

            const workerParams = {
                terms: terms,
                enablePreFilter: ProcessingManager.getParam("enablePreFilter"),
                heuristicThreshold : ProcessingManager.getParam("heuristicThreshold"),
                languageCodes: ProcessingManager.getParam("languageCodes"),
                caching: false,
                blobParams: {
                    "blobAccount": ProcessingManager.getParam("blobAccount"),
                    "blobContainer": ProcessingManager.getParam("blobContainer"),
                    "blobKey": ProcessingManager.getParam("blobKey")
                },
                dbParams: dbParams,
                queueParams: {
                    "queueAccount": ProcessingManager.getParam("queueAccount"),
                    "queueName": ProcessingManager.getParam("queueName"),
                    "queueKey": ProcessingManager.getParam("queueKey")
                }
            };
            for (let i = 0; i < ProcessingManager.getParam("processes"); i++) {

                let worker = cluster.fork();

                worker.on('exit', (code) => {
                    winston.info('Worker-' + worker.process.pid + ' exited with code ' + code);
                });

                // init worker
                worker.send({
                    init: workerParams
                });

                winston.info("Successfully spawned a worker process!");
            }
        };

        loadBlacklist();
    }

    private static getParam(param : string) {
        let value = CLI.getInstance().parameters[param];
        if(value) {
            return value;
        }

        try {
            return require('../config.json')[param] || process.env[param] || ProcessingManager.DEFAULTS[param];
        } catch(err) {
            winston.error("Failed loading config.json", err);
            return process.env[param] || ProcessingManager.DEFAULTS[param];
        }
    }

}

