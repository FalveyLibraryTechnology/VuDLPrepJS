/**
 * @jest-environment node
 */
import React from "react";
import { describe, expect, it, jest } from "@jest/globals";
import renderer from "react-test-renderer";
import Datastream from "./Datastream";
const mockDatastreamControls = jest.fn();
jest.mock("./DatastreamControls", () => (props) => {
    mockDatastreamControls(props);
    return "DatastreamControls";
});

describe("Datastream", () => {
    it("renders", () => {
        const datastream = {
            stream: "test1",
            disabled: true,
        };
        // Mocking the datastream controls causes a console error; let's suppress it
        // by mocking out console.error().
        // TODO: figure out why and come up with a better solution than hiding the errors.
        jest.spyOn(console, "error").mockImplementation(jest.fn());
        const tree = renderer.create(<Datastream datastream={datastream} />);
        expect(tree.toJSON()).toMatchSnapshot();
        expect(mockDatastreamControls).toHaveBeenCalled();
    });
});
