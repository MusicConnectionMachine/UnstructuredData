#!/usr/bin/env node

const http = require('http'),
	https = require('https'),
	url = require('url'),
	zlib = require('zlib'),
	azure = require('azure-storage');
	
const crawlName = process.argv[2];
const queueAccountName = process.argv[3];
const queueAccountKey = process.argv[4];
const queueName = process.argv[5];
const concurrent = process.argv[6] || 20;

if(!crawlName) {
    console.log('No crawl name specified, exiting.');
    process.exit(1);
}
if(!queueAccountName) {
    console.log('No queue account name, exiting.');
    process.exit(1);
}
if(!queueAccountKey) {
    console.log('No queue key, exiting.');
    process.exit(1);
}
if(!queueName) {
    console.log('No queue name, exiting.');
    process.exit(1);
}

const indexURL = "https://commoncrawl.s3.amazonaws.com/crawl-data/"
    + crawlName
    + "/wet.paths.gz";

getResponse(indexURL, (err, response) => {
	if(err) {
		return console.log(err);
	}
    let stream = response.pipe(zlib.createGunzip());
    let paths = [];
    let remainder = "";
    stream.on('data', (data) => {
        let tmp = data.toString('utf8').split('\n');
        tmp[0] = remainder + tmp[0];
        remainder = tmp.pop();
        paths = paths.concat(tmp);
    }).on('end', () => {
        
        if(err) {
	        console.log(err);
	        process.exit(1);
	    }
	    const queueSvc = azure.createQueueService(queueAccountName, queueAccountKey);
	    queueSvc.createQueueIfNotExists(queueName, function(error, result, response){
	        if(!error){
	            let insertedCount = 0;
	            let pending = 0;

	            let waiter = (cb) => {
	            	if(pending >= concurrent) {
	            		setTimeout(() => {
	            			waiter(cb);
	            		}, 500);
	            	} else {
	            		cb();
	            	}
	            };

	            let delayedCreate = function(index) {
	            	if(index === paths.length) {
	            		console.log('Successfully inserted ' + insertedCount + '/' + paths.length + ' urls');
	            		return;
	            	}
	            	let url = paths[index];
	            	queueSvc.createMessage(queueName, url, (error, result, response) => {
	            		pending--;
	            		if(!error) {
	            			insertedCount++;
	            			console.log('created ' + index);
	            		} else {
	            			console.log(error);
	            		}
	            	});
	            	waiter(() => {
	            		pending++;
	            		delayedCreate(index+1);
	            	})
	            };

	            delayedCreate(0);
	        }
	    });
    });
});

function getResponse(fileURL, callback, timeout) {

    let parsedURL = url.parse(fileURL);
    timeout = timeout || 20000;

     // sends a get request using the specified module (http or https)
    function getUsing(module) {
        const request = module.get(fileURL, response => {
            callback(undefined, response);
        });
        request.on('error', function(err) {
            callback(err,undefined);
        });
    }

    // download file and pipe to stream
    if (parsedURL.protocol === 'https:') {
        getUsing(https);
    } else if (parsedURL.protocol === 'http:') {
        getUsing(http);
    }
}