import { getRecentPidsCatalog, updateRecentPidsCatalog } from "./RecentPidsCatalog";

describe("RecentPidsCatalog", () => {
    it("can update the recent PID list", () => {
        updateRecentPidsCatalog("foo:123", "test title");
        expect(getRecentPidsCatalog()).toEqual({"foo:123": "test title"});
    });

    it("can recover from garbage data in storage", () => {
        sessionStorage.setItem("recentPids", "invalid garbage");
        expect(getRecentPidsCatalog()).toEqual({});
    });

    it("enforces a limit of 10 PIDs remembered", () => {
        for (let x = 0; x < 15; x++) {
            updateRecentPidsCatalog(`foo:${x}`, `title #${x}`);
        }
        expect(getRecentPidsCatalog()).toEqual({
            "foo:14": "title #14",
            "foo:13": "title #13",
            "foo:12": "title #12",
            "foo:11": "title #11",
            "foo:10": "title #10",
            "foo:9": "title #9",
            "foo:8": "title #8",
            "foo:7": "title #7",
            "foo:6": "title #6",
            "foo:5": "title #5",
        });
    });
});
