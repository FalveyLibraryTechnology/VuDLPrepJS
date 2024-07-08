import React from "react";
import { describe, afterEach, expect, it, jest } from "@jest/globals";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import renderer from "react-test-renderer";
import DatastreamAgentsContentNotes from "./DatastreamAgentsContentNotes";

describe("DatastreamAgentsContentNotes", () => {
    let notes;
    let setNotes;
    beforeEach(() => {
        notes = ["test1"];
        setNotes = jest.fn();
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it("renders", () => {
        const tree = renderer.create(<DatastreamAgentsContentNotes expanded={false} notes={notes} />).toJSON();
        expect(tree).toMatchSnapshot();
    });

    it("edits a note", () => {
        render(<DatastreamAgentsContentNotes expanded={false} notes={notes} setNotes={setNotes} />);
        const inputs = screen.getAllByRole("textbox", { hidden: true });
        fireEvent.change(inputs[0], { target: { value: "test2" } });

        expect(setNotes).toHaveBeenCalledWith(notes);
        expect(notes[0]).toEqual("test2");
    });

    it("deletes a note", async () => {
        render(<DatastreamAgentsContentNotes expanded={false} notes={notes} setNotes={setNotes} />);
        await userEvent.setup().click(screen.getByTestId("DeleteIcon"));

        expect(setNotes).toHaveBeenCalledWith(notes);
        expect(notes).toHaveLength(0);
    });

    it("adds a note", async () => {
        render(<DatastreamAgentsContentNotes expanded={false} notes={notes} setNotes={setNotes} />);
        await userEvent.setup().click(screen.getByTestId("SendIcon"));

        expect(setNotes).toHaveBeenCalledWith(notes);
        expect(notes).toHaveLength(2);
    });
});
