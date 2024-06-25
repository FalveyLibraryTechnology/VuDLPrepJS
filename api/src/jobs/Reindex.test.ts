import Reindex from "./Reindex";
import { Job } from "bullmq";
import { NeedleResponse } from "../services/interfaces";
import Solr from "../services/Solr";

jest.mock("../services/SolrIndexer");

describe("Reindex", () => {
    let reindex: Reindex;
    beforeEach(() => {
        reindex = new Reindex();
    });

    describe("run", () => {
        let job: Job;
        let needleResponse: NeedleResponse;
        let consoleErrorSpy;
        let consoleLogSpy;
        beforeEach(() => {
            needleResponse = {
                statusCode: 200,
            } as NeedleResponse;
            job = {
                data: {
                    file: "foo.json",
                },
            } as Job;
            consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(jest.fn());
            consoleLogSpy = jest.spyOn(console, "log").mockImplementation(jest.fn());
        });

        afterEach(() => {
            jest.restoreAllMocks();
        });

        it("rejects bad input", async () => {
            job = null;
            let expectedException = null;
            try {
                await reindex.run(job);
            } catch (e) {
                expectedException = e;
            }
            expect(consoleLogSpy).toHaveBeenCalledWith("Reindexing...", undefined);
            expect(expectedException).not.toBeNull();
            expect(expectedException.message).toEqual("No file provided!");
        });

        it("reindexes the file", async () => {
            const reindexSpy = jest.spyOn(Solr.getInstance(), "reindexFromFile").mockResolvedValue(needleResponse);

            await reindex.run(job);

            expect(consoleErrorSpy).toHaveBeenCalledTimes(0);
            expect(consoleLogSpy).toHaveBeenCalledTimes(1);
            expect(consoleLogSpy).toHaveBeenCalledWith("Reindexing...", job.data);
            expect(reindexSpy).toHaveBeenCalledWith("biblio", job.data.file);
        });

        it("handles Solr failure", async () => {
            needleResponse.statusCode = 500;
            const reindexSpy = jest.spyOn(Solr.getInstance(), "reindexFromFile").mockResolvedValue(needleResponse);

            let expectedException = null;
            try {
                await reindex.run(job);
            } catch (e) {
                expectedException = e;
            }

            expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
            expect(consoleLogSpy).toHaveBeenCalledTimes(1);
            expect(consoleLogSpy).toHaveBeenCalledWith("Reindexing...", job.data);
            expect(reindexSpy).toHaveBeenCalledWith("biblio", job.data.file);
            expect(expectedException).not.toBeNull();
            expect(expectedException.message).toEqual("Problem reindexing from foo.json: unspecified error");
            expect(consoleErrorSpy).toHaveBeenCalledWith(expectedException.message);
        });
    });
});
