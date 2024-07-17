import GeneratePdf, { PdfGenerator } from "./GeneratePdf";
import fs = require("fs");
import http = require("needle");
import { Job } from "bullmq";
import Config from "../models/Config";
import FedoraDataCollector from "../services/FedoraDataCollector";
import FedoraDataCollection from "../models/FedoraDataCollection";

jest.mock("../models/FedoraObject");
jest.mock("needle");
jest.mock("tmp");
jest.mock("fs");

describe("PdfGenerator", () => {
    let generator;

    beforeEach(() => {
        Config.setInstance(new Config({ vufind_url: "http://foo" }));
        generator = PdfGenerator.build("test:123");
    });

    it("matches new object state to parent object state", async () => {
        const manifest = {
            sequences: [{ canvases: [{ images: [{ resource: { "@id": "http://foo/bar.jpg" } }] }] }],
        };
        http.mockResolvedValueOnce({ statusCode: 200, body: manifest });
        const fakePdf = "/path/to/foo.pdf";
        const generatePdfSpy = jest.spyOn(generator, "generatePdf").mockResolvedValue(fakePdf);
        const addPdfToPidSpy = jest.spyOn(generator, "addPdfToPid").mockImplementation(jest.fn());
        const fedoraObject = FedoraDataCollection.build("test:123");
        const getObjectSpy = jest
            .spyOn(FedoraDataCollector.getInstance(), "getObjectData")
            .mockResolvedValue(fedoraObject);
        await generator.run();
        expect(generatePdfSpy).toHaveBeenCalledWith(["http://foo/bar.jpg"]);
        expect(addPdfToPidSpy).toHaveBeenCalledWith(fakePdf, "Unknown");
        expect(getObjectSpy).toHaveBeenCalledWith("test:123");
        expect(fs.truncateSync).toHaveBeenCalledWith(fakePdf, 0);
        expect(fs.rmSync).toHaveBeenCalledWith(fakePdf);
    });
});

describe("GeneratePdf", () => {
    let generatePdf: GeneratePdf;
    beforeEach(() => {
        Config.setInstance(new Config({ vufind_url: "http://foo" }));
        generatePdf = new GeneratePdf();
    });

    describe("run", () => {
        let job: Job;
        beforeEach(() => {
            job = {
                data: {
                    pid: "test:123",
                },
            } as Job;
        });

        afterEach(() => {
            jest.restoreAllMocks();
        });

        it("fails if manifest cannot be retrieved", async () => {
            http.mockResolvedValueOnce({ statusCode: 500 });
            const consoleSpy = jest.spyOn(console, "error").mockImplementation(jest.fn());
            let thrown = null;
            try {
                await generatePdf.run(job);
            } catch (e) {
                thrown = e;
            }
            expect(http).toHaveBeenCalledWith("get", "http://foo/Item/test:123/Manifest");
            expect(consoleSpy).toHaveBeenCalledTimes(1);
            expect(consoleSpy).toHaveBeenCalledWith("Unexpected 500 status for http://foo/Item/test:123/Manifest");
            expect(thrown).not.toBeNull();
        });

        it("short-circuits if there is already a PDF", async () => {
            const manifest = {
                sequences: [{ rendering: [{ format: "application/pdf" }] }],
            };
            http.mockResolvedValueOnce({ statusCode: 200, body: manifest });
            const consoleSpy = jest.spyOn(console, "log").mockImplementation(jest.fn());
            await generatePdf.run(job);
            expect(http).toHaveBeenCalledWith("get", "http://foo/Item/test:123/Manifest");
            expect(consoleSpy).toHaveBeenCalledTimes(1);
            expect(consoleSpy).toHaveBeenCalledWith("test:123 already has a PDF; exiting early.");
        });

        it("short-circuits if there are no pages", async () => {
            const manifest = {};
            http.mockResolvedValueOnce({ statusCode: 200, body: manifest });
            const consoleSpy = jest.spyOn(console, "log").mockImplementation(jest.fn());
            await generatePdf.run(job);
            expect(http).toHaveBeenCalledWith("get", "http://foo/Item/test:123/Manifest");
            expect(consoleSpy).toHaveBeenCalledTimes(1);
            expect(consoleSpy).toHaveBeenCalledWith("test:123 contains no images; exiting early.");
        });
    });
});
