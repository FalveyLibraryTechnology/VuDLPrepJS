const Config = require("../dist/models/Config").default; // eslint-disable-line @typescript-eslint/no-var-requires
const TrashCollector = require("../dist/services/TrashCollector").default; // eslint-disable-line @typescript-eslint/no-var-requires

const trash = Config.getInstance().trashPid;
if (!trash) {
    console.error("Please configure the trash_pid setting in vudl.ini.");
    return;
}
TrashCollector.getInstance().purgeDeletedPidsInContainer(trash);
