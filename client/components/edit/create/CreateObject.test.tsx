import React from "react";
import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { act } from "react-dom/test-utils";
import { waitFor } from "@testing-library/react";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import renderer from "react-test-renderer";
import CreateObject from "./CreateObject";
import { FetchContextProvider } from "../../../context/FetchContext";

let nodeSelectFunction = null;
let treeItems = null;

jest.mock("@mui/x-tree-view/TreeItem", function () {
    return { TreeItem: () => "TreeItem" };
});

jest.mock("@mui/x-tree-view/TreeView", function () {
    return {
        TreeView: ({ onNodeSelect, children }) => {
            nodeSelectFunction = onNodeSelect;
            treeItems = children;
            return children;
        },
    };
});

describe("CreateObject", () => {
    let props;
    let submittedData;

    beforeEach(() => {
        props = {
            parentPid: "",
            allowNoParentPid: false,
            allowChangeParentPid: true,
        };
        submittedData = null;
        global.fetch = jest.fn((url, data) => {
            if (url == "http://localhost:9000/api/edit/models") {
                // If models were requested, set up fake data:
                const setFakeModels = function (callback) {
                    callback(["model-foo", "model-bar", "model-baz"]);
                };
                return {
                    ok: true,
                    status: 200,
                    json: () => new Promise(setFakeModels, jest.fn()),
                };
            } else if (url == "http://localhost:9000/api/edit/object/new") {
                // If the form was submitted, save the data so we can make assertions about it:
                submittedData = data;
                return {
                    ok: true,
                    status: 200,
                    text: async () => "ok",
                };
            }
        });
    });

    function getCreateObjectToTest(props) {
        return (
            <FetchContextProvider>
                <CreateObject {...props} />
            </FetchContextProvider>
        );
    }

    it("renders appropriately with default settings", async () => {
        let tree;
        await renderer.act(async () => {
            tree = renderer.create(getCreateObjectToTest({}));
            await waitFor(() => expect(global.fetch).toHaveBeenCalled());
        });
        expect(tree.toJSON()).toMatchSnapshot();
    });

    it("renders appropriately with noParent and parent change enabled", async () => {
        props.allowNoParentPid = true;
        let tree;
        await renderer.act(async () => {
            tree = renderer.create(getCreateObjectToTest(props));
            await waitFor(() => expect(global.fetch).toHaveBeenCalled());
        });
        expect(tree.toJSON()).toMatchSnapshot();
    });

    it("renders appropriately with editing disabled", async () => {
        props.parentPid = "foo:1234";
        props.allowChangeParentPid = false;
        let tree;
        await renderer.act(async () => {
            tree = renderer.create(getCreateObjectToTest(props));
            await waitFor(() => expect(global.fetch).toHaveBeenCalled());
        });
        expect(tree.toJSON()).toMatchSnapshot();
    });

    it("submits appropriate data in default case", async () => {
        await act(async () => {
            render(getCreateObjectToTest(props));
            await waitFor(() => expect(global.fetch).toHaveBeenCalled());
            nodeSelectFunction(new Event("event-foo"), "model-foo");
            // Test that category select has no effect:
            nodeSelectFunction(new Event("event-foo"), "__categoryWillBeIgnored");
        });
        fireEvent.change(screen.getByRole("textbox", { name: "Title" }), { target: { value: "Test Title" } });
        fireEvent.change(screen.getByRole("textbox", { name: "Parent ID" }), { target: { value: "foo:1234" } });
        await act(async () => {
            await userEvent.setup().click(screen.getByRole("button", { name: "Create Object" }));
        });
        expect(treeItems.length).toEqual(3); // make sure setFakeModels is working
        expect(submittedData).toEqual({
            body: JSON.stringify({
                title: "Test Title",
                parent: "foo:1234",
                model: "model-foo",
                state: "Inactive",
            }),
            credentials: "include",
            headers: {
                Authorization: "Token null",
                "Content-Type": "application/json",
            },
            method: "POST",
            mode: "cors",
        });
        expect(screen.queryAllByText("Object created:")).toHaveLength(1);
    });

    it("pre-fills parent pid using parentPid property", async () => {
        props.parentPid = "foo:1234";
        props.allowChangeParentPid = false;
        await act(async () => {
            render(getCreateObjectToTest(props));
            await waitFor(() => expect(global.fetch).toHaveBeenCalled());
            nodeSelectFunction(new Event("event-foo"), "model-foo");
        });
        fireEvent.change(screen.getByRole("textbox", { name: "Title" }), { target: { value: "Test Title" } });
        await act(async () => {
            await userEvent.setup().click(screen.getByRole("button", { name: "Create Object" }));
        });
        expect(treeItems.length).toEqual(3); // make sure setFakeModels is working
        expect(submittedData).toEqual({
            body: JSON.stringify({
                title: "Test Title",
                parent: "foo:1234",
                model: "model-foo",
                state: "Inactive",
            }),
            credentials: "include",
            headers: {
                Authorization: "Token null",
                "Content-Type": "application/json",
            },
            method: "POST",
            mode: "cors",
        });
    });

    it("submits appropriate data with active state and no parent", async () => {
        props.parentPid = "foo:1234";
        props.allowNoParentPid = true;
        await act(async () => {
            render(getCreateObjectToTest(props));
            await waitFor(() => expect(global.fetch).toHaveBeenCalled());
            nodeSelectFunction(new Event("event-foo"), "model-foo");
        });
        fireEvent.change(screen.getByRole("textbox", { name: "Title" }), { target: { value: "Test Title" } });
        const user = userEvent.setup();
        await act(async () => {
            await user.click(screen.getByRole("radio", { name: "Active" }));
            await user.click(screen.getByRole("checkbox", { name: "No parent PID" }));
            await user.click(screen.getByRole("button", { name: "Create Object" }));
        });
        expect(submittedData).toEqual({
            body: JSON.stringify({
                title: "Test Title",
                parent: "",
                model: "model-foo",
                state: "Active",
            }),
            credentials: "include",
            headers: {
                Authorization: "Token null",
                "Content-Type": "application/json",
            },
            method: "POST",
            mode: "cors",
        });
    });

    it("checks no parent when parent pid is cleared", async () => {
        props.parentPid = "foo:1234";
        props.allowNoParentPid = true;
        await act(async () => {
            render(getCreateObjectToTest(props));
            await waitFor(() => expect(global.fetch).toHaveBeenCalled());
            nodeSelectFunction(new Event("event-foo"), "model-foo");
        });
        const user = userEvent.setup();
        await act(async () => {
            fireEvent.change(screen.getByRole("textbox", { name: "Title" }), { target: { value: "Test Title" } });
            await user.click(screen.getByRole("radio", { name: "Active" }));
            fireEvent.change(screen.getByRole("textbox", { name: "Parent ID" }), { target: { value: "" } });
            await user.click(screen.getByRole("button", { name: "Create Object" }));
        });
        expect(submittedData).toEqual({
            body: JSON.stringify({
                title: "Test Title",
                parent: "",
                model: "model-foo",
                state: "Active",
            }),
            credentials: "include",
            headers: {
                Authorization: "Token null",
                "Content-Type": "application/json",
            },
            method: "POST",
            mode: "cors",
        });
    });
});
