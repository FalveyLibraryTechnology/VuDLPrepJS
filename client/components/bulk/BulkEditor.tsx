import React, { useEffect, useState } from "react";
import { baseUrl, objectDatastreamLicenseUrl } from "../../util/routes";
import { useFetchContext } from "../../context/FetchContext";
import { useEditorContext } from "../../context/EditorContext";
import BasicBreadcrumbs from "../shared/BasicBreadcrumbs";
import FormControl from "@mui/material/FormControl";
import InputLabel from "@mui/material/InputLabel";
import Select from "@mui/material/Select";
import MenuItem from "@mui/material/MenuItem";
import BlurSavingTextField from "../shared/BlurSavingTextField";

const BulkEditor = (): React.ReactElement => {
    const {
        state: { licensesCatalog },
        action: { initializeCatalog },
    } = useEditorContext();
    const [results, setResults] = useState("");
    const [selectedRecords, setSelectedRecords] = useState("");
    const [licenseKey, setLicenseKey] = useState("");
    const [query, setQuery] = useState("");
    const [selectedRecordIds, setSelectedRecordIds] = useState<Array<string>>([]);
    const {
        action: { fetchText },
    } = useFetchContext();

    useEffect(() => {
        initializeCatalog();
    }, []);

    const doFetchRecords = async () => {
        try {
            const result = await fetchText(
                baseUrl + "/api/edit/query/solr",
                { method: "POST", body: JSON.stringify({ query }) },
                { "Content-Type": "application/json" },
            );
            const json = JSON.parse(result);
            let text = "";
            const newSelectedRecordIds: Array<string> = [];
            if (json.numFound < 1) {
                text = "No results found.";
            } else {
                json.docs.forEach((doc) => {
                    text += `${doc.id}:\t${doc.title}\n`;
                    newSelectedRecordIds.push(doc.id);
                });
            }
            setSelectedRecords(text);
            setSelectedRecordIds(newSelectedRecordIds);
        } catch (error) {
            setSelectedRecords(error.message);
        }
    };

    const doApplyChanges = async () => {
        try {
            if (licenseKey == "") {
                setResults("No change requested.");
                return;
            }
            if (selectedRecordIds.length < 1) {
                setResults("No records selected.");
                return;
            }
            let result = "";
            for (let i = 0; i < selectedRecordIds.length; i++) {
                const id = selectedRecordIds[i];
                const text = await fetchText(
                    objectDatastreamLicenseUrl(id, "LICENSE"),
                    {
                        method: "POST",
                        body: JSON.stringify({
                            licenseKey,
                        }),
                    },
                    { "Content-Type": "application/json" },
                );
                result += `${id}: ${text}\n`;
                setResults(result);
            }
        } catch (error) {
            setResults(error.message);
        }
    };

    return (
        <div>
            <BasicBreadcrumbs />
            <h1>Bulk Editor</h1>
            <h2>Record Selector</h2>
            <FormControl fullWidth>
                <BlurSavingTextField
                    value={query}
                    setValue={setQuery}
                    options={{ id: "outlined-basic", label: "Search Query", variant: "outlined" }}
                />
            </FormControl>
            <FormControl>
                <button onClick={() => doFetchRecords()}>Fetch Records</button>
            </FormControl>
            <p>{`${selectedRecordIds.length} selected.`}</p>
            <pre id="selectedRecords">{selectedRecords}</pre>
            <h2>Changes to Apply</h2>
            <FormControl fullWidth>
                <InputLabel>Choose New License</InputLabel>
                <Select
                    label="Choose New License"
                    value={licenseKey}
                    onChange={(event) => setLicenseKey(event.target.value)}
                >
                    <MenuItem key="nochange" value="">
                        Do not change license.
                    </MenuItem>
                    {Object.entries(licensesCatalog).map(([key, license]) => {
                        return (
                            <MenuItem key={key} value={key}>
                                {license.name}
                            </MenuItem>
                        );
                    })}
                </Select>
            </FormControl>
            <FormControl>
                <button id="bulkEditSubmit" onClick={() => doApplyChanges()}>
                    Apply Changes
                </button>
            </FormControl>
            <h2>Results:</h2>
            <pre id="bulkEditResults">{results}</pre>
        </div>
    );
};

export default BulkEditor;
