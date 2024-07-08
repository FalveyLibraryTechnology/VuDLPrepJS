import AbstractAVFile from "./AbstractAVFile";
import Config from "./Config";

class AudioFile extends AbstractAVFile {
    extensions: Array<string> = ["OGG", "MP3"];

    public static build(filename: string, dir: string): AudioFile {
        return new AudioFile(filename, dir, Config.getInstance());
    }

    static fromRaw(raw: Record<string, string>, config: Config = null): AudioFile {
        return new AudioFile(raw.filename, raw.label, config ?? Config.getInstance());
    }
}

export default AudioFile;
