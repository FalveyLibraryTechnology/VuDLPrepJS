import glob = require("glob");
import path = require("path");

import VideoFile from "./VideoFile";
import Job from "./Job";

class VideoOrder {
    list: Array<VideoFile> = [];

    constructor(list: Array<VideoFile>) {
        this.list = list;
    }

    static fromJob(job: Job): VideoOrder {
        let pattern = job.dir + "/*.{avi,mkv,mov,mp4}";
        const options: Record<string, unknown> = { nocase: true };
        // Special case for Windows -- we need to account for drive letters:
        const colonIndex = pattern.indexOf(":");
        if (colonIndex > -1) {
            options.root = pattern.substring(0, colonIndex + 2);
            pattern = pattern.substring(colonIndex + 1);
        }
        // Sort by filename, and keep only one video per base filename, picking
        // the "highest-valued" extension based on the provided map.
        const filenameMap: Record<string, string> = {};
        const extensionPriorityMap: Record<string, number> = {
            avi: 3,
            mkv: 4,
            mov: 2,
            mp4: 1,
        };
        glob.sync(pattern, options).forEach((filename: string) => {
            const ext = filename.substring(filename.lastIndexOf(".") + 1).toLowerCase();
            const baseFilename = path.basename(filename, ext);
            const priorFilename = filenameMap[baseFilename] ?? ".";
            const priorExt = priorFilename.substring(priorFilename.lastIndexOf(".") + 1).toLowerCase();
            const priority = extensionPriorityMap[ext] ?? 0;
            const priorPriority = extensionPriorityMap[priorExt] ?? 0;
            if (priority > priorPriority) {
                filenameMap[baseFilename] = filename;
            }
        });
        const list = Object.values(filenameMap).map(function (video: string) {
            return VideoFile.build(path.basename(video), job.dir);
        });
        return new VideoOrder(list);
    }

    static fromRaw(raw: Array<Record<string, string>>): VideoOrder {
        const list = raw.map(function (list) {
            return VideoFile.fromRaw(list);
        });
        return new VideoOrder(list);
    }

    raw(): Array<Record<string, string>> {
        return this.list.map(function (file: VideoFile) {
            return file.raw();
        });
    }
}

export default VideoOrder;
