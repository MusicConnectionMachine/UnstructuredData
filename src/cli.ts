#!/usr/bin/env node

const commander = require('commander');

commander
    .arguments('<file>')
    .option('-o, --option', 'Dummy options')
    .action(function(file) {
        console.log(file);
    })
    .parse(process.argv);