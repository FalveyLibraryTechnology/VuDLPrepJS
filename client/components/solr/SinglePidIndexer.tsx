import React, { useState } from "react";
import { baseUrl } from "../../util/routes";
import { useFetchContext } from "../../context/FetchContext";
interface SinglePidIndexerProps {
    setResults: (pid: string) => void;
}
const SinglePidIndexer = ({ setResults }: SinglePidIndexerProps): React.ReactElement => {
    const [pid, setPid] = useState("");
    const {
        action: { fetchText },
    } = useFetchContext();

    const doApiCall = async (method: string) => {
        setResults("Loading...");
        try {
            setResults(await fetchText(`${baseUrl}/messenger/solrindex/${encodeURIComponent(pid.trim())}`, { method }));
        } catch (error) {
            setResults(error.message);
        }
    };

    return (
        <>
            <label>
                PID: <input type="text" id="solrIndexPid" value={pid} onChange={(e) => setPid(e.target.value)} />
            </label>
            <button id="solrIndexPreviewButton" onClick={() => doApiCall("GET")}>
                Preview
            </button>
            <button id="solrIndexIndexButton" onClick={() => doApiCall("POST")}>
                Index
            </button>
        </>
    );
};

export default SinglePidIndexer;
