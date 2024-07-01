const QueueManager = require("../dist/services/QueueManager").default; // eslint-disable-line @typescript-eslint/no-var-requires
const SolrCache = require("../dist/services/SolrCache").default; // eslint-disable-line @typescript-eslint/no-var-requires
const fs = require("fs");
const queue = QueueManager.getInstance();

// We can use the first command line argument to override the cache directory
let cache;
const args = process.argv.slice(2);
if (args.length < 1) {
    cache = SolrCache.getInstance();
} else {
    if (args[0] === '-h' || args[0] === '--help') {
        console.info("Usage: node reindex-from-solr-cache.js [optional cache override directory]");
        return;
    }
    if (!fs.existsSync(args[0])) {
        console.error(`${args[0]} does not exist.`);
        return;
    }
    cache = new SolrCache(args[0]);
}
const cachedItems = cache.getDocumentsFromCache();
if (cachedItems === false) {
    console.error("Cache is disabled.");
    return;
}
cachedItems.map(async (file) => {
    console.log(file);
    await queue.performCacheReindexOperation(file);
});
