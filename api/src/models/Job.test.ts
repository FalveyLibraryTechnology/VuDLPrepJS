import Config from "./Config";
import Job from "./Job";
import QueueManager from "../services/QueueManager";
import SolrCache from "../services/SolrCache";

jest.mock("./Config");
jest.mock("../services/QueueManager");

// We have an indirect dependency on ImageFile, but we don't really want
// to load it for the context of this test.
jest.mock("./ImageFile", () => {
    return {};
});

describe("Job", () => {
    let job: Job;

    beforeEach(() => {
        const config = new Config({});
        job = new Job("test1", config, new QueueManager(config, new SolrCache(false)));
    });

    it("should return the name", () => {
        expect(job.name).toEqual("test1");
    });
});
