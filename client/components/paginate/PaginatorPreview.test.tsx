import React from "react";
import { beforeEach, describe, expect, it } from "@jest/globals";
import renderer from "react-test-renderer";
import PaginatorPreview from "./PaginatorPreview";

describe("PaginatorPreview", () => {
    let props;

    beforeEach(() => {
        props = {
            img: "testImage",
        };
    });

    it("renders", () => {
        const tree = renderer.create(<PaginatorPreview {...props} />).toJSON();
        expect(tree).toMatchSnapshot();
        expect(tree.children[0].props.className).toEqual("preview-image");
    });

    it("does not render image", () => {
        props.img = "";
        const tree = renderer.create(<PaginatorPreview {...props} />).toJSON();
        expect(JSON.stringify(tree).includes("preview-image")).toBeFalsy();
    });
});
