import * as cluster from "cluster";
import * as os from "os";
import {TermLoader} from "./utils/term-loader";
import {Term} from "./utils/term";
import {CCPathLoader} from "./utils/cc-path-loader";


/**
 * The ProcessingManager
 * 1. fetches CC paths,
 * 2. fetches terms,
 * 3. processes files in forked processes
 */
export class ProcessingManager {

    private static cpus = os.cpus().length;
    private static wetPaths : Array<string>;

    public static run() {

        // check if master process
        if (!cluster.isMaster){ return; }


        let onPaths = (err: Error, wetPaths : Array<string>) => {
            ProcessingManager.wetPaths = wetPaths;
            TermLoader.loadFromDB(onTerms);
        };


        let onTerms = (err : Error, entities : Array<Term>) => {
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

                // add listener to assign work
                thread.on('message', (msg) => {
                    if (msg.needWork) {
                        if (ProcessingManager.wetPaths.length > 0) {
                            thread.send({work: ProcessingManager.wetPaths.pop()})
                        } else {
                            thread.send({finished: true});
                        }
                    }
                });

                // send entities
                thread.send({entities: entities});
            }
        };

        CCPathLoader.loadPaths(undefined, onPaths);

    }
}

