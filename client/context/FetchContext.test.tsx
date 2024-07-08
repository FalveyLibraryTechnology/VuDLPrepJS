import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { renderHook, act } from "@testing-library/react";
import { FetchContextProvider, useFetchContext } from "./FetchContext";

describe("useFetchContext", () => {
    let url;
    let fetchParams;
    let response;
    let token;
    beforeEach(() => {
        global.fetch = jest.fn();
        response = {
            json: jest.fn(),
            text: jest.fn(),
            blob: jest.fn(),
            headers: new Headers(),
            ok: true,
            status: 200,
            statusText: "OK",
        };
        url = "testUrl";
        fetchParams = {
            method: "GET",
        };
        token = "testToken";
    });
    describe("makeRequest", () => {
        it("successfully calls fetch", async () => {
            global.fetch.mockResolvedValueOnce("testResponse");
            const { result } = await renderHook(() => useFetchContext(), { wrapper: FetchContextProvider });

            await act(async () => {
                await result.current.action.makeRequest(url, fetchParams);
            });

            expect(global.fetch).toHaveBeenCalledWith(url, expect.objectContaining(fetchParams));
        });

        it("calls refresh token", async () => {
            response.ok = false;
            response.status = 401;
            global.fetch.mockResolvedValueOnce(response);
            global.fetch.mockResolvedValueOnce({
                ok: true,
                status: 200,
                json: jest.fn().mockResolvedValueOnce(token),
            });
            global.fetch.mockResolvedValueOnce("testResponseAgain");
            const { result } = await renderHook(() => useFetchContext(), { wrapper: FetchContextProvider });

            let expectedResponse;
            await act(async () => {
                expectedResponse = await result.current.action.makeRequest(url, fetchParams);
            });

            expect(global.fetch).toHaveBeenCalledWith(url, expect.objectContaining(fetchParams));
            expect(expectedResponse).toEqual("testResponseAgain");
            expect(result.current.state.token).toEqual(token);
        });
    });

    describe("fetchJSON", () => {
        it("successfully calls json", async () => {
            global.fetch.mockResolvedValueOnce(response);
            const { result } = await renderHook(() => useFetchContext(), { wrapper: FetchContextProvider });

            await act(async () => {
                await result.current.action.fetchJSON(url);
            });

            expect(global.fetch).toHaveBeenCalledWith(
                url,
                expect.objectContaining({
                    method: "GET",
                })
            );
            expect(response.json).toHaveBeenCalled();
        });

        it("throws an error when response is not okay", async () => {
            response.ok = false;
            response.statusText = "not okay";
            global.fetch.mockResolvedValueOnce(response);
            const { result } = await renderHook(() => useFetchContext(), { wrapper: FetchContextProvider });

            await act(async () => {
                await expect(() => result.current.action.fetchJSON(url)).rejects.toThrow("not okay");
            });

            expect(global.fetch).toHaveBeenCalledWith(
                url,
                expect.objectContaining({
                    method: "GET",
                })
            );
            expect(response.json).not.toHaveBeenCalled();
        });
    });

    describe("fetchText", () => {
        it("successfully calls text", async () => {
            global.fetch.mockResolvedValueOnce(response);
            const { result } = await renderHook(() => useFetchContext(), { wrapper: FetchContextProvider });
            await act(async () => {
                await result.current.action.fetchText(url);
            });

            expect(global.fetch).toHaveBeenCalledWith(
                url,
                expect.objectContaining({
                    method: "GET",
                })
            );
            expect(response.text).toHaveBeenCalled();
        });

        it("throws an error when response is not okay", async () => {
            response.ok = false;
            response.statusText = "not okay";
            response.text.mockResolvedValue("kaboom");
            global.fetch.mockResolvedValueOnce(response);
            const { result } = await renderHook(() => useFetchContext(), { wrapper: FetchContextProvider });

            await act(async () => {
                await expect(() => result.current.action.fetchText(url)).rejects.toThrow("not okay: kaboom");
            });

            expect(global.fetch).toHaveBeenCalledWith(
                url,
                expect.objectContaining({
                    method: "GET",
                })
            );
            expect(response.text).toHaveBeenCalled();
        });
    });

    describe("fetchBlob", () => {
        it("successfully calls blob", async () => {
            global.fetch.mockResolvedValueOnce(response);
            response.blob.mockResolvedValueOnce("test1");
            const { result } = await renderHook(() => useFetchContext(), { wrapper: FetchContextProvider });

            await act(async () => {
                const { blob, headers } = await result.current.action.fetchBlob(url);
                expect(blob).toEqual("test1");
                expect(response.headers).toEqual(headers);
            });

            expect(global.fetch).toHaveBeenCalledWith(
                url,
                expect.objectContaining({
                    method: "GET",
                })
            );
            expect(response.blob).toHaveBeenCalled();
        });

        it("throws an error when response is not okay", async () => {
            response.ok = false;
            response.statusText = "not okay";
            global.fetch.mockResolvedValueOnce(response);
            const { result } = await renderHook(() => useFetchContext(), { wrapper: FetchContextProvider });

            await act(async () => {
                await expect(() => result.current.action.fetchBlob(url)).rejects.toThrow("not okay");
            });

            expect(global.fetch).toHaveBeenCalledWith(
                url,
                expect.objectContaining({
                    method: "GET",
                })
            );
            expect(response.blob).not.toHaveBeenCalled();
        });
    });
});
