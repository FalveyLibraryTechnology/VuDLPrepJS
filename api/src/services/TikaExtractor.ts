import Config from "../models/Config";
import { execSync } from "child_process";
import fs = require("fs");
import tmp = require("tmp");

class TikaExtractor {
    private static instance: TikaExtractor;
    protected config: Config;

    constructor(config: Config) {
        this.config = config;
    }

    public static getInstance(): TikaExtractor {
        if (!TikaExtractor.instance) {
            TikaExtractor.instance = new TikaExtractor(Config.getInstance());
        }
        return TikaExtractor.instance;
    }

    extractText(data: Buffer): string {
        // Write the data to a temporary file:
        const tmpobj = tmp.fileSync();
        const filename = tmpobj.name;
        fs.writeSync(tmpobj.fd, data);
        const javaPath = this.config.javaPath;
        const tikaPath = this.config.tikaPath;
        const tikaConfig = this.config.tikaConfigFile ? `--config=${this.config.tikaConfigFile} ` : "";
        const tikaCommand = javaPath + " -jar " + tikaPath + " --text -eUTF8 " + tikaConfig + filename;
        const result = execSync(tikaCommand, { maxBuffer: Infinity }).toString();
        // Sometimes node.js hangs on to file handles longer than expected; let's empty
        // the file to free up disk space before deleting it, in case this happens:
        fs.truncateSync(filename, 0);
        fs.rmSync(filename); // clean up temp file; we're done now!
        return result;
    }
}

export default TikaExtractor;
