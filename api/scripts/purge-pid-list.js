const TrashCollector = require("../dist/services/TrashCollector").default; // eslint-disable-line @typescript-eslint/no-var-requires
const fs = require('node:fs');
const readline = require('node:readline');

async function processLineByLine(filename) {
    const collector = TrashCollector.getInstance();
    const fileStream = fs.createReadStream(filename);

    const rl = readline.createInterface({
        input: fileStream,
        crlfDelay: Infinity // tolerate all CR/LF variants
    });

    for await (const pid of rl) {
        if (pid.length > 0) {
            console.log(`Deleting ${pid}...`);
            let result = false;
            try {
                result = await collector.purgePid(pid);
            } catch (e) {
                console.error(e);
            }
            if (!result) {
                console.log(`${pid} was not eligible for deletion.`);
            }
        }
    }
}
  
const args = process.argv.slice(2);
if (args.length < 1) {
    console.error("Please provide a filename for your PID list.");
    return;
}
if (!fs.existsSync(args[0])) {
    console.error(args[0] + " does not exist!");
    return;
}
processLineByLine(args[0]);
