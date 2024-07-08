const TrashCollector = require("../dist/services/TrashCollector").default; // eslint-disable-line @typescript-eslint/no-var-requires

const args = process.argv.slice(2);
if (args.length < 1) {
    console.error("Please provide a top-level PID (e.g. trash can).");
    return;
}
TrashCollector.getInstance().purgeDeletedPidsInContainer(args[0]);
