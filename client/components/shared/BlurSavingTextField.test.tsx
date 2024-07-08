import React from "react";
import { describe, beforeEach, expect, it } from "@jest/globals";
import renderer from "react-test-renderer";
import BlurSavingTextField, { BlurSavingTextFieldProps } from "./BlurSavingTextField";

jest.mock("@mui/material/TextField", function () {
    return (props) => "TextField: " + JSON.stringify(props);
});

describe("BlurSavingTextField", () => {
    let props: BlurSavingTextFieldProps;
    let value: string;
    let setterWasCalled: boolean;
    beforeEach(() => {
        value = "foo";
        setterWasCalled = false;
        props = {
            value,
            setValue: (x: string) => {
                setterWasCalled = true;
                value = x;
            },
        };
    });

    it("renders using the initial value", () => {
        const tree = renderer.create(<BlurSavingTextField {...props} />).toJSON();
        expect(tree).toMatchSnapshot();
    });

    it("updates the temporary internal value appropriately", () => {
        const tree = renderer.create(<BlurSavingTextField {...props} />);
        renderer.act(() => {
            tree.root.children[0].props.onChange({ target: { value: "bar" } });
        });
        expect(tree.toJSON()).toMatchSnapshot();
        // Even though the internal value has changed, the external hasn't (because
        // we didn't trigger blur yet):
        expect(value).toEqual("foo");
    });

    it("saves on blur", () => {
        const tree = renderer.create(<BlurSavingTextField {...props} />);
        renderer.act(() => {
            tree.root.children[0].props.onBlur({ target: { value: "bar" } });
        });
        expect(setterWasCalled).toEqual(true);
        expect(value).toEqual("bar");
    });

    it("doesn't call the save callback if nothing has changed", () => {
        const tree = renderer.create(<BlurSavingTextField {...props} />);
        renderer.act(() => {
            tree.root.children[0].props.onBlur({ target: { value: "foo" } });
        });
        expect(setterWasCalled).toEqual(false);
        expect(value).toEqual("foo");
    });
});
