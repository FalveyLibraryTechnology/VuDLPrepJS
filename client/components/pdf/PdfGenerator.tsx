import React, { useState } from "react";
import { baseUrl } from "../../util/routes";
import { useFetchContext } from "../../context/FetchContext";
import BasicBreadcrumbs from "../shared/BasicBreadcrumbs";

const PdfGenerator = (): React.ReactElement => {
    const [pid, setPid] = useState("");
    const [results, setResults] = useState("");
    const {
        action: { fetchText },
    } = useFetchContext();

    const doApiCall = async (method: string) => {
        try {
            setResults(
                await fetchText(`${baseUrl}/messenger/pdfgenerator/${encodeURIComponent(pid.trim())}`, { method }),
            );
        } catch (error) {
            setResults(error.message);
        }
    };

    return (
        <div>
            <BasicBreadcrumbs />
            <h1>PDF Generator Tool</h1>
            <label>
                PID: <input type="text" id="pdfGeneratePid" value={pid} onChange={(e) => setPid(e.target.value)} />
            </label>
            <button id="pdfGenerateButton" onClick={() => doApiCall("POST")}>
                Generate
            </button>
            <h2>Results:</h2>
            <pre id="pdfGenerateResults">{results}</pre>
        </div>
    );
};

export default PdfGenerator;
