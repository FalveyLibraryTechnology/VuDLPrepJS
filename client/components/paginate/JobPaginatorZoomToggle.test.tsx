import React from "react";
import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { render, screen } from "@testing-library/react";
import renderer from "react-test-renderer";
import JobPaginatorZoomToggle from "./JobPaginatorZoomToggle";

const mockUseJobPaginatorContext = jest.fn();
jest.mock("../../context/PaginatorContext", () => ({
    usePaginatorContext: () => {
        return mockUseJobPaginatorContext();
    },
}));
jest.mock("./PaginatorZoomy", () => () => "PaginatorZoomy");
jest.mock("./PaginatorPreview", () => () => "PaginatorPreview");

describe("JobPaginatorZoomToggle", () => {
    let paginatorValues;
    beforeEach(() => {
        paginatorValues = {
            state: {
                order: [
                    {
                        filename: "test.jpg",
                    },
                ],
                zoom: true,
                currentPage: 0,
            },
            action: {
                getJobImageUrl: jest.fn(),
            },
        };
        mockUseJobPaginatorContext.mockReturnValue(paginatorValues);
    });

    it("renders", () => {
        const tree = renderer.create(<JobPaginatorZoomToggle />).toJSON();
        expect(tree).toEqual("PaginatorZoomy");
    });

    it("renders preview not available", () => {
        paginatorValues.state.order = [];
        const tree = renderer.create(<JobPaginatorZoomToggle />).toJSON();
        expect(tree).toMatchSnapshot();
        expect(JSON.stringify(tree).includes("Preview not available")).toBeTruthy();
    });

    it("renders PaginatorZoomy", () => {
        render(<JobPaginatorZoomToggle />);

        expect(screen.queryAllByText("PaginatorZoomy")).toHaveLength(1);
        expect(paginatorValues.action.getJobImageUrl).toHaveBeenCalledWith(paginatorValues.state.order[0], "large");
    });

    it("renders PaginatorPreview", () => {
        paginatorValues.state.zoom = false;
        render(<JobPaginatorZoomToggle />);

        expect(screen.queryAllByText("PaginatorPreview")).toHaveLength(1);
        expect(paginatorValues.action.getJobImageUrl).toHaveBeenCalledWith(paginatorValues.state.order[0], "medium");
    });
});
