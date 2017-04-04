import {TermLoader} from "./utils/term-loader";
import {Worker} from "./worker";

let ccWetPaths : Array<string> = [];

// TODO: programmatically add CC paths to array
ccWetPaths.push('crawl-data/CC-MAIN-2017-09/segments/1487501172017.60/wet/CC-MAIN-20170219104612-00150-ip-10-171-10-108.ec2.internal.warc.wet.gz');

// load terms
TermLoader.loadFromDB((err, entities) => {
    if (err) {
        console.log("SHIT!\n", err);
        return;
    }

    const worker = new Worker(entities, false, ["en"]);
    while(ccWetPaths.length > 0) {
        worker.workOn(ccWetPaths.pop());
    }
});


