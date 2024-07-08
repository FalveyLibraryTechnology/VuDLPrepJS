const QueueManager = require("../dist/services/QueueManager").default; // eslint-disable-line @typescript-eslint/no-var-requires
const SolrCache = require("../dist/services/SolrCache").default; // eslint-disable-line @typescript-eslint/no-var-requires
const fs = require("fs");
const queue = QueueManager.getInstance();

// We can use the first command line argument to override the cache directory
let cache;
const args = process.argv.slice(2);
if (args.length < 1) {
    console.info("Usage: node export-combined-solr-cache.js [target directory] [batch size (default = 1000)]");
    return;
}
cache = SolrCache.getInstance();
cache.exportCombinedFiles(...args);
