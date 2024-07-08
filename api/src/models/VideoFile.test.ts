import fs = require("fs");
import VideoFile from "./VideoFile";
import Config from "./Config";

describe("VideoFile", () => {
    let video: VideoFile;
    beforeEach(() => {
        video = new VideoFile("test1.mkv", "/test2", new Config({}));
    });

    it("should return the filename", () => {
        expect(video.filename).toEqual("test1.mkv");
    });

    it("generates appropriate derivative paths", () => {
        expect(video.derivativePath("mp4")).toEqual("/test2/test1.mp4");
    });

    it("returns a text transcript path when it exists", () => {
        jest.spyOn(fs, "existsSync").mockReturnValue(true);
        expect(video.textTranscript).toEqual("/test2/test1.txt");
    });

    it("returns null when a text transcript does not exist", () => {
        jest.spyOn(fs, "existsSync").mockReturnValue(false);
        expect(video.textTranscript).toEqual(null);
    });

    it("returns a VTT transcript path when it exists", () => {
        jest.spyOn(fs, "existsSync").mockReturnValue(true);
        expect(video.vtt).toEqual("/test2/test1.vtt");
    });

    it("returns null when a VTT transcript does not exist", () => {
        jest.spyOn(fs, "existsSync").mockReturnValue(false);
        expect(video.vtt).toEqual(null);
    });

    it("derives correct mime types from extensions", () => {
        const testData: Record<string, string> = {
            "test.avi": "video/x-msvideo",
            "test.AVI": "video/x-msvideo",
            "test.mkv": "video/x-matroska",
            "test.mov": "video/quicktime",
            "test.mp4": "video/mp4",
        };
        for (const filename in testData) {
            video = new VideoFile(filename, "/test2", new Config({}));
            expect(video.mimeType).toEqual(testData[filename]);
        }
    });
});
