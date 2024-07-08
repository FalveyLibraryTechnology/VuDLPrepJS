import fs = require("fs");
import AbstractAVFile from "./AbstractAVFile";
import Config from "./Config";

class VideoFile extends AbstractAVFile {
    extensions: Array<string> = ["MP4"];

    public static build(filename: string, dir: string): VideoFile {
        return new VideoFile(filename, dir, Config.getInstance());
    }

    static fromRaw(raw: Record<string, string>, config: Config = null): VideoFile {
        return new VideoFile(raw.filename, raw.label, config ?? Config.getInstance());
    }

    get mimeType(): string {
        const ext = this.filename.substring(this.filename.lastIndexOf(".") + 1).toLowerCase();
        const extMap: Record<string, string> = {
            avi: "video/x-msvideo",
            mkv: "video/x-matroska",
            mov: "video/quicktime",
        };
        return extMap[ext] ?? "video/" + ext;
    }

    get textTranscript(): string | null {
        const txtPath = this.derivativePath("txt");
        return fs.existsSync(txtPath) ? txtPath : null;
    }

    get vtt(): string | null {
        const vttPath = this.derivativePath("vtt");
        return fs.existsSync(vttPath) ? vttPath : null;
    }
}

export default VideoFile;
