import React from "react";
import { describe, afterEach, expect, it, jest } from "@jest/globals";
import { act } from "react-dom/test-utils";
import { fireEvent, render, screen } from "@testing-library/react";
import renderer from "react-test-renderer";
import DatastreamDublinCoreEditField from "./DatastreamDublinCoreEditField";

jest.mock(
    "@mui/material/FormControl",
    () =>
        function FormControl({ disabled = false, children = null }: { disabled: boolean; children: unknown }) {
            return (
                <>
                    {"FormControl" + (disabled ? " (disabled))" : "")}
                    {children}
                </>
            );
        },
);
jest.mock("../../shared/BlurSavingTextField", () => (props) => `BlurSavingTextField: ${JSON.stringify(props)}`);
let tinyMceOnBlur: (a: unknown, b: unknown) => void;
jest.mock("@tinymce/tinymce-react", () => {
    return {
        Editor: function TinyMCE(props) {
            tinyMceOnBlur = props.onBlur;
            return "TinyMCE";
        },
    };
});

describe("DatastreamDublinCoreEditField", () => {
    let setValue: () => void;
    let fieldType: string;
    let legalValues: Array<string>;

    function getField(): React.ReactElement {
        const props = {
            value: "foo",
            setValue,
            fieldType,
            legalValues,
        };
        return <DatastreamDublinCoreEditField {...props} />;
    }

    beforeEach(() => {
        setValue = jest.fn();
        fieldType = "text";
        legalValues = [];
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it("renders a text field", () => {
        const tree = renderer.create(getField()).toJSON();
        expect(tree).toMatchSnapshot();
    });

    it("renders an html field", () => {
        fieldType = "html";
        const tree = renderer.create(getField()).toJSON();
        expect(tree).toMatchSnapshot();
    });

    it("renders an unknown field", () => {
        fieldType = "unknown";
        const tree = renderer.create(getField()).toJSON();
        expect(tree).toMatchSnapshot();
    });

    it("renders a locked field", () => {
        fieldType = "locked";
        const tree = renderer.create(getField()).toJSON();
        expect(tree).toMatchSnapshot();
    });

    it("renders a dropdown field", () => {
        fieldType = "dropdown";
        legalValues = ["foo", "bar", "baz"];
        const tree = renderer.create(getField()).toJSON();
        expect(tree).toMatchSnapshot();
    });

    it("changes the dropdown value", () => {
        fieldType = "dropdown";
        legalValues = ["foo", "bar", "baz"];
        render(getField());
        const select = screen.getByRole("combobox");
        act(() => {
            fireEvent.change(select, { target: { value: "baz" } });
        });
        expect(setValue).toHaveBeenCalledWith("baz");
    });

    it("renders a dropdown field with an unexpected value", () => {
        fieldType = "dropdown";
        const tree = renderer.create(getField()).toJSON();
        expect(tree).toMatchSnapshot();
    });

    it("saves the HTML editor output", () => {
        fieldType = "html";
        render(getField());
        const mockEditor = {
            getContent: jest.fn(),
        };
        mockEditor.getContent.mockReturnValue("baz");
        act(() => {
            tinyMceOnBlur({}, mockEditor);
        });
        expect(setValue).toHaveBeenCalledWith("baz");
    });
});
