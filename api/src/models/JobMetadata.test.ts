import fs = require("fs");
import Config from "./Config";
import Job from "./Job";
import JobMetadata from "./JobMetadata";
import PageOrder from "./PageOrder";
import QueueManager from "../services/QueueManager";
import SolrCache from "../services/SolrCache";
import VideoOrder from "./VideoOrder";

jest.mock("./Config");
jest.mock("../services/QueueManager");

// We have an indirect dependency on ImageFile, but we don't really want
// to load it for the context of this test.
jest.mock("./ImageFile", () => {
    return {};
});

describe("JobMetadata", () => {
    let config: Config;
    let job: Job;
    let jobMetadata: JobMetadata;

    beforeEach(() => {
        config = new Config({});
        job = new Job("test1", config, new QueueManager(config, new SolrCache(false)));
        jobMetadata = new JobMetadata(job);
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    describe("dublinCore", () => {
        it("provides Dublin Core when it exists", () => {
            const filename = "test1/dc.xml";
            const existsSpy = jest.spyOn(fs, "existsSync").mockReturnValue(true);
            const readSpy = jest.spyOn(fs, "readFileSync").mockReturnValue(Buffer.from("foo"));
            expect(jobMetadata.dublinCore).toEqual("foo");
            expect(existsSpy).toHaveBeenCalledWith(filename);
            expect(readSpy).toHaveBeenCalledWith(filename);
        });
    });

    describe("fileProblems", () => {
        it("detects file problems correctly", () => {
            jobMetadata.order = PageOrder.fromRaw([
                { filename: "foo.jpg", label: "1" },
                { filename: "bar.jpg", label: "2" },
            ]);
            const mockedFileOrder = PageOrder.fromRaw([
                { filename: "baz.jpg", label: "3" },
                { filename: "bar.jpg", label: "2" },
            ]);
            const fromJobSpy = jest.spyOn(PageOrder, "fromJob").mockReturnValue(mockedFileOrder);
            expect(jobMetadata.fileProblems).toEqual({ deleted: ["foo.jpg"], added: ["baz.jpg"] });
            expect(fromJobSpy).toHaveBeenCalledWith(jobMetadata.job);
        });
    });

    describe("uploadTime", () => {
        it("provides the most recent file update time from a job", () => {
            jobMetadata.order = PageOrder.fromRaw([
                { filename: "foo.jpg", label: "1" },
                { filename: "bar.jpg", label: "2" },
            ]);
            const oldDate = new Date("2020-01-01T00:00:00");
            const newDate = new Date("2022-01-01T00:00:00");
            const statSpy = jest
                .spyOn(fs, "statSync")
                .mockReturnValueOnce({ mtime: oldDate } as fs.Stats)
                .mockReturnValueOnce({ mtime: newDate } as fs.Stats);
            expect(jobMetadata.uploadTime).toEqual(newDate.getTime() / 1000);
            expect(statSpy).toHaveBeenCalledTimes(2);
            expect(statSpy).toHaveBeenCalledWith("test1/foo.jpg");
            expect(statSpy).toHaveBeenCalledWith("test1/bar.jpg");
        });

        it("ignores exceptions when detecting the most recent file update time from a job", () => {
            jobMetadata.order = PageOrder.fromRaw([
                { filename: "foo.jpg", label: "1" },
                { filename: "bar.jpg", label: "2" },
            ]);
            const newDate = new Date("2022-01-01T00:00:00");
            const kaboom = new Error("kaboom");
            const errorSpy = jest.spyOn(console, "error").mockImplementation(jest.fn());
            const statSpy = jest
                .spyOn(fs, "statSync")
                .mockImplementationOnce(() => {
                    throw kaboom;
                })
                .mockReturnValueOnce({ mtime: newDate } as fs.Stats);
            expect(jobMetadata.uploadTime).toEqual(newDate.getTime() / 1000);
            expect(statSpy).toHaveBeenCalledTimes(2);
            expect(statSpy).toHaveBeenCalledWith("test1/foo.jpg");
            expect(statSpy).toHaveBeenCalledWith("test1/bar.jpg");
            expect(errorSpy).toHaveBeenCalledWith(kaboom);
        });

        it("provides the directory update time from a job with no files", () => {
            jobMetadata.order = PageOrder.fromRaw([]);
            const newDate = new Date("2022-01-01T00:00:00");
            const statSpy = jest.spyOn(fs, "statSync").mockReturnValueOnce({ mtime: newDate } as fs.Stats);
            expect(jobMetadata.uploadTime).toEqual(newDate.getTime() / 1000);
            expect(statSpy).toHaveBeenCalledTimes(1);
            expect(statSpy).toHaveBeenCalledWith("test1");
        });
    });

    describe("video", () => {
        it("automatically creates a video order as needed", () => {
            expect(jobMetadata.video.raw()).toEqual([]);
        });

        it("allows setting of a video list", () => {
            const video = new VideoOrder([]);
            jobMetadata.video = video;
            expect(jobMetadata.video).toEqual(video);
        });

        it("allows setting of a video list from raw data", () => {
            const video = [{ filename: "a.avi" }];
            jobMetadata.setVideoFromRaw(video);
            expect(jobMetadata.video.raw()).toEqual(video);
        });
    });
});
