import React from "react";
import { describe, expect, it, jest } from "@jest/globals";
import renderer from "react-test-renderer";
import { DatastreamModalStates } from "../../../context/EditorContext";
import DatastreamControls from "./DatastreamControls";

const mockDatastreamControlButton = jest.fn();
jest.mock("./DatastreamControlButton", () => (props) => {
    mockDatastreamControlButton(props);
    return "DatastreamControlButton: " + JSON.stringify(props);
});

describe("DatastreamControls", () => {
    it("renders", () => {
        const datastream = "test1";
        const tree = renderer.create(<DatastreamControls datastream={datastream} disabled={false} />).toJSON();
        expect(tree).toMatchSnapshot();
        expect(mockDatastreamControlButton).toHaveBeenCalledWith({
            modalState: DatastreamModalStates.UPLOAD,
            datastream,
            disabled: false,
        });
    });
});
