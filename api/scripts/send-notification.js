const QueueManager = require("../dist/services/QueueManager").default; // eslint-disable-line @typescript-eslint/no-var-requires

const args = process.argv.slice(2);
const message = args[0] ?? null;
const channel = args[1] ?? null;

QueueManager.getInstance().sendNotification(message, channel);
