import Derivative from "./Derivative";
import { Job } from "bullmq";
import ImageFile from "../models/ImageFile";
import Page from "../models/Page";
import PageOrder from "../models/PageOrder";
import fs = require("fs");
import Config from "../models/Config";

jest.mock("fs");

describe("Derivative", () => {
    let derivative: Derivative;
    beforeEach(() => {
        derivative = new Derivative();
    });

    describe("run", () => {
        let job: Job;
        let consoleErrorSpy;
        let consoleLogSpy;
        beforeEach(() => {
            job = {
                data: {
                    dir: "/foo/bar",
                },
            } as Job;
            consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(jest.fn());
            consoleLogSpy = jest.spyOn(console, "log").mockImplementation(jest.fn());
        });

        afterEach(() => {
            jest.restoreAllMocks();
        });

        it("builds derivatives", async () => {
            const page = new Page("foo.tif", "label");
            const fromJobSpy = jest.spyOn(PageOrder, "fromJob").mockReturnValue(new PageOrder([page]));
            const image = new ImageFile("foo.tif", new Config({}));
            const imageDerivSpy = jest.spyOn(image, "derivative").mockResolvedValue("fake.jpg");
            const imageBuildSpy = jest.spyOn(ImageFile, "build").mockReturnValue(image);
            await derivative.run(job);
            expect(fromJobSpy).toHaveBeenCalledWith({ dir: "/foo/bar" });
            expect(imageBuildSpy).toHaveBeenCalledWith("/foo/bar/foo.tif");
            expect(imageDerivSpy).toHaveBeenCalledTimes(3);
            expect(imageDerivSpy).toHaveBeenCalledWith("THUMBNAIL");
            expect(imageDerivSpy).toHaveBeenCalledWith("MEDIUM");
            expect(imageDerivSpy).toHaveBeenCalledWith("LARGE");
            expect(fs.rmSync).toHaveBeenCalledWith("/foo/bar/derivatives.lock");
            expect(consoleLogSpy).toHaveBeenCalledWith(": build derivatives done");
        });
    });
});
