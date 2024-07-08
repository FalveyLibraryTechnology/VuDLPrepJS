import glob = require("glob");
import Config from "./Config";
import Job from "./Job";
import VideoOrder from "./VideoOrder";

jest.mock("../services/QueueManager");

describe("VideoOrder", () => {
    beforeEach(() => {
        Config.setInstance(new Config({}));
    });

    it("handles the Windows special case", () => {
        const globSpy = jest.spyOn(glob, "sync").mockReturnValue([]);
        const job = Job.build("c:/foo");
        VideoOrder.fromJob(job);
        expect(globSpy).toHaveBeenCalledWith("/foo/*.{avi,mkv,mov,mp4}", { nocase: true, root: "c:/" });
    });

    it("can reconstitute itself from raw data", () => {
        const raw = [{ filename: "foo.avi" }];
        const list = VideoOrder.fromRaw(raw);
        expect(list.raw()).toEqual(raw);
    });

    it("prioritizes file extensions appropriately", () => {
        const globSpy = jest
            .spyOn(glob, "sync")
            .mockReturnValue(["a.avi", "b.mp4", "c.avi", "c.mp4", "d.mp4", "d.avi", "e.mkv", "e.avi", "e.mp4"]);
        const job = Job.build("/foo");
        const list = VideoOrder.fromJob(job);
        expect(globSpy).toHaveBeenCalledWith("/foo/*.{avi,mkv,mov,mp4}", { nocase: true });
        expect(list.raw()).toEqual([
            { filename: "a.avi" }, // only option
            { filename: "b.mp4" }, // only option
            { filename: "c.avi" }, // best option (1st in list)
            { filename: "d.avi" }, // best option (2nd in list)
            { filename: "e.mkv" }, // best option (out of three options)
        ]);
    });
});
