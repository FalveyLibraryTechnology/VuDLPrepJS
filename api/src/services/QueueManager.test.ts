import QueueManager from "./QueueManager";
import { Queue } from "bullmq";
import * as BullMQ from "bullmq";
import Config from "../models/Config";
import SolrCache from "../services/SolrCache";

let workerArgs;
function workerConstructor(...args) {
    workerArgs = args;
}
jest.mock("bullmq", () => {
    return {
        Queue: jest.fn(),
        Worker: jest.fn().mockImplementation(workerConstructor),
    };
});

Queue.prototype.add = jest.fn();
Queue.prototype.close = jest.fn();
Queue.prototype.getJobs = jest.fn();

describe("QueueManager", () => {
    let queueManager;
    beforeEach(() => {
        Config.setInstance(new Config({}));
        queueManager = QueueManager.getInstance();
    });
    afterEach(() => {
        jest.clearAllMocks();
    });

    describe("buildDerivatives", () => {
        let addSpy;
        beforeEach(() => {
            addSpy = jest.spyOn(Queue.prototype, "add").mockImplementation(jest.fn());
        });

        it("queues a job appropriately", async () => {
            await queueManager.buildDerivatives("foo");
            expect(addSpy).toHaveBeenCalledWith("derivatives", { dir: "foo" });
        });
    });

    describe("ingestJob", () => {
        let addSpy;
        let constructorSpy;
        beforeEach(() => {
            addSpy = jest.spyOn(Queue.prototype, "add").mockImplementation(jest.fn());
            constructorSpy = jest.spyOn(BullMQ, "Queue");
        });

        it("queues a job appropriately with default configuration", async () => {
            await queueManager.ingestJob("foo");
            expect(addSpy).toHaveBeenCalledWith("ingest", { dir: "foo" });
            expect(constructorSpy).toHaveBeenCalledWith("vudl", { connection: {} });
        });

        it("supports non-default queue/connection configuration", async () => {
            const customQueueManager = new QueueManager(
                new Config({ queue: { connection: { foo: "bar" }, jobMap: { ingest: "vudl-foo" } } }),
                new SolrCache(false),
            );
            await customQueueManager.ingestJob("foo");
            expect(addSpy).toHaveBeenCalledWith("ingest", { dir: "foo" });
            expect(constructorSpy).toHaveBeenCalledWith("vudl-foo", { connection: { foo: "bar" } });
        });
    });

    describe("generatePdf", () => {
        let addSpy;
        beforeEach(() => {
            addSpy = jest.spyOn(Queue.prototype, "add").mockImplementation(jest.fn());
        });

        it("queues a job appropriately", async () => {
            await queueManager.generatePdf("foo");
            expect(addSpy).toHaveBeenCalledWith("generatepdf", { pid: "foo" });
        });
    });

    describe("getWorker", () => {
        it("will return a correctly configured worker", () => {
            const callback = jest.fn();
            queueManager.getWorker(callback);
            expect(workerArgs[0]).toEqual("vudl");
            expect(workerArgs[1]).toEqual(callback);
            expect(workerArgs[2]).toEqual({
                connection: Config.getInstance().redisConnectionSettings,
                lockDuration: 30000,
            });
        });
    });

    describe("hasPendingIndexJob", () => {
        it("will search the queue for duplicates when cache is disabled", async () => {
            const job = {
                name: "index",
                data: {
                    pid: "123",
                    action: "index",
                },
            };
            const jobs = [];
            jobs.push(job);
            const queue = new Queue("foo");
            const getJobsSpy = jest.spyOn(queue, "getJobs").mockResolvedValue(jobs);
            expect(await queueManager.hasPendingIndexJob(queue, job.data)).toBeTruthy();
            expect(await queueManager.hasPendingIndexJob(queue, { pid: "nope", action: "maybe" })).toBeFalsy();
            expect(getJobsSpy).toHaveBeenCalled();
        });

        it("will use the cache when enabled", async () => {
            const cache = new SolrCache("/foo");
            const enabledSpy = jest.spyOn(cache, "isEnabled").mockReturnValue(true);
            const lockedSpy = jest.spyOn(cache, "isPidLocked").mockReturnValueOnce(true).mockReturnValueOnce(false);
            const cachedManager = new QueueManager(Config.getInstance(), cache);
            const queue = new Queue("foo");
            const getJobsSpy = jest.spyOn(queue, "getJobs").mockImplementation(jest.fn());
            const jobData = { pid: "foo", action: "bar" };
            expect(await cachedManager.hasPendingIndexJob(queue, jobData)).toBeTruthy();
            expect(await cachedManager.hasPendingIndexJob(queue, jobData)).toBeFalsy();
            expect(getJobsSpy).not.toHaveBeenCalled();
            expect(enabledSpy).toHaveBeenCalledTimes(2);
            expect(lockedSpy).toHaveBeenCalledTimes(2);
            expect(lockedSpy).toHaveBeenCalledWith("foo", "bar");
        });
    });

    describe("performIndexOperation", () => {
        let addSpy;
        let purgeSpy;
        let lockSpy;
        beforeEach(() => {
            addSpy = jest.spyOn(Queue.prototype, "add").mockImplementation(jest.fn());
            purgeSpy = jest.spyOn(SolrCache.prototype, "purgeFromCacheIfEnabled").mockImplementation(jest.fn());
            lockSpy = jest.spyOn(SolrCache.prototype, "lockPidIfEnabled").mockImplementation(jest.fn());
        });

        it("will not queue an index operation if it already exists (by default)", async () => {
            const consoleSpy = jest.spyOn(console, "log").mockImplementation(jest.fn());
            const pendingSpy = jest.spyOn(queueManager, "hasPendingIndexJob").mockReturnValue(true);
            await queueManager.performIndexOperation("123", "index");
            expect(pendingSpy).toHaveBeenCalledWith(expect.anything(), { pid: "123", action: "index" });
            expect(addSpy).not.toHaveBeenCalled();
            expect(consoleSpy).toHaveBeenCalledTimes(1);
            expect(consoleSpy).toHaveBeenCalledWith("Skipping queue; 123 is already awaiting index.");
            expect(purgeSpy).not.toHaveBeenCalled();
            expect(lockSpy).not.toHaveBeenCalled();
        });

        it("will queue an index operation if it already exists if you force it", async () => {
            const pendingSpy = jest.spyOn(queueManager, "hasPendingIndexJob").mockReturnValue(true);
            await queueManager.performIndexOperation("123", "index", true);
            expect(pendingSpy).not.toHaveBeenCalled();
            expect(addSpy).toHaveBeenCalledWith("index", { pid: "123", action: "index" });
            expect(purgeSpy).toHaveBeenCalledWith("123");
            expect(lockSpy).toHaveBeenCalledWith("123", "index");
        });

        it("will queue an index operation if it is not a duplicate", async () => {
            const pendingSpy = jest.spyOn(queueManager, "hasPendingIndexJob").mockReturnValue(false);
            await queueManager.performIndexOperation("123", "index");
            expect(pendingSpy).toHaveBeenCalledWith(expect.anything(), { pid: "123", action: "index" });
            expect(addSpy).toHaveBeenCalledWith("index", { pid: "123", action: "index" });
            expect(purgeSpy).toHaveBeenCalledWith("123");
            expect(lockSpy).toHaveBeenCalledWith("123", "index");
        });

        it("will not purge the queue for reindex_children operations", async () => {
            const pendingSpy = jest.spyOn(queueManager, "hasPendingIndexJob").mockReturnValue(false);
            await queueManager.performIndexOperation("123", "reindex_children");
            expect(pendingSpy).toHaveBeenCalledWith(expect.anything(), { pid: "123", action: "reindex_children" });
            expect(addSpy).toHaveBeenCalledWith("index", { pid: "123", action: "reindex_children" });
            expect(purgeSpy).not.toHaveBeenCalled();
            expect(lockSpy).toHaveBeenCalledWith("123", "reindex_children");
        });
    });

    describe("sendNotification", () => {
        it("will pass along values as expected", () => {
            const spy = jest.spyOn(queueManager, "addToQueue").mockImplementation(jest.fn());
            queueManager.sendNotification("foo", "bar");
            expect(spy).toHaveBeenCalledWith("notify", { body: "foo", channel: "bar" });
        });
    });

    describe("performCacheReindexOperation", () => {
        it("will pass along values as expected", () => {
            const spy = jest.spyOn(queueManager, "addToQueue").mockImplementation(jest.fn());
            queueManager.performCacheReindexOperation("foo");
            expect(spy).toHaveBeenCalledWith("reindex", { file: "foo" });
        });
    });

    describe("queueMetadataOperation", () => {
        let jobs;
        let getJobsSpy;
        let addSpy;
        beforeEach(() => {
            jobs = [];
            getJobsSpy = jest.spyOn(Queue.prototype, "getJobs").mockResolvedValue(jobs);
            addSpy = jest.spyOn(Queue.prototype, "add").mockImplementation(jest.fn());
        });

        it("will not queue a metadata operation if it already exists (by default)", async () => {
            jobs.push({
                name: "metadata",
                data: {
                    pid: "123",
                    action: "add",
                },
            });
            const consoleSpy = jest.spyOn(console, "log").mockImplementation(jest.fn());
            await queueManager.queueMetadataOperation("123", "add");
            expect(addSpy).not.toHaveBeenCalled();
            expect(consoleSpy).toHaveBeenCalledTimes(1);
            expect(consoleSpy).toHaveBeenCalledWith("Skipping queue; 123 is already awaiting add.");
        });

        it("will queue a metadata operation if it already exists if you force it", async () => {
            jobs.push({
                name: "metadata",
                data: {
                    pid: "123",
                    action: "add",
                },
            });
            await queueManager.queueMetadataOperation("123", "add", true);
            expect(addSpy).toHaveBeenCalledWith("metadata", { pid: "123", action: "add" });
        });

        it("will queue a metadata operation", async () => {
            await queueManager.queueMetadataOperation("123", "add");

            expect(getJobsSpy).toHaveBeenCalledWith("wait");
            expect(addSpy).toHaveBeenCalledWith("metadata", { pid: "123", action: "add" });
        });
    });

    describe("getActiveIndexJobsForPid", () => {
        it("will return a filtered list of jobs", async () => {
            const jobs = [
                { data: { pid: "foo" } } as BullMQ.Job,
                { data: { pid: "bar" } } as BullMQ.Job,
                { data: { pid: "baz" } } as BullMQ.Job,
                { data: { pid: "foo" } } as BullMQ.Job,
            ];
            const getJobsSpy = jest.spyOn(Queue.prototype, "getJobs").mockResolvedValue(jobs);
            const result = await queueManager.getActiveIndexJobsForPid("foo");
            expect(getJobsSpy).toHaveBeenCalledWith("active");
            expect(result.length).toEqual(2);
            expect(result[0].data.pid).toEqual("foo");
            expect(result[1].data.pid).toEqual("foo");
        });
    });
});
