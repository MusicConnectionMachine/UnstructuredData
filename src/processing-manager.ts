import * as cluster from "cluster";
import * as os from "os";
import {TermLoader} from "./utils/term-loader";
import {Worker} from "./worker";
import {Term} from "./utils/term";


/**
 * The ProcessingManager
 * 1. fetches CC paths,
 * 2. fetches terms,
 * 3. processes files in forked processes
 */
export class ProcessingManager {
    private static cpus = os.cpus().length;

    public static run() {
        if (cluster.isMaster){
            ProcessingManager.letWork();
        } else if (cluster.isWorker){
            ProcessingManager.work();
        }
    }

    /**
     * Gets called when the current process is the master process
     * Loads terms, forks processes, communicates with processes and serves work
     */
    private static letWork() {
        let ccWetPaths : Array<string> = [];

        // TODO: programmatically add CC paths to array
        ccWetPaths.push('crawl-data/CC-MAIN-2017-09/segments/1487501172017.60/wet/CC-MAIN-20170219104612-00150-ip-10-171-10-108.ec2.internal.warc.wet.gz');

        // load entities
        // TODO: don't use the dummy function
        TermLoader.loadDummyTermsCallback((err : Error, entities : Array<Term>) => {
            if (err) {
                console.warn("SHIT!\n", err);
                return;
            }


            /** Threading
             * 1. start threads
             * 2. add listener when worker requests work
             * 3. initially send entities
             */
            for (let i = 0; i < ProcessingManager.cpus; i++) {

                // start thread
                let thread = cluster.fork();

                // add listeners
                thread.on('message', (msg) => {
                    if (msg.needWork) {
                        if (ccWetPaths.length > 0) {
                            thread.send({work: ccWetPaths.pop()})
                        } else {
                            thread.send({finished: true});
                        }
                    }
                });

                // send entities
                thread.send({entities: entities});
            }
        });

    }

    /**
     * Gets called when the current process is a slave process
     * Initializes Worker with terms and fetches new work from master process
     */
    private static work() {
        let worker : Worker;

        process.on('message', (msg) => {

            // receiving entities from master
            if (msg.entities) {
                worker = new Worker(msg.entities);
                worker.on('finished', () => {
                    process.send({needWork: true});
                });
                process.send({needWork: true});
            }
            // receiving WET path
            else if (msg.work && worker) {
                worker.workOn(msg.work);
            }
            // all WET files have been processed
            else if (msg.finished) {
                process.exit(0);
            }
        });
    }
}

