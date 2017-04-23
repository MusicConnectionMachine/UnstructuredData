import * as cluster from "cluster";
import * as os from "os";
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

        let loadTerms = () => {

            let dbParms = {
                dbHost: ProcessingManager.getParam("dbHost"),
                dbPort: ProcessingManager.getParam("dbPort"),
                dbUser: ProcessingManager.getParam("dbUser"),
                dbPW: ProcessingManager.getParam("dbPW")
            };

            TermLoader.loadFromDB(dbParms, (err : Error, result : Array<Term>) => {
                if (err) throw err;

                // check length of terms
                for (let term of result) {
                    if (term.value.length > 2) {
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
                dbParams: {
                    "dbHost": ProcessingManager.getParam("dbHost"),
                    "dbPort": ProcessingManager.getParam("dbPort"),
                    "dbUser": ProcessingManager.getParam("dbUser"),
                    "dbPW": ProcessingManager.getParam("dbPW")
                },
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

        loadTerms();
    }

    private static getParam(param : string) {
        let value = CLI.getInstance().parameters[param];

        if(value) {
            return value;
        }

        try {
            return require('../config.json')[param] || process.env[param] || ProcessingManager.DEFAULTS[param];
        } catch(e) {
            return process.env[param] || ProcessingManager.DEFAULTS[param];
        }
    }

}

