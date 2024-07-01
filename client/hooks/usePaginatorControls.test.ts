import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { renderHook, act } from "@testing-library/react";
import MagicLabeler from "../util/MagicLabeler";
import usePaginatorControls from "./usePaginatorControls";

describe("usePaginatorControls", () => {
    let currentPage;
    let getMagicLabel;
    let setLabel;
    beforeEach(() => {
        currentPage = 0;
        getMagicLabel = jest.fn();
        setLabel = jest.fn();
        window.alert = jest.fn();
    });

    describe("setLabelPrefix", () => {
        it("sets the label prefix", async () => {
            const replaceLabelPartSpy = jest.spyOn(MagicLabeler, "replaceLabelPart").mockReturnValue("testLabel");
            getMagicLabel.mockReturnValue("testMagicLabel");
            const { result } = await renderHook(() => usePaginatorControls(currentPage, getMagicLabel, setLabel));

            act(() => {
                result.current.action.setLabelPrefix("test");
            });

            expect(replaceLabelPartSpy).toHaveBeenCalledWith("testMagicLabel", "prefix", "test", true);
            expect(setLabel).toHaveBeenCalledWith(currentPage, "testLabel");
        });
    });

    describe("setLabelBody", () => {
        it("sets the label body", async () => {
            const replaceLabelPartSpy = jest.spyOn(MagicLabeler, "replaceLabelPart").mockReturnValue("testLabel");
            getMagicLabel.mockReturnValue("testMagicLabel");
            const { result } = await renderHook(() => usePaginatorControls(currentPage, getMagicLabel, setLabel));

            act(() => {
                result.current.action.setLabelBody("test");
            });

            expect(replaceLabelPartSpy).toHaveBeenCalledWith("testMagicLabel", "label", "test");
            expect(setLabel).toHaveBeenCalledWith(currentPage, "testLabel");
        });
    });

    describe("setLabelSuffix", () => {
        it("sets the label suffix", async () => {
            const replaceLabelPartSpy = jest.spyOn(MagicLabeler, "replaceLabelPart").mockReturnValue("testLabel");
            getMagicLabel.mockReturnValue("testMagicLabel");
            const { result } = await renderHook(() => usePaginatorControls(currentPage, getMagicLabel, setLabel));

            act(() => {
                result.current.action.setLabelSuffix("test");
            });

            expect(replaceLabelPartSpy).toHaveBeenCalledWith("testMagicLabel", "suffix", "test", true);
            expect(setLabel).toHaveBeenCalledWith(currentPage, "testLabel");
        });
    });

    describe("toggleCase", () => {
        it("toggles the label case", async () => {
            const toggleCaseSpy = jest.spyOn(MagicLabeler, "toggleCase").mockReturnValue("testLabel");
            getMagicLabel.mockReturnValue("testMagicLabel");
            const { result } = await renderHook(() => usePaginatorControls(currentPage, getMagicLabel, setLabel));

            act(() => {
                result.current.action.toggleCase("test");
            });

            expect(toggleCaseSpy).toHaveBeenCalledWith("testMagicLabel");
            expect(setLabel).toHaveBeenCalledWith(currentPage, "testLabel");
        });
    });

    describe("toggleRoman", () => {
        it("toggles the label to roman numerals", async () => {
            const toggleRomanSpy = jest.spyOn(MagicLabeler, "toggleRoman").mockReturnValue("testLabel");
            getMagicLabel.mockReturnValue("testMagicLabel");
            const { result } = await renderHook(() => usePaginatorControls(currentPage, getMagicLabel, setLabel));

            act(() => {
                result.current.action.toggleRoman("test");
            });

            expect(toggleRomanSpy).toHaveBeenCalledWith("testMagicLabel");
            expect(setLabel).toHaveBeenCalledWith(currentPage, "testLabel");
        });

        it("returns an alert when label is false", async () => {
            const toggleRomanSpy = jest.spyOn(MagicLabeler, "toggleRoman").mockReturnValue(false);
            getMagicLabel.mockReturnValue("testMagicLabel");
            const { result } = await renderHook(() => usePaginatorControls(currentPage, getMagicLabel, setLabel));

            act(() => {
                result.current.action.toggleRoman("test");
            });

            expect(toggleRomanSpy).toHaveBeenCalledWith("testMagicLabel");
            expect(window.alert).toHaveBeenCalledWith(expect.stringMatching(/Roman numeral toggle/));
        });
    });

    describe("updateCurrentPageLabel", () => {
        it("updates the current page label", async () => {
            const { result } = await renderHook(() => usePaginatorControls(currentPage, getMagicLabel, setLabel));

            act(() => {
                result.current.action.updateCurrentPageLabel({
                    target: {
                        value: "test",
                    },
                });
            });

            expect(setLabel).toHaveBeenCalledWith(currentPage, "test");
        });
    });
});
