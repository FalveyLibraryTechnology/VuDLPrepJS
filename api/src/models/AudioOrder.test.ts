import glob = require("glob");
import Config from "./Config";
import Job from "./Job";
import AudioOrder from "./AudioOrder";

jest.mock("../services/QueueManager");

describe("AudioOrder", () => {
    beforeEach(() => {
        Config.setInstance(new Config({}));
    });

    it("handles the Windows special case", () => {
        const globSpy = jest.spyOn(glob, "sync").mockReturnValue([]);
        const job = Job.build("c:/foo");
        AudioOrder.fromJob(job);
        expect(globSpy).toHaveBeenCalledWith("/foo/*.flac", { nocase: true, root: "c:/" });
    });

    it("can reconstitute itself from raw data", () => {
        const raw = [{ filename: "foo.flac" }];
        const list = AudioOrder.fromRaw(raw);
        expect(list.raw()).toEqual(raw);
    });

    it("can build a list from a directory listing", () => {
        const globSpy = jest.spyOn(glob, "sync").mockReturnValue(["a.flac", "b.flac"]);
        const job = Job.build("/foo");
        const list = AudioOrder.fromJob(job);
        expect(globSpy).toHaveBeenCalledWith("/foo/*.flac", { nocase: true });
        expect(list.raw()).toEqual([{ filename: "a.flac" }, { filename: "b.flac" }]);
    });
});
