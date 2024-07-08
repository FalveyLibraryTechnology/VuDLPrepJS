import { Job } from "bullmq";

import Config from "../models/Config";
import Notify from "./Notify";

function mockRequests(notify, res = {}) {
    return jest.spyOn(notify, "_request").mockResolvedValue(Object.assign({ statusCode: 200, body: "n/a" }, res));
}

describe("Notify", () => {
    let notify: Notify;

    beforeEach(() => {
        notify = new Notify();
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    describe("bad config", () => {
        it("unavailable method", () => {
            const badMethod = "messenger pigeon";

            Config.setInstance(
                new Config({
                    notify: {
                        method: badMethod,
                    },
                }),
            );

            const job = { data: { body: "coo" } } as Job;
            expect(async () => await notify.run(job)).rejects.toThrowError(`Notify: invalid method '${badMethod}'`);
        });
    });

    describe("ntfy", () => {
        const testChannel = "test-default";

        beforeEach(() => {
            Config.setInstance(
                new Config({
                    notify: {
                        method: "ntfy",
                        ntfy_defaultChannel: testChannel,
                    },
                }),
            );
        });

        describe("run", () => {
            it("handles message only", async () => {
                const requestSpy = mockRequests(notify);
                const job = { data: { body: "hello" } } as Job;
                notify.run(job);
                expect(requestSpy).toHaveBeenCalledWith(testChannel, "hello");
            });

            it("handles optional channel", async () => {
                const requestSpy = mockRequests(notify);
                const job = { data: { body: "hello", channel: "world" } } as Job;
                notify.run(job);
                expect(requestSpy).toHaveBeenCalledWith("world", "hello");
            });
        });

        describe("errors", () => {
            it("throws on no body", () => {
                const job = { data: {} } as Job;
                expect(async () => await notify.run(job)).rejects.toThrowError("Notify: no body specified");
            });
        });
    });
});
