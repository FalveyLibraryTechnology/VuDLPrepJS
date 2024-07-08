import React, { useState } from "react";
import { baseUrl } from "../../util/routes";
import { useFetchContext } from "../../context/FetchContext";
interface PidRangeIndexerProps {
    setResults: (pid: string) => void;
}
const PidRangeIndexer = ({ setResults }: PidRangeIndexerProps): React.ReactElement => {
    const [prefix, setPrefix] = useState("vudl:");
    const [to, setTo] = useState("");
    const [from, setFrom] = useState("");
    const {
        action: { fetchText },
    } = useFetchContext();

    const doApiCall = async () => {
        setResults("Loading...");
        try {
            setResults(
                await fetchText(
                    `${baseUrl}/messenger/queuesolrindex`,
                    {
                        method: "POST",
                        body: JSON.stringify({ prefix, to, from }),
                    },
                    { "Content-Type": "application/json" },
                ),
            );
        } catch (error) {
            setResults((error as Error).message);
        }
    };

    return (
        <>
            <label>
                Prefix:
                <input id="pidRangePrefix" type="text" value={prefix} onChange={(e) => setPrefix(e.target.value)} />
            </label>
            <label>
                From (number):
                <input id="pidRangeFrom" type="text" value={from} onChange={(e) => setFrom(e.target.value)} />
            </label>
            <label>
                To (number): <input id="pidRangeTo" type="text" value={to} onChange={(e) => setTo(e.target.value)} />
            </label>
            <button onClick={() => doApiCall()}>Queue Range</button>
        </>
    );
};

export default PidRangeIndexer;
