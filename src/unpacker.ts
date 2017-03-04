const fs = require('fs');
const unzip = require('unzip');


/**
 * Unpacks a .zip file into the specified folder (must already exist!).
 *
 * @param zipFilePath           path to the .zip file
 * @param outputFolderPath      path to the output folder, without '/' in the end, folder must exist!
 */
export function unpackZipFile(zipFilePath : string, outputFolderPath : string) : void {

    fs.createReadStream(zipFilePath)
        .pipe(unzip.Parse())
        .on('entry', function (entry) {

            let fileName = entry.path;
            let type = entry.type; // 'Directory' or 'File'
            let size = entry.size;

            // no subfolders allowed so far
            if (type == 'Directory') {
                entry.autodrain();
            }

            entry.pipe(fs.createWriteStream(outputFolderPath + "/" + fileName));

        });


}
