import Config from "./Config";
import ImageFile from "./ImageFile";
import fs = require("fs");

// We don't want Sharp loading to interfere with the test suite (and we
// don't really want to do any image manipulation during testing).
jest.mock("sharp", () => {
    return {};
});

describe("Image", () => {
    let image: ImageFile;
    beforeEach(() => {
        image = new ImageFile("/foo/test1.tif", new Config({}));
    });

    it("should return the filename", () => {
        expect(image.filename).toEqual("/foo/test1.tif");
    });

    it("generates appropriate derivative paths", () => {
        const existsSpy = jest.spyOn(image, "makePathIfMissing").mockImplementation(jest.fn());
        expect(image.derivativePath("HUGE", "gif")).toEqual("/foo/test1/HUGE/test1.gif");
        expect(existsSpy).toHaveBeenCalledWith("/foo/test1/HUGE");
    });

    it("can delete all files associated with an image", () => {
        const existsSpy = jest.spyOn(fs, "existsSync").mockReturnValue(true);
        const truncateSpy = jest.spyOn(fs, "truncateSync").mockImplementation(jest.fn());
        const rmSpy = jest.spyOn(fs, "rmSync").mockImplementation(jest.fn());

        const makePathSpy = jest.spyOn(image, "makePathIfMissing").mockImplementation(jest.fn());

        image.delete();

        const expectedFiles = [
            "/foo/test1.tif",
            "/foo/test1/LARGE/test1.jpg",
            "/foo/test1/MEDIUM/test1.jpg",
            "/foo/test1/THUMBNAIL/test1.jpg",
            "/foo/test1/ocr/pngs/test1.png",
            "/foo/test1/OCR-DIRTY/test1.txt",
        ];

        expect(makePathSpy).toHaveBeenCalledTimes(5);
        expect(existsSpy).toHaveBeenCalledTimes(expectedFiles.length);
        expect(truncateSpy).toHaveBeenCalledTimes(expectedFiles.length);
        expect(rmSpy).toHaveBeenCalledTimes(expectedFiles.length);
        expectedFiles.forEach((file: string, i: number) => {
            expect(existsSpy).toHaveBeenNthCalledWith(i + 1, file);
            expect(truncateSpy).toHaveBeenNthCalledWith(i + 1, file, 0);
            expect(rmSpy).toHaveBeenNthCalledWith(i + 1, file);
        });
    });
});
