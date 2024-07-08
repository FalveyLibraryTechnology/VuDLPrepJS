import React from "react";
import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import renderer from "react-test-renderer";
import Thumbnail from "./Thumbnail";

const mockUseJobPaginatorContext = jest.fn();
jest.mock("../../context/PaginatorContext", () => ({
    usePaginatorContext: () => {
        return mockUseJobPaginatorContext();
    },
}));

describe("Thumbnail", () => {
    let props;
    let paginatorValues;
    let order;
    beforeEach(() => {
        order = [
            {
                filename: "test1.jpg",
            },
            {
                filename: "test2.jpg",
            },
            {
                filename: "test3.jpg",
            },
        ];
        paginatorValues = {
            state: {
                order,
            },
            action: {
                getLabel: jest.fn().mockReturnValue(null),
                getMagicLabel: jest.fn().mockReturnValue(null),
                setPage: jest.fn(),
                getJobImageUrl: jest.fn().mockReturnValue("www.testurl.com"),
            },
        };
        props = {
            scrollTo: jest.fn(),
            selected: true,
            number: 1,
        };
        mockUseJobPaginatorContext.mockReturnValue(paginatorValues);
    });

    it("renders", () => {
        const tree = renderer.create(<Thumbnail {...props} />).toJSON();
        expect(tree).toMatchSnapshot();
    });

    it("renders initial state and calls appropriate functions when selected", () => {
        render(<Thumbnail {...props} />);

        expect(props.scrollTo).toHaveBeenCalled();
        expect(paginatorValues.action.getJobImageUrl).toHaveBeenCalledWith(order[props.number], "thumb");
        expect(document.querySelectorAll(".thumbnail.selected")).toHaveLength(1);
        expect(document.querySelectorAll(".label.magic")).toHaveLength(1);
        expect(screen.queryAllByText("2")).toHaveLength(1);
    });

    it("renders correctly when not selected or no label", () => {
        props.selected = false;
        paginatorValues.action.getLabel.mockReturnValue("testLabel");
        paginatorValues.action.getMagicLabel.mockReturnValue("testLabel");

        render(<Thumbnail {...props} />);

        expect(props.scrollTo).not.toHaveBeenCalled();
        expect(paginatorValues.action.getJobImageUrl).toHaveBeenCalledWith(order[props.number], "thumb");
        expect(document.querySelectorAll(".thumbnail.selected")).toHaveLength(0);
        expect(document.querySelectorAll(".label.magic")).toHaveLength(0);
        expect(screen.queryAllByText("testLabel")).toHaveLength(1);
    });

    it("calls setPage when clicked", async () => {
        render(<Thumbnail {...props} />);

        expect(paginatorValues.action.setPage).not.toHaveBeenCalledWith(props.number);
        await userEvent.setup().click(screen.getByRole("img"));
        expect(paginatorValues.action.setPage).toHaveBeenCalledWith(props.number);
    });
});
