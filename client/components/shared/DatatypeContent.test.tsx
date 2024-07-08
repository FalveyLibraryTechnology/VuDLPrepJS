import React from "react";
import { describe, beforeEach, expect, it } from "@jest/globals";
import renderer from "react-test-renderer";
import DatatypeContent from "./DatatypeContent";

describe("DatatypeContent", () => {
    let props;
    beforeEach(() => {
        props = {
            data: "",
            mimeType: "",
        };
    });

    it("renders img on image primaryType", () => {
        props.data = "test1";
        props.mimeType = "image/jpeg";
        const tree = renderer.create(<DatatypeContent {...props} />);

        expect(tree.toJSON()).toMatchSnapshot();
        expect(tree.root.findByType("img")).toBeTruthy();
    });

    it("renders textarea on text primaryType", () => {
        props.data = "testXml";
        props.mimeType = "text/xml";
        const tree = renderer.create(<DatatypeContent {...props} />);

        expect(tree.toJSON()).toMatchSnapshot();
        expect(tree.root.findByType("div").props.children).toContain(props.data);
    });

    it("renders object on application/pdf", () => {
        props.data = "testPdf";
        props.mimeType = "application/pdf";
        const tree = renderer.create(<DatatypeContent {...props} />);

        expect(tree.toJSON()).toMatchSnapshot();
        expect(tree.root.findByType("object")).toBeTruthy();
    });

    it("renders audio tag on audio primaryType", () => {
        props.data = "testAudio";
        props.mimeType = "audio/mpeg3";
        const tree = renderer.create(<DatatypeContent {...props} />);

        expect(tree.toJSON()).toMatchSnapshot();
        expect(tree.root.findByType("audio")).toBeTruthy();
    });
});
