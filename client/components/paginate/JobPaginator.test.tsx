import React from "react";
import { act } from "react-dom/test-utils";
import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { render } from "@testing-library/react";
import renderer from "react-test-renderer";
import JobPaginator from "./JobPaginator";
import { FetchContextProvider } from "../../context/FetchContext";

const mockUseJobPaginatorContext = jest.fn();
jest.mock("../../context/PaginatorContext", () => ({
    usePaginatorContext: () => {
        return mockUseJobPaginatorContext();
    },
}));
jest.mock("../../context/JobPaginatorState");
jest.mock("./PaginatorControls", () => () => "PaginatorControls");
jest.mock("./PaginatorList", () => () => "PaginatorList");
jest.mock("./JobPaginatorZoomToggle", () => () => "JobPaginatorZoomToggle");

describe("JobPaginator", () => {
    let props;
    let paginatorValues;
    beforeEach(() => {
        props = {
            initialCategory: "testCategory",
            initialJob: "testJob",
        };
        paginatorValues = {
            state: {
                category: props.initialCategory,
                job: props.initialJob,
            },
            action: {
                loadJob: jest.fn(),
            },
        };
        mockUseJobPaginatorContext.mockReturnValue(paginatorValues);
    });

    it("renders", () => {
        const tree = renderer
            .create(
                <FetchContextProvider>
                    <JobPaginator {...props} />
                </FetchContextProvider>,
            )
            .toJSON();
        const treeString = JSON.stringify(tree);
        expect(treeString.includes(props.initialCategory)).toBeTruthy();
        expect(treeString.includes(props.initialJob)).toBeTruthy();
        expect(tree).toMatchSnapshot();
    });

    it("should loadJob from useEffect", async () => {
        await act(async () => {
            render(
                <FetchContextProvider>
                    <JobPaginator {...props} />
                </FetchContextProvider>,
            );
        });
        expect(paginatorValues.action.loadJob).toHaveBeenCalledWith(props.initialCategory, props.initialJob);
    });
});
