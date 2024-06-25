import Solr from "./Solr";
import SolrCache from "./SolrCache";
import * as fs from "fs";

describe("Solr", () => {
    let solr;
    beforeEach(() => {
        solr = Solr.getInstance();
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    it("deletes records", async () => {
        const updateSpy = jest.spyOn(solr, "updateSolr").mockImplementation(jest.fn());
        const cacheSpy = jest.spyOn(SolrCache.getInstance(), "purgeFromCacheIfEnabled").mockImplementation(jest.fn());
        solr.deleteRecord("foo", "bar");
        expect(updateSpy).toHaveBeenCalledWith("foo", '{"delete":{"query":"id:\\"bar\\""}}');
        expect(cacheSpy).toHaveBeenCalledWith("bar");
    });

    it("indexes records", async () => {
        const updateSpy = jest.spyOn(solr, "updateSolr").mockImplementation(jest.fn());
        const cacheSpy = jest.spyOn(SolrCache.getInstance(), "writeToCacheIfEnabled").mockImplementation(jest.fn());
        solr.indexRecord("foo", { id: "bar", foo: "baz" });
        const expectedDoc = '{"add":{"doc":{"id":"bar","foo":"baz"}}}';
        expect(updateSpy).toHaveBeenCalledWith("foo", expectedDoc);
        expect(cacheSpy).toHaveBeenCalledWith("bar", expectedDoc);
    });

    it("reindexes from file", async () => {
        const fileContents = "blah blah";
        const fileSpy = jest.spyOn(fs, "readFileSync").mockReturnValue(fileContents);
        const updateSpy = jest.spyOn(solr, "updateSolr").mockImplementation(jest.fn());
        solr.reindexFromFile("foo", "/blah.txt");
        expect(fileSpy).toHaveBeenCalledWith("/blah.txt");
        expect(updateSpy).toHaveBeenCalledWith("foo", fileContents);
    });
});
