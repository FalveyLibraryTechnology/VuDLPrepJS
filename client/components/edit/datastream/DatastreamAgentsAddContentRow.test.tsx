import React from "react";
import { describe, afterEach, expect, it, jest } from "@jest/globals";
import renderer from "react-test-renderer";
import DatastreamAgentsAddContentRow from "./DatastreamAgentsAddContentRow";

const mockDatastreamAgentsContentRow = jest.fn();
let datastreamAgentsContentRowProps;

jest.mock("./DatastreamAgentsContentRow", () => (props) => {
    datastreamAgentsContentRowProps = props;
    mockDatastreamAgentsContentRow(props);
    return "DatastreamAgentsContentRow";
});
const mockUseEditorContext = jest.fn();
jest.mock("../../../context/EditorContext", () => ({
    useEditorContext: () => {
        return mockUseEditorContext();
    },
}));

describe("DatastreamAgentsAddContentRow", () => {
    let agent;
    let props;
    let editorValues;

    beforeEach(() => {
        agent = {
            role: "test1",
            type: "test2",
            name: "test3",
            notes: ["test4"],
        };
        props = {
            agent,
            setAgent: jest.fn(),
            setHasChanges: jest.fn(),
        };
        editorValues = {
            state: { currentAgents: ["test1"] },
            action: { setCurrentAgents: jest.fn() },
        };
        mockUseEditorContext.mockReturnValue(editorValues);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it("proxies DatastreamAgentsContextRow", () => {
        const tree = renderer.create(<DatastreamAgentsAddContentRow {...props} />).toJSON();
        expect(tree).toEqual("DatastreamAgentsContentRow");
        expect(datastreamAgentsContentRowProps.agent).toEqual(props.agent);
    });
});
