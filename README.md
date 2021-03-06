# Group 2 - Unstructured Data [![Join the chat at https://gitter.im/MusicConnectionMachine/UnstructuredData](https://badges.gitter.im/MusicConnectionMachine/UnstructuredData.svg)](https://gitter.im/MusicConnectionMachine/UnstructuredData?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=badge) [![Codacy Badge](https://api.codacy.com/project/badge/Grade/488966f28a0c448cac974baa104b74cc)](https://www.codacy.com/app/kordianbruck/UnstructuredData?utm_source=github.com&amp;utm_medium=referral&amp;utm_content=MusicConnectionMachine/UnstructuredData&amp;utm_campaign=Badge_Grade)
This project aims to filter for entities in unstructured data using data from the [Common Crawl](http://commoncrawl.org/).
- This project pulls it's entities from a PostgreSQL database,
- Pulls data from the Common Crawl and simultaneously filters for entities,
- And then saves the found entities back in the DB and uploads relevant pages into an [Azure](https://azure.microsoft.com) blob storage container.

This project allows for distributed computing as all tasks are being handled by an Azure task queue.


## Fetch dependencies and compile source
Navigate to the project root and run `yarn install`. [Yarn](https://yarnpkg.com/lang/en/) has to be installed on the machine.  
Once that's finished run `npm run compile` to compile everything to Javascript.

## Usage
```
$ Usage: app [options]

> Options:

    -h, --help                                output usage information
    -P, --Process                             process queue items
    -A, --Add                                 add items to the queue
    -M, --Monitor                             monitor queue size
    --Delete-queue                            delete queue
    -d, --db-location [host]:[port]           database location, e.g. "127.0.0.1:5432"
    -a, --db-access [user]:[password]         database access, e.g. "USER:PASSWORD"
    -n, --db-name [name]                      database name, e.g. "ProductionDB"
    -b, --blob-access [account]:[accessKey]   blob storage credentials, e.g. "wetstorage:AZURE_KEY_HERE"
    -c, --blob-container [containerName]      blob storage container name for website content, e.g. "websites"
    -j, --json-container [containerName]      blob storage container name for metadata, e.g. "metadata"
    -q, --queue-access [account]:[accessKey]  task queue credentials, e.g. "queueservice:AZURE_KEY_HERE"
    -s, --queue-name [queueName]              task queue name, e.g. "taskqueue"
    -t, --heuristic [threshold]:[limit]       filter strictness, the higher the stricter, e.g. "3", "3:7" (inclusive:exclusive)
    -l, --avg-line-length [length]            remove short lines from content before filtering, e.g. "100"
    --processes [number]                      number of worker threads, e.g. "4"
    --use-json                                save metadata to json container instead of DB
    --languages [languageCodes]               languages to filter for in ISO 639-1, e.g. "['de', 'en', 'fr']"
    --enable-pre-filter                       enable bloom filter as pre filter
    --crawl-version [version]                 common crawl version, e.g. "CC-MAIN-2017-13"
    --wet-range [from]:[to]                   select a subset of WET files from CC, e.g. "0:420" (inclusive:exclusive)
    --wet-caching                             cache downloaded WET files (EXPERIMENTAL)
    -f, --file-only-logging                   disable console logging
```

### Operating modes

**At least** one operating mode has to be selected via the options `--Add`, `--Process`, `--Monitor` and `--Delete-queue`: 
- Option `-A`, `--Add` will add new items to the queue. 
  - `--crawl-version` can be used to select which Common Crawl version should be used.   
    Defaults to `CC-MAIN-2017-13`.
  - `--wet-range` can be used to only add a subset of all WET files to the queue.
    By default all WET files will be added to the queue.
- Option `-P`, `--Process` will spawn multiple worker processes and will start processing queue items.
  - `-l`, `--avg-line-length` will shrink web page content down to its main text based on average line length.
    Defaults to 40.
  - `--enable-pre-filter` will enable pre filtering which might improve performance in some cases.   
    Defaults to false.
  - `--languages` can be used to restrict the results to only a few languages.   
    This expects a JSON formatted list of ISO 639-1 language codes.   
    An empty list `[]` will result in all languages being accepted.   
    Defaults to English. 
  - `--processes` can be used to set the number of worker processes.    
    Defaults to the number of logical CPU cores.
  - `-t`, `--heuristic-threshold` sets the filter strictness, the higher the stricter.    
    Threshold defaults to 3, limit to infinity.   
  - `--use-json` can be set to save the resulting metadata to the specified JSON container instead of the DB.   
  - `--wet-caching` can be used to save the downloaded and processed WET files to disk. (EXPERIMENTAL)
- Option `-M`, `--Monitor` will constantly monitor the queue size.  
- Option `--Delete-queue` will permanently delete the queue.   
This mode can't be combined with any other operating mode. If multiple modes are selected only `--Delete-queue` will be run.

The following arguments will only be used when using mode `-P`, `--Process`:
- `-d`, `--db-location`, defaults to "localhost:5432"
- `-a`, `--db-access`, has no default value
- `-n`, `--db-name`, has no default value
- `-b`, `--blob-access`, has no default value
- `-c`, `--blob-container`, defaults to "websites"
- `-j`, `--json-conatiner`, defaults to "metadata"



### Config file

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
  "heuristicThreshold": 3,
  "heuristicLimit": 7,
  "avgLineLength": 100,
  "processes": 4,
  "useJson": false,
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



### Environment variables

All arguments can also be supplied via environment variables. 
The environment variable names have to match those in `config.json` with an added `MCM_`, e.g.:   
`MCM_dbHost`, `MCM_dbPort`, `MCM_dbUser`, ...

## Importing JSON into the DB

When using the `--use-json` flag all resulting metadata will be saved as a series of JSON files instead of to the DB. In order to use that data it has to be imported to a new temporary table `import.final` where each entry is a single JSON object. The following script will then assign IDs to these objects and will then extract `website` and `contains` entries from them.

```
-- Drop old data in contains and website tables and all tables referencting said data
-- THIS WILL DELETE ALL THE DATA IN THOSE TABLES!
TRUNCATE TABLE websites, contains CASCADE;

-- Add IDs
ALTER TABLE import.final
ADD COLUMN id TEXT NOT NULL DEFAULT gen_random_uuid();

-- Populate websites table
INSERT INTO websites
    SELECT CAST(id AS UUID), 
           data->>'url' AS url,
           data->>'bloburl' AS blob_url,
           current_timestamp AS createdAt,
           current_timestamp AS updatedAt
    FROM import.final;

-- Populate contains table
with occurences AS (
    SELECT id, data->>'occurrences' AS occ 
    FROM import.final
), elems AS (
    SELECT id, elems 
    FROM occurences, json_array_elements(cast(occ AS json)) AS elems
)
INSERT INTO contains
    SELECT gen_random_uuid() AS id,
           json_build_object(
                'term', e.elems->'term'->'value', 
                'positions', e.elems->'positions'
           ) AS occurences,
           current_timestamp AS createdAt,
           current_timestamp AS updatedAt,
           CAST(e.id AS UUID) AS websiteId,
           CAST(e.elems->'term'->>'entityId' AS UUID) AS entityId
    FROM elems e;
```
