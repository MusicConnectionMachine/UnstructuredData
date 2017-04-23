#!/usr/bin/env node

const azure = require('azure-storage');

const queueAccountName = process.argv[2];
const queueAccountKey = process.argv[3];
const queueName = process.argv[4];

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

const queueSvc = azure.createQueueService(queueAccountName, queueAccountKey);

queueSvc.getQueueMetadata(queueName, function(error, result, response){


	if(!error){
		// Queue length is available in result.approximateMessageCount
		let queueSize = result.approximateMessageCount;
	  	queueSvc.peekMessages(queueName, function(error, result, response){
			if(!error) {
				stats = {
					queueSize: queueSize,
					currentMessage: result[0]
				};

				console.log(stats);
			} else {
				console.log(error);
			}
		});
  	} else {
  		console.log(error);
  	}
});