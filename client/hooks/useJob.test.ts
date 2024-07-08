import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { renderHook, act } from "@testing-library/react";
import useJob from "./useJob";
import { FetchContextProvider } from "../context/FetchContext";

describe("useJob", () => {
    let props;
    let statusResponse;
    beforeEach(() => {
        props = {
            category: "testCategory",
            children: "testChildren",
        };
        window.alert = jest.fn();
        window.confirm = jest.fn();
        statusResponse = {
            ingest_info: "test1",
            minutes_since_upload: 0,
            documents: 0,
            audio: 0,
            video: 0,
            ingesting: false,
            published: false,
        };
        global.fetch = jest.fn(() =>
            Promise.resolve({
                ok: true,
                json: () => Promise.resolve(statusResponse),
            })
        );
    });

    it("sets status text to loading...", async () => {
        const { result } = await renderHook(() => useJob(props), { wrapper: FetchContextProvider });

        await act(async () => {
            await result.current.action.updateStatus();
        });

        expect(result.current.state.statusText).toEqual(["loading..."]);
    });

    it("sets the click warning if less than 10 minutes", async () => {
        statusResponse.minutes_since_upload = 5;
        statusResponse.derivatives = {
            expected: 0,
        };

        const { result } = await renderHook(() => useJob(props), { wrapper: FetchContextProvider });

        await act(async () => {
            await result.current.action.updateStatus();
        });

        expect(result.current.state.statusText).toEqual(["5 minutes old", "empty job"]);
        expect(result.current.state.clickWarning).toContain("This job was updated");
    });
});
