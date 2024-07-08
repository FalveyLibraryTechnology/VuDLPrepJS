import React from "react";
import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import renderer from "react-test-renderer";
import PaginatorControlGroup from "./PaginatorControlGroup";

describe("PaginatorControlGroup", () => {
    let props;

    beforeEach(() => {
        props = {
            callback: jest.fn(),
            children: ["testChild"],
            label: "testLabel",
        };
    });

    it("renders", () => {
        const tree = renderer.create(<PaginatorControlGroup {...props} />).toJSON();
        expect(tree).toMatchSnapshot();
    });

    it("calls callback on child click", async () => {
        render(<PaginatorControlGroup {...props} />);
        expect(props.callback).not.toHaveBeenCalledWith("testChild");
        await userEvent.setup().click(screen.getByRole("button"));
        expect(props.callback).toHaveBeenCalledWith("testChild");
    });
});
