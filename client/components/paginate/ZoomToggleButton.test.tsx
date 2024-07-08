import React from "react";
import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import renderer from "react-test-renderer";
import ZoomToggleButton from "./ZoomToggleButton";

describe("ZoomToggleButton", () => {
    let props;

    beforeEach(() => {
        props = {
            toggleZoom: jest.fn(),
            zoom: false,
        };
    });

    it("renders", () => {
        const tree = renderer.create(<ZoomToggleButton {...props} />).toJSON();
        expect(tree).toMatchSnapshot();
    });

    it("renders correctly when zoom is off", () => {
        render(<ZoomToggleButton {...props} />);
        expect(screen.queryAllByText("Turn Zoom On")).toHaveLength(1);
    });

    it("renders correctly when zoom is on", () => {
        props.zoom = true;
        render(<ZoomToggleButton {...props} />);
        expect(screen.queryAllByText("Turn Zoom Off")).toHaveLength(1);
    });

    it("calls toggle zoom when button is clicked", async () => {
        props.zoom = true;
        render(<ZoomToggleButton {...props} />);

        expect(props.toggleZoom).not.toHaveBeenCalled();

        await userEvent.setup().click(screen.getByRole("button"));

        expect(props.toggleZoom).toHaveBeenCalled();
    });
});
