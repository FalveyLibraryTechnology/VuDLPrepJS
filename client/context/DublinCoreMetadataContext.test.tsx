import { describe, expect, it } from "@jest/globals";
import { renderHook, act } from "@testing-library/react";
import { DublinCoreMetadataContextProvider, useDublinCoreMetadataContext } from "./DublinCoreMetadataContext";

describe("useDublinCoreMetadataContext", () => {
    describe("setCurrentDublinCore", () => {
        it("sets the current Dublin Core", async () => {
            const dc = { "dc:title": ["foo"] };
            const { result } = await renderHook(() => useDublinCoreMetadataContext(), { wrapper: DublinCoreMetadataContextProvider });

            expect(result.current.state.currentDublinCore).toEqual({});

            await act(async () => {
                await result.current.action.setCurrentDublinCore(dc);
            });

            expect(result.current.state.currentDublinCore).toEqual(dc);
        });

        it("allows value insertion above", async () => {
            const dc = { "dc:title": ["foo"] };
            const { result } = await renderHook(() => useDublinCoreMetadataContext(), { wrapper: DublinCoreMetadataContextProvider });

            await act(async () => {
                await result.current.action.setCurrentDublinCore(dc);
                await result.current.action.addValueAbove("dc:title", 0, "bar");
            });

            expect(result.current.state.currentDublinCore).toEqual(
                { "dc:title": ["bar", "foo"] }
            );
        });

        it("allows value insertion below", async () => {
            const { result } = await renderHook(() => useDublinCoreMetadataContext(), { wrapper: DublinCoreMetadataContextProvider });

            await act(async () => {
                await result.current.action.replaceValue("dc:title", 0, "bar");
                await result.current.action.addValueBelow("dc:title", 0, "foo");
            });

            expect(result.current.state.currentDublinCore).toEqual(
                { "dc:title": ["bar", "foo"] }
            );
        });

        it("allows value deletion", async () => {
            const { result } = await renderHook(() => useDublinCoreMetadataContext(), { wrapper: DublinCoreMetadataContextProvider });

            await act(async () => {
                await result.current.action.replaceValue("dc:title", 0, "bar");
                await result.current.action.addValueBelow("dc:title", 0, "foo");
                await result.current.action.deleteValue("dc:title", 0);
            });

            expect(result.current.state.currentDublinCore).toEqual(
                { "dc:title": ["foo"] }
            );
        });

        it("allows value merging", async () => {
            const { result } = await renderHook(() => useDublinCoreMetadataContext(), { wrapper: DublinCoreMetadataContextProvider });

            await act(async () => {
                await result.current.action.mergeValues(
                    {
                        "dc:title": ["foo"],
                        "dc:description": ["desc 1"]
                    }
                );
                await result.current.action.mergeValues(
                    {
                        "dc:id": ["bar"],
                        "dc:description": ["desc 2"]
                    }
                );
            });

            expect(result.current.state.currentDublinCore).toEqual(
                {
                    "dc:id": ["bar"],
                    "dc:title": ["foo"],
                    "dc:description": ["desc 1", "desc 2"],
                }
            );
        });
    });
});
