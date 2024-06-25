import Config from "../models/Config";
import Job from "../models/Job";
import { FedoraObject } from "../models/FedoraObject";
import FedoraObjectFactory from "../services/FedoraObjectFactory";
import { IngestProcessor } from "./Ingest";
import Database from "../services/Database";
import QueueManager from "../services/QueueManager";
import SolrCache from "../services/SolrCache";
import fs = require("fs");
import winston = require("winston");

// We have an indirect dependency on ImageFile, but we don't really want
// to load it for the context of this test.
jest.mock("../models/ImageFile.ts", () => {
    return {};
});

describe("IngestProcessor", () => {
    let ingest: IngestProcessor;
    let config: Config;
    let logger: winston.Logger;
    let dir: string;
    let jobName: string;
    let job: Job;
    beforeEach(() => {
        dir = "/my/fake/dir";
        jobName = "fakejob";
        config = new Config({ processed_area_path: "/fake_processed" });
        Config.setInstance(config);
        logger = winston.createLogger({
            level: "error", // we don't want to see info messages while testing
            transports: [new winston.transports.Console()],
        });
        job = new Job(dir + "/" + jobName, config, new QueueManager(config, new SolrCache(false)));
        jest.spyOn(Job, "build").mockReturnValue(job);
        ingest = new IngestProcessor(dir, config, new FedoraObjectFactory(config, {} as Database), logger);
    });
    afterEach(() => {
        jest.clearAllMocks();
    });
    describe("finalizeTitle", () => {
        it("creates a title based on the directory path", async () => {
            const fedoraObject = FedoraObject.build("foo:123", null, config);
            const labelSpy = jest.spyOn(fedoraObject, "modifyObjectLabel").mockImplementation(jest.fn());
            const datastreamSpy = jest
                .spyOn(fedoraObject, "getDatastream")
                .mockResolvedValue("<oai:dc><dc:title>Incomplete... / Processing...</dc:title></oai:dc>");
            const replaceSpy = jest.spyOn(ingest, "replaceDCMetadata").mockImplementation(jest.fn());
            await ingest.finalizeTitle(fedoraObject);
            expect(labelSpy).toHaveBeenCalledTimes(1);
            expect(labelSpy).toHaveBeenCalledWith("fakejob_dir_fake_my");
            expect(datastreamSpy).toHaveBeenCalledTimes(1);
            expect(datastreamSpy).toHaveBeenCalledWith("DC");
            expect(replaceSpy).toHaveBeenCalledTimes(1);
            expect(replaceSpy).toHaveBeenCalledWith(
                fedoraObject,
                "<oai:dc><dc:title>fakejob_dir_fake_my</dc:title></oai:dc>",
                "Set dc:title to ingest/process path",
            );
        });
    });
    describe("moveDirectory", () => {
        it("moves the directory appropriately", () => {
            const expectedTargetParent = "/fake_processed/2\\d\\d\\d-\\d\\d-\\d\\d/fake";
            const expectedTargetParentRegEx = new RegExp(expectedTargetParent);
            const expectedTarget = expectedTargetParent + "/fakejob";
            const expectedTargetRegEx = new RegExp(expectedTarget);
            const expectedLockRegEx = new RegExp(expectedTarget + "/ingest.lock");
            const existsSpy = jest.spyOn(fs, "existsSync").mockReturnValueOnce(false).mockReturnValueOnce(true);
            const renameSpy = jest.spyOn(fs, "renameSync").mockImplementation(jest.fn());
            const rmSpy = jest.spyOn(fs, "rmSync").mockImplementation(jest.fn());
            ingest.moveDirectory();
            expect(existsSpy).toHaveBeenCalledTimes(2);
            expect(existsSpy).toHaveBeenNthCalledWith(1, expect.stringMatching(expectedTargetRegEx));
            expect(existsSpy).toHaveBeenNthCalledWith(2, expect.stringMatching(expectedTargetParentRegEx));
            expect(renameSpy).toHaveBeenCalledTimes(1);
            expect(renameSpy).toHaveBeenCalledWith(job.dir, expect.stringMatching(expectedTargetRegEx));
            expect(rmSpy).toHaveBeenCalledTimes(1);
            expect(rmSpy).toHaveBeenCalledWith(expect.stringMatching(expectedLockRegEx));
        });
    });
});
