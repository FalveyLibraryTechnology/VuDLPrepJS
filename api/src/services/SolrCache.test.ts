import { SolrAddDoc, SolrCache } from "./SolrCache";
import * as fs from "fs";
import glob = require("glob");

describe("SolrCache", () => {
    let existsSpy;
    let mkdirSpy;
    let writeFileSpy;
    let rmSpy;
    beforeEach(() => {
        existsSpy = jest.spyOn(fs, "existsSync").mockImplementation(jest.fn());
        mkdirSpy = jest.spyOn(fs, "mkdirSync").mockImplementation(jest.fn());
        writeFileSpy = jest.spyOn(fs, "writeFileSync").mockImplementation(jest.fn());
        rmSpy = jest.spyOn(fs, "rmSync").mockImplementation(jest.fn());
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    it("has a factory", () => {
        expect(SolrCache.getInstance()).toBeInstanceOf(SolrCache);
    });

    it("is disabled by default", () => {
        const cache = new SolrCache();
        expect(cache.getDocumentCachePath("vudl:123")).toBeFalsy();
        expect(cache.getDocumentsFromCache()).toBeFalsy();
        cache.purgeFromCacheIfEnabled("vudl:123");
        cache.writeToCacheIfEnabled("vudl:123", "foo");
        cache.exportCombinedFiles("/bar");
        cache.lockPidIfEnabled("vudl:123", "index");
        cache.unlockPidIfEnabled("vudl:123", "index");
        expect(existsSpy).not.toHaveBeenCalled();
        expect(mkdirSpy).not.toHaveBeenCalled();
        expect(writeFileSpy).not.toHaveBeenCalled();
        expect(rmSpy).not.toHaveBeenCalled();
    });

    it("purges files when enabled and they exist", () => {
        const cache = new SolrCache("/foo");
        existsSpy.mockReturnValue(true);
        cache.purgeFromCacheIfEnabled("vudl:123");
        const expectedPath = "/foo/vudl/000/000/123/123.json";
        expect(existsSpy).toHaveBeenCalledWith(expectedPath);
        expect(rmSpy).toHaveBeenCalledWith(expectedPath);
    });

    it("doesn't purge non-existent files when enabled", () => {
        const cache = new SolrCache("/foo");
        existsSpy.mockReturnValue(false);
        cache.purgeFromCacheIfEnabled("vudl:12345678901");
        const expectedPath = "/foo/vudl/345/678/901/12345678901.json";
        expect(existsSpy).toHaveBeenCalledWith(expectedPath);
        expect(rmSpy).not.toHaveBeenCalled();
    });

    it("writes to cache when enabled", () => {
        const cache = new SolrCache("/foo");
        const expectedDirName = "/foo/vudl/000/000/123";
        const expectedPath = expectedDirName + "/123.json";
        existsSpy.mockReturnValue(false);
        cache.writeToCacheIfEnabled("vudl:123", "foo");
        expect(existsSpy).toHaveBeenCalledWith(expectedDirName);
        expect(mkdirSpy).toHaveBeenCalledWith(expectedDirName, { recursive: true });
        expect(writeFileSpy).toHaveBeenCalledWith(expectedPath, "foo");
    });

    it("retrieves documents from the cache", () => {
        const cache = new SolrCache("/foo");
        const fakeOutput = ["foo", "bar"];
        const globSpy = jest.spyOn(glob, "sync").mockReturnValue(fakeOutput);
        const list = cache.getDocumentsFromCache();
        expect(list).toEqual(fakeOutput);
        expect(globSpy).toHaveBeenCalledWith("/foo/**/**/**/*.json", { nocase: true });
    });

    it("retrieves documents from the cache using Windows-style paths", () => {
        const cache = new SolrCache("c:/foo");
        const fakeOutput = ["foo", "bar"];
        const globSpy = jest.spyOn(glob, "sync").mockReturnValue(fakeOutput);
        const list = cache.getDocumentsFromCache();
        expect(list).toEqual(fakeOutput);
        expect(globSpy).toHaveBeenCalledWith("/foo/**/**/**/*.json", { nocase: true, root: "c:/" });
    });

    it("exports and combines the cache", () => {
        const cache = new SolrCache("/foo");
        const docsSpy = jest
            .spyOn(cache, "getDocumentsFromCache")
            .mockReturnValue(["/foo/one", "/foo/two", "/foo/three"]);
        const readSpy = jest.spyOn(cache, "readSolrAddDocFromFile").mockImplementation((file: string): SolrAddDoc => {
            return { add: { doc: { file } } };
        });
        existsSpy.mockReturnValue(true);
        const logSpy = jest.spyOn(console, "log").mockImplementation(jest.fn());
        cache.exportCombinedFiles("/bar", 2);
        expect(docsSpy).toHaveBeenCalledTimes(1);
        expect(readSpy).toHaveBeenCalledTimes(3);
        expect(existsSpy).toHaveBeenCalled();
        expect(writeFileSpy).toHaveBeenCalledTimes(2);
        expect(writeFileSpy).toHaveBeenCalledWith("/bar/one", '[{"file":"/foo/one"},{"file":"/foo/two"}]');
        expect(writeFileSpy).toHaveBeenCalledWith("/bar/three", '[{"file":"/foo/three"}]');
        expect(logSpy).toHaveBeenCalledTimes(2);
        expect(logSpy).toHaveBeenCalledWith("Starting batch /bar/one");
        expect(logSpy).toHaveBeenCalledWith("Starting batch /bar/three");
    });

    it("skips and reports bad files while exporting", () => {
        const cache = new SolrCache("/foo");
        const docsSpy = jest
            .spyOn(cache, "getDocumentsFromCache")
            .mockReturnValue(["/foo/one", "/foo/two", "/foo/three"]);
        const readSpy = jest.spyOn(cache, "readSolrAddDocFromFile").mockImplementation(jest.fn());
        const logSpy = jest.spyOn(console, "log").mockImplementation(jest.fn());
        const errorSpy = jest.spyOn(console, "error").mockImplementation(jest.fn());
        cache.exportCombinedFiles("/bar", 2);
        expect(docsSpy).toHaveBeenCalledTimes(1);
        expect(readSpy).toHaveBeenCalledTimes(3);
        expect(existsSpy).not.toHaveBeenCalled();
        expect(writeFileSpy).not.toHaveBeenCalled();
        expect(logSpy).not.toHaveBeenCalled();
        expect(errorSpy).toHaveBeenCalledTimes(3);
        expect(errorSpy).toHaveBeenCalledWith("Fatal error: Unexpected data in /foo/one");
        expect(errorSpy).toHaveBeenCalledWith("Fatal error: Unexpected data in /foo/two");
        expect(errorSpy).toHaveBeenCalledWith("Fatal error: Unexpected data in /foo/three");
    });

    it("can read Solr docs from disk", () => {
        const cache = new SolrCache();
        const readSpy = jest.spyOn(fs, "readFileSync").mockReturnValue('{"add":{"doc":{}}}');
        expect(cache.readSolrAddDocFromFile("foo")).toEqual({ add: { doc: {} } });
        expect(readSpy).toHaveBeenCalledWith("foo");
    });

    it("creates lock files when enabled", () => {
        const cache = new SolrCache("/foo");
        cache.lockPidIfEnabled("foo:123", "index");
        expect(mkdirSpy).toHaveBeenCalledWith("/foo/foo/000/000/123", { recursive: true });
        expect(writeFileSpy).toHaveBeenCalledWith("/foo/foo/000/000/123/123.index.lock", "");
    });

    it("removes lock files when enabled", () => {
        const cache = new SolrCache("/foo");
        existsSpy.mockReturnValue(true);
        cache.unlockPidIfEnabled("foo:123", "index");
        expect(existsSpy).toHaveBeenCalledWith("/foo/foo/000/000/123/123.index.lock");
        expect(rmSpy).toHaveBeenCalledWith("/foo/foo/000/000/123/123.index.lock");
    });

    it("throws an exception if something goes wrong during unlock", () => {
        const cache = new SolrCache("/foo");
        existsSpy.mockReturnValue(true);
        const testError = new Error("test!");
        rmSpy.mockImplementation(() => {
            throw testError;
        });
        let thrownException = null;
        try {
            cache.unlockPidIfEnabled("foo:123", "index");
        } catch (e) {
            thrownException = e;
        }
        expect(thrownException).toEqual(testError);
    });

    it("reports lock status based on file existence", () => {
        const cache = new SolrCache("/foo");
        existsSpy.mockReturnValueOnce(true).mockReturnValueOnce(false);
        expect(cache.isPidLocked("foo:123", "index")).toBeTruthy();
        expect(cache.isPidLocked("foo:123", "index")).toBeFalsy();
        expect(existsSpy).toHaveBeenCalledTimes(2);
        expect(existsSpy).toHaveBeenCalledWith("/foo/foo/000/000/123/123.index.lock");
    });

    it("returns false for non-cached documents", () => {
        const cache = new SolrCache("/foo");
        existsSpy.mockReturnValue(false);
        expect(cache.getDocumentFromCache("foo:123")).toBeFalsy();
        expect(existsSpy).toHaveBeenCalledWith("/foo/foo/000/000/123/123.json");
    });

    it("returns false for invalid cached documents", () => {
        const cache = new SolrCache("/foo");
        existsSpy.mockReturnValue(true);
        const readSpy = jest.spyOn(cache, "readSolrAddDocFromFile").mockReturnValue({});
        expect(cache.getDocumentFromCache("foo:123")).toBeFalsy();
        expect(existsSpy).toHaveBeenCalledWith("/foo/foo/000/000/123/123.json");
        expect(readSpy).toHaveBeenCalledTimes(1);
    });

    it("can fetch documents from the cache", () => {
        const cache = new SolrCache("/foo");
        existsSpy.mockReturnValue(true);
        const readSpy = jest.spyOn(cache, "readSolrAddDocFromFile").mockReturnValue({
            add: {
                doc: {
                    foo: "bar",
                },
            },
        });
        expect(cache.getDocumentFromCache("foo:123")).toEqual({ foo: "bar" });
        expect(existsSpy).toHaveBeenCalledWith("/foo/foo/000/000/123/123.json");
        expect(readSpy).toHaveBeenCalledTimes(1);
    });

    it("disallows lock file generation when disabled", () => {
        const cache = new SolrCache();
        let errorMsg = "";
        try {
            cache.getLockFileForPid("foo:123", "index");
        } catch (e) {
            errorMsg = e.message;
        }
        expect(errorMsg).toEqual("getLockFileForPid not supported when cache disabled");
    });
});
