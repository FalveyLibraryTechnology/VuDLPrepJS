import JobQueue from "./JobQueue";
import QueueManager from "./QueueManager";

const mockDerivative = {
    run: jest.fn(),
};
jest.mock("../jobs/Derivative", () => {
    return { default: jest.fn().mockImplementation(() => mockDerivative) };
});
jest.mock("../jobs/GeneratePdf", () => {
    return { default: jest.fn() };
});
jest.mock("../jobs/Index", () => {
    return { default: jest.fn() };
});
jest.mock("../jobs/Ingest", () => {
    return { default: jest.fn() };
});
jest.mock("../jobs/Metadata", () => {
    return { default: jest.fn() };
});

describe("JobQueue", () => {
    let manager: QueueManager;
    let queue: JobQueue;
    let getWorkerMock, workerCallback, onEventName, onCallback;
    let logSpy;
    beforeEach(() => {
        getWorkerMock = jest.fn();
        manager = {
            getWorker: getWorkerMock,
        } as unknown as QueueManager;
        QueueManager.setInstance(manager);
        queue = JobQueue.getInstance();
        const worker = {
            on: jest.fn(),
        };
        getWorkerMock.mockImplementation((callback) => {
            workerCallback = callback;
            return worker;
        });
        worker.on.mockImplementation((eventName, callback) => {
            onEventName = eventName;
            onCallback = callback;
        });
        logSpy = jest.spyOn(console, "log").mockImplementation(jest.fn());
    });

    it("starts up a worker appropriately", () => {
        queue.start();
        expect(logSpy).toHaveBeenCalledWith("JobQueue started");
    });

    it("creates an appropriate error callback", () => {
        const errorSpy = jest.spyOn(console, "error").mockImplementation(jest.fn());
        onCallback({}, new Error("foo"), "prev");
        expect(errorSpy).toHaveBeenCalledWith("Job failed; reason: foo");
        expect(onEventName).toEqual("failed");
    });

    it("handles unexpected job names appropriately", () => {
        const errorSpy = jest.spyOn(console, "error").mockImplementation(jest.fn());
        workerCallback({ name: "unknown" });
        expect(logSpy).toHaveBeenCalledWith("JOB: unknown");
        expect(errorSpy).toHaveBeenCalledWith("Unidentified job from queue: unknown");
    });

    it("routes jobs to appropriate workers", () => {
        const job = { name: "derivatives" };
        workerCallback(job);
        expect(logSpy).toHaveBeenCalledWith("JOB: derivatives");
        expect(mockDerivative.run).toHaveBeenCalledWith(job);
    });
});
