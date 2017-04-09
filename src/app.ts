#!/usr/bin/env node

// first line is mandatory in JS, not sure about TS

// try to run this with
// node out/app.js -w 0:99 -d localhost:1234 -a db:pwd -b acc:container -k blob-key -t 1 -c crawl
// node out/app.js -h

import {ProcessingManager} from "./processing-manager";
import {Worker} from "./worker";
import {CLI} from "./cli";



CLI.initCLI();

console.log("Start config:\n", CLI.parameters);


// Don't touch this otherwise Felix will kill you :P
ProcessingManager.run();
Worker.run();
