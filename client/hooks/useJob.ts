import { useFetchContext } from "../context/FetchContext";
import { useRef, useState } from "react";
import { getDerivUrl, getIngestUrl, getStatusUrl } from "../util/routes";
import { getAgeString } from "../util/useJobHelper";

interface JobStatus {
    derivatives: Record<string, unknown>;
    minutes_since_upload: number;
    file_problems: Record<string, Array<string>>;
    published: boolean;
    ingesting: boolean;
    documents: number;
    audio: number;
    video: number;
    ingest_info: string;
}

export interface JobProps {
    category: string;
    children: string;
}

export interface ActionInterface {
    onClick: (e: any) => void;
    text: string;
}

const useJob = ({ category, children }: JobProps) => {
    const {
        action: { makeRequest, fetchJSON },
    } = useFetchContext();
    const [statusText, setStatusText] = useState<Array<string>>([]);
    const [published, setPublished] = useState<boolean>(false);
    const [clickWarning, setClickWarning] = useState("");
    const [action, setAction] = useState<ActionInterface|null>(null);
    const [ingestInfo, setIngestInfo] = useState("");
    const [clickable, setClickable] = useState(false);
    const timeoutRef = useRef<NodeJS.Timeout|null>(null);
    const derivativeTypeCount = 3;

    const getPublishedStatusText = ({ derivatives, ingesting, published }) => {
        if (published) {
            if (ingesting) {
                return ["ingesting now; cannot be edited"];
            }
            setAction({
                onClick: ingest,
                text: "ingest now",
            });
            return ["queued for ingestion; cannot be edited"];
        } else if (derivatives.expected === derivatives.processed) {
            setClickable(true);
            return ["ready"];
        }
        if (!derivatives.building) {
            setAction({
                onClick: buildDerivatives,
                text: "build derivatives",
            });
        }
        const percentDone = 100 * (derivatives.processed / derivatives.expected);
        setClickable(true);
        return ["derivatives: " + percentDone.toFixed(2) + "% built"];
    };

    const getJobStatusText = ({ derivatives, documents, audio, video, ingesting, published }) => {
        if (derivatives.expected === 0 && documents === 0 && audio === 0 && video === 0) {
            return ["empty job"];
        }
        const pageCount = parseInt(derivatives.expected / derivativeTypeCount);
        return [
            ...(documents > 0 ? [`${documents} document${documents > 1 ? "s" : ""}`] : []),
            ...(audio > 0 ? [`${audio} audio`] : []),
            ...(video > 0 ? [`${video} video`] : []),
            `${pageCount} page${pageCount > 1 ? "s" : ""}`,
            ...getPublishedStatusText({ derivatives, ingesting, published }),
        ];
    };
    const getStatusText = ({
        derivatives,
        minutes_since_upload,
        documents,
        audio,
        video,
        ingesting,
        published
    }: JobStatus) => {
        if (typeof derivatives !== "undefined") {
            if (minutes_since_upload < 10) {
                setClickWarning(
                    `This job was updated ${minutes_since_upload} minute` +
                        `${minutes_since_upload !== 1 ? "s" : ""} ago. Please do not edit it` +
                        " unless you are sure all uploads have fully completed."
                );
            }
            return [
                getAgeString(minutes_since_upload),
                ...getJobStatusText({ derivatives, documents, audio, video, ingesting, published }),
            ];
        }
        return ["loading..."];
    };

    const buildDerivatives = async (e) => {
        e.preventDefault();
        e.stopPropagation();
        await makeRequest(
            getDerivUrl(category, children),
            {
                method: "PUT",
            },
            {
                "Content-Type": "application/json",
            }
        );
        setClickable(false);
        setClickWarning("");
        setAction(null);
        if (!timeoutRef.current) {
            await updateStatus(e);
        }
    };

    const ingest = async (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (!window.confirm("Are you sure? This will put a load on the server!")) {
            return;
        }
        await makeRequest(
            getIngestUrl(category, children),
            {
                method: "PUT",
            },
            {
                "Content-Type": "application/json",
            }
        );
        setClickable(false);
        setClickWarning("");
        setAction(null);
        if (!timeoutRef.current) {
            await updateStatus(e);
        }
    };

    const updateStatus = async (e = null) => {
        if (typeof e !== "undefined" && e) {
            e.stopPropagation();
        }
        try {
            const response = await fetchJSON(getStatusUrl(category, children));
            setIngestInfo(response?.ingest_info);
            setPublished(response?.published);
            setStatusText(getStatusText(response));
            if (
                response?.derivatives?.building ||
                (typeof response.ingest_info !== "undefined" && response?.ingest_info.length > 0)
            ) {
                timeoutRef.current = setTimeout(updateStatus, 1000);
            } else {
                timeoutRef.current = null;
            }
        } catch (error) {
            setIngestInfo("");
            setPublished(false);
            console.error(error);
            timeoutRef.current = null;
        }
    };

    return {
        state: {
            action,
            clickable,
            clickWarning,
            ingestInfo,
            statusText,
            timeoutRef,
            published,
        },
        action: {
            updateStatus,
        },
    };
};

export default useJob;
