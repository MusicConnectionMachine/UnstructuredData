import * as cluster from "cluster";
import * as readLine from "readline";
import * as fs from "fs";
import {winston} from "./utils/logging";
import {TermLoader} from "./utils/term-loader";
import {Term} from "./utils/term";
import {CLI} from "./utils/cli";
import {params} from "./utils/param-loader";


/**
 * The ProcessingManager
 * 1. fetches CC paths,
 * 2. fetches terms,
 * 3. processes files in forked processes
 */
export class MasterProcess {

    public static run() {

        // check if master process
        if (!cluster.isMaster) return;

        winston.info('Master process created and running');

        let flags = CLI.getInstance().flags;

        // TODO

        MasterProcess.workQueue();
    }

    private static monitorQueue() {}

    private static populateQueue() {}

    private static workQueue() {

        let terms : Array<Term> = [];
        let termBlacklist : Set<string> = new Set();

        let loadBlacklist = () => {
            if (fs.existsSync("./term-blacklist.txt")) {
                let lineReader = readLine.createInterface({input: fs.createReadStream("./term-blacklist.txt")});
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

            TermLoader.loadFromDB(params.all.dbParams, (err : Error, result : Array<Term>) => {
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
                winston.info("Successfully loaded " + terms.length + " terms!");

                spawnProcesses();
            });
        };

        let spawnProcesses = () => {

            for (let i = 0; i < params.all.processes; i++) {

                let worker = cluster.fork();

                worker.on('exit', (code) => {
                    winston.info('Worker-' + worker.process.pid + ' exited with code ' + code);
                });

                // init worker
                worker.send({
                    terms: terms
                });

                winston.info("Successfully spawned worker process " + worker.process.pid + "!");
            }
        };

        loadBlacklist();
    }
}

