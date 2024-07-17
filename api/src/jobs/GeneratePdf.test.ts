import GeneratePdf from "./GeneratePdf";
import http = require("needle");
import { Job } from "bullmq";
import Config from "../models/Config";

jest.mock("../models/FedoraObject");
jest.mock("needle");
jest.mock("tmp");
jest.mock("fs");

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
    });
});
