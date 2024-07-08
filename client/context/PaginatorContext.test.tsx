import React from "react";
import PropTypes from "prop-types";
import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { renderHook, act } from "@testing-library/react";
import * as JobPaginatorState from "./JobPaginatorState";
import * as routes from "../util/routes";
import { FetchContextProvider } from "./FetchContext";
import { PaginatorContextProvider, usePaginatorContext } from "./PaginatorContext";

const wrapper = ({ children }) => {
    return (
        <FetchContextProvider>
            <PaginatorContextProvider>{children}</PaginatorContextProvider>
        </FetchContextProvider>
    );
};
wrapper.displayName = "wrapper";
wrapper.propTypes = {
    children: PropTypes.node,
};
describe("usePaginatorContext", () => {
    let json;
    beforeEach(() => {
        json = jest.fn();
        global.fetch = jest.fn(() =>
            Promise.resolve({
                ok: true,
                json,
            })
        );
        window.alert = jest.fn();
        window.confirm = jest.fn();
        Object.defineProperty(window, "location", {
            value: {
                assign: jest.fn(),
            },
            writable: true,
        });
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    it("increments and decrements the currentPage", async () => {
        const { result } = await renderHook(() => usePaginatorContext(), { wrapper });

        act(() => {
            result.current.action.setOrder([
                {
                    filename: "test1",
                    label: null,
                },
                {
                    filename: "test2",
                    label: null,
                },
            ]);
        });

        act(() => {
            result.current.action.nextPage();
        });

        expect(result.current.state.currentPage).toBe(1);

        act(() => {
            result.current.action.prevPage();
        });

        expect(result.current.state.currentPage).toBe(0);
    });

    describe("setLabel", () => {
        it("changes the label if null", () => {
            const { result } = renderHook(() => usePaginatorContext(), { wrapper });

            act(() => {
                result.current.action.setOrder([
                    {
                        filename: "test1",
                        label: null,
                    },
                ]);
            });

            act(() => {
                result.current.action.setLabel(0, "test2");
            });

            expect(result.current.state.order[0].label).toEqual("test2");
        });

        it("does not change the label if index is out of range", () => {
            const { result } = renderHook(() => usePaginatorContext(), { wrapper });

            act(() => {
                result.current.action.setOrder([
                    {
                        filename: "test1",
                        label: "test2",
                    },
                ]);
            });

            act(() => {
                result.current.action.setLabel(1, "test3");
            });

            expect(result.current.state.order[0].label).not.toEqual("test3");
        });
    });

    describe("getMagicLabel", () => {
        it("gets current label if not null", () => {
            jest.spyOn(JobPaginatorState, "getLabel").mockReturnValue("test2");
            const { result } = renderHook(() => usePaginatorContext(), { wrapper });

            act(() => {
                expect(result.current.action.getMagicLabel(0)).toEqual("test2");
            });
        });

        it("gets magic label if null", () => {
            jest.spyOn(JobPaginatorState, "getLabel").mockReturnValue(null);
            const { result } = renderHook(() => usePaginatorContext(), { wrapper });

            act(() => {
                result.current.action.setOrder([
                    {
                        filename: "test1",
                        label: "1",
                    },
                ]);
            });

            act(() => {
                expect(result.current.action.getMagicLabel(1)).toEqual("2");
            });
        });
    });

    describe("deletePage", () => {
        it("removes an order entry", async () => {
            jest.spyOn(JobPaginatorState, "deletePageValidation").mockReturnValue(true);
            jest.spyOn(routes, "getImageUrl").mockReturnValue("www.image.com/imageName");
            jest.spyOn(JobPaginatorState, "getNonRemovedPages").mockReturnValue([]);

            const { result } = renderHook(() => usePaginatorContext(), { wrapper });

            act(() => {
                result.current.action.setOrder([
                    {
                        filename: "imageName",
                    },
                ]);
            });

            await act(async () => {
                await result.current.action.deletePage();
            });

            expect(JobPaginatorState.deletePageValidation).toHaveBeenCalled;
        });
    });

    describe("save", () => {
        it("saves magic labels", () => {
            const labelSpy = jest.spyOn(JobPaginatorState, "getLabel");
            const userMustReviewMoreLabelsMock = jest
                .spyOn(JobPaginatorState, "userMustReviewMoreLabels")
                .mockReturnValue(true);
            const { result } = renderHook(() => usePaginatorContext(), {
                wrapper,
            });

            act(() => {
                result.current.action.setOrder([
                    {
                        filename: "test1",
                        label: "1",
                    },
                    {
                        filename: "test2",
                        label: null,
                    },
                ]);
            });

            act(() => {
                result.current.action.save(false);
            });

            expect(result.current.state.order[1].label).toBeNull();

            userMustReviewMoreLabelsMock.mockReturnValue(false);
            labelSpy.mockReturnValueOnce("1");
            labelSpy.mockReturnValueOnce(null);
            act(() => {
                result.current.action.save(false);
            });

            expect(result.current.state.order[1].label).toEqual("2");
        });

        it("updates job", async () => {
            jest.spyOn(JobPaginatorState, "userMustReviewMoreLabels").mockReturnValue(false);
            const publishValidValues = {
                derivatives: {
                    expected: 0,
                    processed: 0,
                },
            };
            json.mockResolvedValueOnce(publishValidValues);
            const { result } = renderHook(() => usePaginatorContext(), {
                wrapper,
            });
            act(() => {
                result.current.action.setOrder([
                    {
                        filename: "test1",
                        label: "1",
                    },
                    {
                        filename: "test2",
                        label: null,
                    },
                ]);
            });

            await act(async () => {
                await result.current.action.save(true);
            });

            expect(global.fetch).not.toHaveBeenCalledWith(
                routes.getJobUrl("testCategory", "testJob"),
                expect.objectContaining({
                    method: "PUT",
                })
            );

            publishValidValues.derivatives.processed = 1;
            json.mockResolvedValueOnce(publishValidValues);
            window.confirm.mockReturnValue(true);
            await act(async () => {
                await result.current.action.save(true);
            });

            const { category, job } = result.current.state;
            expect(window.confirm).toHaveBeenCalled();
            expect(global.fetch).toHaveBeenCalledWith(
                routes.getJobUrl(category, job),
                expect.objectContaining({
                    method: "PUT",
                })
            );
            expect(window.location.assign).toHaveBeenCalledWith("/paginate");
        });
    });

    describe("autonumberFollowingPages", () => {
        it("returns false when order image is undefined", () => {
            jest.spyOn(JobPaginatorState, "countMagicLabels").mockReturnValue(0);
            window.confirm.mockReturnValue(false);

            const { result } = renderHook(() => usePaginatorContext(), { wrapper });
            act(() => {
                result.current.action.setOrder([
                    {
                        filename: "test1",
                        label: "1",
                    },
                    {
                        filename: "test2",
                        label: "2",
                    },
                ]);
            });

            act(() => {
                result.current.action.autonumberFollowingPages();
            });

            expect(result.current.state.order[1].label).not.toBeNull();
        });

        it("returns false when order image is undefined", () => {
            jest.spyOn(JobPaginatorState, "countMagicLabels").mockReturnValue(0);
            window.confirm.mockReturnValue(true);

            const { result } = renderHook(() => usePaginatorContext(), { wrapper });
            act(() => {
                result.current.action.setOrder([
                    {
                        filename: "test1",
                        label: "1",
                    },
                    {
                        filename: "test2",
                        label: "2",
                    },
                ]);
            });

            act(() => {
                result.current.action.autonumberFollowingPages();
            });

            expect(result.current.state.order[1].label).toBeNull();
        });
    });

    describe("getJobImageUrl", () => {
        it("returns false when order image is undefined", () => {
            const { result } = renderHook(() => usePaginatorContext(), { wrapper });

            expect(result.current.action.getJobImageUrl(undefined, 2)).toBeFalsy();
        });

        it("calls getJobImageUrl with appropriate params", () => {
            const getImageUrlSpy = jest.spyOn(routes, "getImageUrl").mockReturnValue(null);
            const { result } = renderHook(() => usePaginatorContext(), {
                wrapper,
            });
            act(() => {
                result.current.action.initialize("testCategory", "testJob");
            });
            expect(result.current.action.getJobImageUrl({ filename: "image.png" }, 2, 2)).toBeFalsy();
            expect(getImageUrlSpy).toHaveBeenCalledWith("testCategory", "testJob", "image.png", 2);
        });
    });

    describe("updatePagesByStatus", () => {
        it("reports anomalies", async () => {
            const { result } = await renderHook(() => usePaginatorContext(), { wrapper });

            json.mockResolvedValueOnce({
                order: [
                {
                    filename: "test1",
                    label: null,
                },
                {
                    filename: "test2",
                    label: null,
                },
            ]});
            json.mockResolvedValueOnce({
                file_problems: { deleted: ["test1"], added: ["test3"] }
            });

            await act(async () => {
                await result.current.action.loadJob("foo", "bar");
            });

            expect(window.alert).toHaveBeenCalledWith("1 file(s) have been removed from the job since the last edit.\n1 file(s) have been added to the job since the last edit.\n");
            expect(result.current.state.order).toEqual([
                {
                    filename: "test2",
                    label: null,
                },
                {
                    filename: "test3",
                    label: null,
                },
            ]);
        });
    });
});
