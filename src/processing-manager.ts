import * as cluster from "cluster";
import * as os from "os";
import {TermLoader} from "./utils/term-loader";
import {Term} from "./utils/term";
import {CCPathLoader} from "./utils/cc-path-loader";
import {CLI} from "./cli";


/**
 * The ProcessingManager
 * 1. fetches CC paths,
 * 2. fetches terms,
 * 3. processes files in forked processes
 */
export class ProcessingManager {

    private static CONFIG_FILE = require("../config.json");

    private static DEFAULTS = {
        dbHost: "localhost",
        dbPort: "5432",
        blobAccount: "wetstorage",
        blobContainer: "websites",
        processes: os.cpus().length,
        crawlVersion: "CC-MAIN-2017-13"
    };

    public static run() {

        // check if master process
        if (!cluster.isMaster) return;

        let wetPaths : Array<string>;
        let terms : Array<Term>;

        let loadWetPaths = () => {
            let indexURL = "https://commoncrawl.s3.amazonaws.com/crawl-data/"
                + ProcessingManager.getParam("crawlVersion")
                + "/wet.paths.gz";
            CCPathLoader.loadPaths(indexURL, (err: Error, response : Array<string>) => {
                if (err) throw err;

                wetPaths = response.slice(ProcessingManager.getParam("wetFrom"), ProcessingManager.getParam("wetTo"));
                console.log("[MASTER] successfully loaded WET paths!");

                loadTerms();
            });
        };

        let loadTerms = () => {
            TermLoader.loadFromDB((err : Error, result : Array<Term>) => {
                if (err) throw err;
                terms = result;
                console.log("[MASTER] successfully loaded terms!");

                spawnProcesses();
            });
        };

        let spawnProcesses = () => {

            const workerParams = {
                terms: terms,
                languageCodes: undefined,
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
                }
            };
            for (let i = 0; i < ProcessingManager.getParam("processes"); i++) {

                let worker = cluster.fork();

                // add listener to assign work
                worker.on('message', (msg) => {

                    if (msg.needWork) {
                        if (wetPaths.length > 0) {
                            worker.send({
                                work: wetPaths.pop()
                            });
                        } else {
                            worker.send({
                                finished: true
                            });
                        }
                    }
                });

                // init worker
                worker.send({
                    init: workerParams
                });

                console.log("[MASTER] successfully spawned a worker process!");
            }
        };


        loadWetPaths();

    }

    private static getParam(param : string) {
        return CLI.getInstance().parameters[param] || ProcessingManager.CONFIG_FILE[param]
            || process.env[param] || ProcessingManager.DEFAULTS[param]
    }

}

