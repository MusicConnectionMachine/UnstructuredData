import * as cluster from "cluster";
import * as os from "os";
import {TermLoader} from "./utils/term-loader";
import {Worker} from "./worker";

const numCPUs = os.cpus.length;
let ccWetPaths : Array<string> = [];

if (cluster.isMaster) {

    //Master thread

    // TODO: programmatically add CC paths to array
    ccWetPaths.push('crawl-data/CC-MAIN-2017-09/segments/1487501172017.60/wet/CC-MAIN-20170219104612-00150-ip-10-171-10-108.ec2.internal.warc.wet.gz');

    // load terms
    TermLoader.loadFromDB((err, entities) => {
        if (err) {
            console.log("SHIT!\n", err);
            return;
        }

        // I don't think we need more than one Worker as the cluster will probably call 'workOn()' in parallel
        const worker = new Worker(entities, false, ["en"]);

        // start threads
        let i = 0;
        while (i < numCPUs && ccWetPaths.length > 0) {
            cluster.fork({worker: worker, wetPath: ccWetPaths.pop()});
            i++;
        }

        // start new thread for every exiting thread when there's still work to do
        cluster.on('exit', () => {
            if (ccWetPaths.length > 0) {
                cluster.fork({worker: worker, wetPath: ccWetPaths.pop()});
            }
        });
    });
} else {

    // Slave thread
    process.env.worker.workOn(process.env.wetPath);
    process.exit(0);
}

