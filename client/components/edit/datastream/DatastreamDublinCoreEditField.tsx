import React, { useEffect } from "react";
import FormControl from "@mui/material/FormControl";
import BlurSavingTextField from "../../shared/BlurSavingTextField";
import NativeSelect from "@mui/material/NativeSelect";
import TextField from "@mui/material/TextField";
import { Editor } from "@tinymce/tinymce-react";

interface DatastreamDublinCoreEditFieldProps {
    value: string;
    setValue: (value: string) => void;
    fieldType: string;
    legalValues?: Array<string>;
}

const DatastreamDublinCoreEditField = ({
    value,
    setValue,
    fieldType,
    legalValues = [],
}: DatastreamDublinCoreEditFieldProps): React.ReactElement => {
    // We need this effect to make TinyMCE pop-up dialogs (e.g. view source) work:
    useEffect(() => {
        const handler = (e) => {
            if (e.target.closest(".tox-tinymce-aux, .moxman-window, .tam-assetmanager-root") !== null) {
                e.stopImmediatePropagation();
            }
        };
        document.addEventListener("focusin", handler);
        return () => document.removeEventListener("focusin", handler);
    }, []);
    const eventHelperCallback = (e) => {
        setValue(e.target.value);
    };
    const saveHtmlFromTinyMCE = (event, editor) => {
        setValue(editor.getContent());
    };
    switch (fieldType) {
        case "dropdown":
            if (!legalValues.includes(value)) {
                legalValues.push(value);
            }
            return (
                <FormControl fullWidth={true}>
                    <NativeSelect value={value} onChange={eventHelperCallback}>
                        {legalValues.map((current, index) => {
                            return (
                                <option key={`${current}_${index}`} value={current}>
                                    {current}
                                </option>
                            );
                        })}
                    </NativeSelect>
                </FormControl>
            );
        case "html":
            return (
                <Editor
                    init={{ plugins: "code link" }}
                    tinymceScriptSrc="/tinymce/tinymce.min.js"
                    onBlur={saveHtmlFromTinyMCE}
                    licenseKey="gpl"
                    initialValue={value.length > 0 ? value : "<div></div>"}
                />
            );
        case "locked":
            return (
                <FormControl fullWidth={true}>
                    <TextField type="text" value={value} disabled={true} />
                </FormControl>
            );
        case "text":
            return (
                <FormControl fullWidth={true}>
                    <BlurSavingTextField value={value} setValue={setValue} />
                </FormControl>
            );
        default:
            return <p>{`Unsupported type (${fieldType}): ${value}`}</p>;
    }
};

export default DatastreamDublinCoreEditField;
