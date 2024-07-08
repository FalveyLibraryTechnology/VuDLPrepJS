import React from "react";
import { describe, afterEach, expect, it, jest } from "@jest/globals";
import { fireEvent, render, screen } from "@testing-library/react";
import renderer from "react-test-renderer";
import DatastreamAgentsContentRow from "./DatastreamAgentsContentRow";

const mockDatastreamAgentsContentNotes = jest.fn();
jest.mock("./DatastreamAgentsContentNotes", () => (props) => {
    mockDatastreamAgentsContentNotes(props);
    return "DatastreamAgentsContentNotes";
});
const mockUseEditorContext = jest.fn();
jest.mock("../../../context/EditorContext", () => ({
    useEditorContext: () => {
        return mockUseEditorContext();
    },
}));

describe("DatastreamAgentsContentRow", () => {
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
            initialExpand: false,
            agent,
            onRoleChange: jest.fn(),
            onTypeChange: jest.fn(),
            onNameChange: jest.fn(),
            onNotesChange: jest.fn(),
        };
        editorValues = {
            state: {
                agentsCatalog: {
                    types: ["type1"],
                    roles: ["role1"],
                    defaults: {
                        role: "test1",
                        type: "test2",
                        name: "test3",
                    },
                },
            },
        };
        mockUseEditorContext.mockReturnValue(editorValues);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it("renders", () => {
        const tree = renderer.create(<DatastreamAgentsContentRow {...props} />).toJSON();
        expect(tree).toMatchSnapshot();
    });

    it("changes a role", () => {
        editorValues.state.agentsCatalog.roles.push("test");
        render(<DatastreamAgentsContentRow {...props} />);
        fireEvent.change(screen.getByRole("combobox", { name: "Select Role" }), { target: { value: "test" } });
        expect(props.onRoleChange).toHaveBeenCalledWith("test");
    });

    it("changes a type", () => {
        editorValues.state.agentsCatalog.types.push("test");
        render(<DatastreamAgentsContentRow {...props} />);
        fireEvent.change(screen.getByRole("combobox", { name: "Select Type" }), { target: { value: "test" } });
        expect(props.onTypeChange).toHaveBeenCalledWith("test");
    });

    it("changes a name", () => {
        render(<DatastreamAgentsContentRow {...props} />);
        fireEvent.blur(screen.getByRole("textbox"), { target: { value: "test" } });
        expect(props.onNameChange).toHaveBeenCalledWith("test");
    });

    it("displays the content notes", () => {
        render(<DatastreamAgentsContentRow {...props} />);

        expect(mockDatastreamAgentsContentNotes).toHaveBeenCalledWith({
            expanded: false,
            notes: agent.notes,
            setNotes: expect.any(Function),
        });
    });
});
