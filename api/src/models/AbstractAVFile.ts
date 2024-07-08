import fs = require("fs");
import path = require("path");
import Config from "./Config";
import { execSync } from "child_process";

class AbstractAVFile {
    filename: string;
    extensions: Array<string> = [];
    dir: string;
    config: Config;

    constructor(filename: string, dir: string, config: Config) {
        this.filename = filename;
        this.dir = dir;
        this.config = config;
    }

    derivative(extension: string): string {
        const deriv = this.derivativePath(extension);
        if (!fs.existsSync(deriv)) {
            const dir = path.dirname(deriv);
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
            if (this.extensions.includes(extension)) {
                const ffmpeg_path = this.config.ffmpegPath;
                if (ffmpeg_path) {
                    const ffmpegCommand = ffmpeg_path + " -i " + this.dir + "/" + this.filename + " " + deriv;
                    execSync(ffmpegCommand);
                    if (!fs.existsSync(deriv)) {
                        throw new Error("Problem generating " + deriv + " with " + ffmpeg_path);
                    }
                } else {
                    throw new Error("ffmpeg not configured");
                }
            }
        }
        return deriv;
    }

    raw(): Record<string, string> {
        return { filename: this.filename };
    }

    derivativePath(extension: string): string {
        const ext = this.filename.substring(this.filename.lastIndexOf("."));
        const filename = path.basename(this.filename, ext);
        return this.dir + "/" + filename + "." + extension.toLowerCase();
    }
}

export default AbstractAVFile;
