import React from "react";
import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import renderer from "react-test-renderer";
import PaginatorList from "./PaginatorList";

const mockUseJobPaginatorContext = jest.fn();
jest.mock("../../context/PaginatorContext", () => ({
    usePaginatorContext: () => {
        return mockUseJobPaginatorContext();
    },
}));
const mockThumbnail = jest.fn();
jest.mock(
    "./Thumbnail",
    () =>
        function Thumbnail(props) {
            mockThumbnail(props);
            return "Thumbnail";
        },
);

describe("PaginatorList", () => {
    let paginatorValues;

    beforeEach(() => {
        paginatorValues = {
            state: {
                order: [
                    {
                        filename: "test.jpg",
                    },
                ],
                currentPage: 0,
            },
        };
        mockUseJobPaginatorContext.mockReturnValue(paginatorValues);
        // Use of mock objects seems to be causing console errors.
        // TODO: figure out why and come up with a better solution than hiding the errors.
        jest.spyOn(console, "error").mockImplementation(jest.fn());
    });

    afterEach(() => {
        jest.resetAllMocks();
    });

    it("renders thumbnails for pages", () => {
        const tree = renderer.create(<PaginatorList />).toJSON();
        expect(tree).toMatchSnapshot();
    });

    it("renders empty element when pages are absent", () => {
        paginatorValues.state.order = [];
        const tree = renderer.create(<PaginatorList />).toJSON();
        expect(tree).toBeNull();
    });

    it("renders a thumbnail", () => {
        expect(mockThumbnail).not.toHaveBeenCalled();
        renderer.create(<PaginatorList />).toJSON();
        expect(mockThumbnail).toHaveBeenCalledWith(
            expect.objectContaining({
                scrollTo: expect.any(Function),
                selected: true,
                number: 0,
            }),
        );
    });
});
