import Config from "../models/Config";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "fs";
import glob = require("glob");
import path = require("path");

export interface SolrAddDoc {
    add?: { doc?: Record<string, unknown> };
}

export class SolrCache {
    private static instance: SolrCache;
    cacheDir: boolean | string;

    constructor(cacheDir: boolean | string = false) {
        this.cacheDir = cacheDir;
    }

    public static getInstance(): SolrCache {
        if (!SolrCache.instance) {
            const config = Config.getInstance();
            SolrCache.instance = new SolrCache(config.solrDocumentCacheDir);
        }
        return SolrCache.instance;
    }

    public isEnabled(): boolean {
        return this.cacheDir !== false;
    }

    /**
     * Returns the path to the PID file in the document cache if caching is enabled, false otherwise.
     *
     * @param pid PID being indexed
     * @param extension File extension to use (default = json)
     * @returns false | string
     */
    public getDocumentCachePath(pid: string, extension = "json"): false | string {
        if (!this.isEnabled()) {
            return false;
        }
        // Create a file path that will prevent too many files from being stored in the
        // same directory together:
        const [namespace, number] = pid.split(":");
        const paddedNumber = "0000000000" + number;
        const len = paddedNumber.length;
        const chunk1 = paddedNumber.substring(len - 9, len - 6);
        const chunk2 = paddedNumber.substring(len - 6, len - 3);
        const chunk3 = paddedNumber.substring(len - 3, len);
        return `${this.cacheDir}/${namespace}/${chunk1}/${chunk2}/${chunk3}/${number}.${extension}`;
    }

    public getLockFileForPid(pid: string, action: string): string {
        if (!this.isEnabled()) {
            throw new Error("getLockFileForPid not supported when cache disabled");
        }
        return this.getDocumentCachePath(pid, action + ".lock") as string;
    }

    public lockPidIfEnabled(pid: string, action: string): void {
        if (this.isEnabled()) {
            this.writeFile(this.getLockFileForPid(pid, action), "");
        }
    }

    protected tolerantDeleteFile(file: string): void {
        if (existsSync(file)) {
            try {
                rmSync(file);
            } catch (e) {
                // Since we don't have file locking in place, it's possible that a
                // file might get deleted by another process in between the exists
                // check and the delete call. This will trigger an exception, but
                // as long as the file is really deleted, we don't mind. If the file
                // still exists, though, we should rethrow the exception.
                if (existsSync(file)) {
                    throw e;
                }
            }
        }
    }

    public unlockPidIfEnabled(pid: string, action: string): void {
        if (this.isEnabled()) {
            this.tolerantDeleteFile(this.getLockFileForPid(pid, action));
        }
    }

    public isPidLocked(pid: string, action: string) {
        return existsSync(this.getLockFileForPid(pid, action));
    }

    public purgeFromCacheIfEnabled(pid: string): void {
        const cacheFile = this.getDocumentCachePath(pid);
        if (cacheFile !== false) {
            this.tolerantDeleteFile(cacheFile as string);
        }
    }

    /**
     * Write a file to disk, creating the full directory path if necessary.
     *
     * @param file Filename
     * @param data Data to save
     */
    protected writeFile(file: string, data: string): void {
        const dirname = path.dirname(file);
        if (!existsSync(dirname)) {
            mkdirSync(dirname, { recursive: true });
        }
        writeFileSync(file, data);
    }

    public writeToCacheIfEnabled(pid: string, data: string): void {
        // Get filename; if it's false, cache is disabled:
        const file = this.getDocumentCachePath(pid);
        if (file === false) {
            return;
        }
        this.writeFile(file, data);
    }

    /**
     * Returns an array of JSON files in the cache when cache is enabled, false otherwise.
     */
    public getDocumentsFromCache(): Array<string> | false {
        if (!this.isEnabled()) {
            return false;
        }
        let pattern = this.cacheDir + "/**/**/**/*.json";
        const options: Record<string, unknown> = { nocase: true };
        // Special case for Windows -- we need to account for drive letters:
        const colonIndex = pattern.indexOf(":");
        if (colonIndex > -1) {
            options.root = pattern.substring(0, colonIndex + 2);
            pattern = pattern.substring(colonIndex + 1);
        }
        return glob.sync(pattern, options);
    }

    public getDocumentFromCache(pid: string): Record<string, unknown> | false {
        const path = this.getDocumentCachePath(pid);
        if (path && existsSync(path)) {
            const doc = this.readSolrAddDocFromFile(path);
            return doc?.add?.doc ?? false;
        }
        return false;
    }

    public readSolrAddDocFromFile(file: string): SolrAddDoc {
        return JSON.parse(readFileSync(file).toString());
    }

    public exportCombinedFiles(targetDir: string, batchSize = 1000): void {
        const docs = this.getDocumentsFromCache();

        // No contents?  Nothing to do.
        if (docs === false) {
            return;
        }

        let document: Array<object> = [];
        let currentBatch: { file: string; size: number } = { file: null, size: 0 };
        docs.forEach((file) => {
            const nextObject = this.readSolrAddDocFromFile(file);
            if (nextObject?.add?.doc === undefined) {
                console.error(`Fatal error: Unexpected data in ${file}`);
                return;
            }
            document.push(nextObject.add.doc);
            if (currentBatch.file === null) {
                currentBatch.file = file.replace(new RegExp("^" + this.cacheDir), targetDir);
                console.log(`Starting batch ${currentBatch.file}`);
            }
            currentBatch.size++;
            if (currentBatch.size == batchSize) {
                this.writeFile(currentBatch.file, JSON.stringify(document));
                document = [];
                currentBatch = { file: null, size: 0 };
            }
        });
        if (currentBatch.size > 0) {
            this.writeFile(currentBatch.file, JSON.stringify(document));
        }
    }
}

export default SolrCache;
