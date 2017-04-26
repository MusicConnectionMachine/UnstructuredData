# Group 2 - Unstructured Data [![Join the chat at https://gitter.im/MusicConnectionMachine/UnstructuredData](https://badges.gitter.im/MusicConnectionMachine/UnstructuredData.svg)](https://gitter.im/MusicConnectionMachine/UnstructuredData?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=badge) [![Codacy Badge](https://api.codacy.com/project/badge/Grade/488966f28a0c448cac974baa104b74cc)](https://www.codacy.com/app/kordianbruck/UnstructuredData?utm_source=github.com&amp;utm_medium=referral&amp;utm_content=MusicConnectionMachine/UnstructuredData&amp;utm_campaign=Badge_Grade)
This project aims to filter for entities in unstructured data using data from the [Common Crawl](http://commoncrawl.org/).
- This project pulls it's entities from a PostgreSQL database,
- Pull data from the Common Crawl and simultaneously filter for entities,
- Save the found entities back in the DB and upload relevant pages into an [Azure](https://azure.microsoft.com) blob storage container

This project allows for distributed computing as all task are being handled by an Azure task queue.


## Fetch dependencies and compile source
Navigate to the project root and run `yarn install`. [Yarn](https://yarnpkg.com/lang/en/) has to be installed on the machine.  
Once that's finished run `npm run compile` to compile everything to Javascript.

## Usage
```
$ Usage: app [options]

> Options:

    -h, --help                                 output usage information
    -P, --Process                              process queue items
    -A, --Add                                  add items to the queue
    -M, --Monitor                              monitor queue size
    -d, --db-location [host]:[port]            database location, e.g. "127.0.0.1:5432"
    -a, --db-access [user]:[password]          database access, e.g. "USER:PASSWORD"
    -n, --db-name [name]                       database name, e.g. "ProductionDB"
    -b, --blob-location [account]:[container]  blob storage location, e.g. "wetstorage:websites"
    -k, --blob-key [storageKey]                blob storage access key, e.g. "AZURE_KEY_HERE"
    -q, --queue-location [account]:[queue]     task queue location, e.g. "queueservice:taskqueue"
    -s, --queue-key [serviceKey]               queue service access key, e.g. "AZURE_KEY_HERE"
    -p, --processes [number]                   number of worker threads, e.g. "4"
    -t, --heuristic-threshold [number]         filter strictness, the higher the stricter, e.g. "3"
    -l, --languages [languageCodes]            languages to filter for in ISO 639-1, e.g. "['de', 'en', 'fr']"
    -e, --enable-pre-filter                    enable bloom filter as pre filter
    -c, --crawl-version [version]              common crawl version, e.g. "CC-MAIN-2017-13"
    -r, --wet-range [from]:[to]                select a subset of WET files from CC, e.g. 0:420 (inclusive:exclusive)
    -f, --file-only-logging                    disable console logging

```

An operating mode has to be selected via the options `-P`, `-M` and `-A`. 
- Option `-P`/`--Process` will spawn multiple worker processes and will start processing queue items.
  - `-p`/`--processes` can be used to set the number of worker processes. Defaults to the number of logical CPU cores.
  - `-t`/`--heuristic-threshold` sets the filter strictness, the higher the stricter. Defaults to 3.
  - `-l`/`--languages` can be used to restrict the results to only a few languages. 
  This expects a JSON formatted list of ISO 639-1 language codes. 
  An empty `[]` list will result in all languages being accepted. Defaults to `["en"]`.
  - `-e`/`--enable-pre-filter` will enable pre filtering which might improve performance in some cases.
- Option `-M`/`--Minitor` will constantly monitor the queue size.
- Option `-A`/`--Add` will add new items to the queue. 
  - `-r`/`--wet-range` can be used to only add a subset of all WEt files to the queue.
  - `c`/`--crawl-version` can be used to select which Common Crawl version should be used. Defaults to `CC-MAIN-2017-13`.

The following arguments will only be used when using mode `-P`/`--Process`:
- `-d`/`--db-location`
- `-a`/`--db-access`
- `-n`/`--db-name`
- `-b`/`--blob-location`
- `-k`/`--blob-key`



#Config file

Alternatively to supplying all the arguments via the CLI they can be set via the `config.json` file:
```
{
  "dbHost": "127.0.0.1",
  "dbPort": 5432,
  "dbUser": "USER",
  "dbPW": "PASSWORD",
  "dbName": "ProductionDB",
  "blobAccount": "wetstorage",
  "blobContainer": "websites",
  "blobKey": "AZURE_KEY_HERE",
  "queueAccount": "parsertaskqueue",
  "queueName": "taskqueue",
  "queueKey": "AZURE_KEY_HERE",
  "processes": 4,
  "heuristicThreshold": 3,
  "languageCodes": [
    "de",
    "en",
    "fr"
  ],
  "enablePreFilter": false,
  "crawlVersion": "CC-MAIN-2017-13",
  "wetFrom": 0,
  "wetTo": 420,
  "fileOnlyLogging": false
}
```



#Environment variables

All arguments can also be supplied via environment variables. 
The environment variable names have to match those in `config.json` with an added `MCM_`, e.g.:   
`MCM_dbHost`, `MCM_dbPort`, `MCM_dbUser`, ...

