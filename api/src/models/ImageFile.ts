import Sharp = require("sharp");
import path = require("path");

import { execSync } from "child_process";

import Config from "./Config";

import fs = require("fs");

class ImageFile {
    filename: string;
    sizes: Record<string, number> = {
        LARGE: 3000,
        MEDIUM: 640,
        THUMBNAIL: 120,
    };
    config: Config;

    constructor(filename: string, config: Config) {
        this.filename = filename;
        this.config = config;
    }

    public static build(filename: string): ImageFile {
        return new ImageFile(filename, Config.getInstance());
    }

    constraintForSize(size: string): number {
        if (size in this.sizes) {
            return this.sizes[size];
        } else {
            console.error("Invalid image size: " + size);
            return 1;
        }
    }

    async derivative(size: string): Promise<string> {
        const deriv = this.derivativePath(size);

        // Return existing derivative
        if (fs.existsSync(deriv)) {
            return deriv;
        }

        const image = Sharp(this.filename, this.config.sharpOptions);
        const constraint = this.constraintForSize(size);

        const metadata = await image.metadata();
        if (metadata.width > constraint || metadata.height > constraint) {
            try {
                await image
                    .resize(constraint, constraint, { fit: "inside" })
                    .jpeg({ quality: 90 }) // set JPEG quality
                    .toFile(deriv);
                console.log("generated derivative", constraint, deriv);
            } catch (error) {
                console.error("resize error: " + error);
            }
        } else {
            // Image source smaller than derivative size
            await image.toFile(deriv);
        }
        return deriv;
    }

    makePathIfMissing(basePath: string): void {
        if (!fs.existsSync(basePath)) {
            fs.mkdirSync(basePath, { recursive: true });
        }
    }

    derivativePath(size: string, extension = "jpg"): string {
        const dir = path.dirname(this.filename);
        const ext = this.filename.substring(this.filename.lastIndexOf("."));
        const filename = path.basename(this.filename, ext);
        const basePath = dir + "/" + filename + "/" + size;
        this.makePathIfMissing(basePath);
        return basePath + "/" + filename + "." + extension.toLowerCase();
    }

    protected filterIllegalCharacters(txt: string): void {
        const allowedChars = this.config.tesseractAllowedChars;
        // Only filter if we have a non-empty setting:
        if (allowedChars) {
            const content = fs.readFileSync(txt);
            const regexpStr = "[^" + allowedChars.replace(/[-[\]{}()*+?.,\\^$|]/g, "\\$&") + "\\s]";
            const regexp = new RegExp(regexpStr, "g");
            const filteredTxt = content.toString().replace(regexp, "");
            fs.writeFileSync(txt, filteredTxt);
        }
    }

    async ocr(): Promise<string> {
        const txt = this.derivativePath("OCR-DIRTY", "txt");
        if (!fs.existsSync(txt)) {
            const txtPath = path.dirname(txt);
            if (!fs.existsSync(txtPath)) {
                fs.mkdirSync(txtPath, { recursive: true });
            }
            const deriv = await this.ocrDerivative();
            const ts_cmd =
                this.config.tesseractPath + " " + deriv + " " + txt.slice(0, -4) + " " + this.ocrProperties();
            execSync(ts_cmd);
            if (!fs.existsSync(txt)) {
                throw new Error("Problem running tesseract");
            }
            this.filterIllegalCharacters(txt);
        }
        return txt;
    }

    async ocrDerivative(): Promise<string> {
        const png = this.derivativePath("ocr/pngs", "png");
        if (!fs.existsSync(png)) {
            const pngPath = path.dirname(png);
            if (!fs.existsSync(pngPath)) {
                fs.mkdirSync(pngPath, { recursive: true });
            }
            const deriv = await this.derivative("LARGE");
            const tc_cmd =
                this.config.textcleanerPath + " " + this.config.textcleanerSwitches + " " + deriv + " " + png;
            execSync(tc_cmd);
            if (!fs.existsSync(png)) {
                throw new Error("Problem running textcleaner");
            }
        }
        return png;
    }

    ocrProperties(): string {
        const file = path.dirname(this.filename) + "/ocr/tesseract.config";
        const dir = path.dirname(file);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        // For Tesseract 3, we used to write the tessedit_char_whitelist setting here,
        // but we now handle that differently due to changes in Tesseract 4. This method
        // is being retained in case we need a place to customize other config settings
        // in the future, but for now it is just writing an empty file.
        const content = "";
        if (!fs.existsSync(file)) {
            fs.writeFileSync(file, content);
        }
        return file;
    }

    public delete(): void {
        const files: Array<string> = [this.filename];
        for (const size of Object.keys(this.sizes)) {
            files.push(this.derivativePath(size, "jpg"));
        }
        files.push(this.derivativePath("ocr/pngs", "png"));
        files.push(this.derivativePath("OCR-DIRTY", "txt"));
        for (const file of files) {
            if (fs.existsSync(file)) {
                try {
                    fs.truncateSync(file, 0);
                    fs.rmSync(file);
                } catch (err) {
                    console.error(err);
                }
            }
        }
    }
}

export default ImageFile;
