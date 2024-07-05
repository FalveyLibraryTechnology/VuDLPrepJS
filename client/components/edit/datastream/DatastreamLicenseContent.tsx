import React, { useEffect, useState } from "react";
import Button from "@mui/material/Button";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import FormControl from "@mui/material/FormControl";
import FormControlLabel from "@mui/material/FormControlLabel";
import FormLabel from "@mui/material/FormLabel";
import Radio from "@mui/material/Radio";
import RadioGroup from "@mui/material/RadioGroup";
import useDatastreamOperation from "../../../hooks/useDatastreamOperation";
import { useEditorContext } from "../../../context/EditorContext";
import { useGlobalContext } from "../../../context/GlobalContext";

const DatastreamLicenseContent = (): React.ReactElement => {
    const {
        state: { licensesCatalog },
    } = useEditorContext();
    const {
        action: { closeModal },
    } = useGlobalContext();
    const { uploadLicense, getLicenseKey } = useDatastreamOperation();
    const [licenseKey, setLicenseKey] = useState("");
    useEffect(() => {
        const getLicense = async () => {
            setLicenseKey(await getLicenseKey());
        };
        getLicense();
    }, []);
    return (
        <>
            <DialogContent>
                <FormControl>
                    <FormLabel>Choose License</FormLabel>
                    <RadioGroup value={licenseKey} onChange={(event) => setLicenseKey(event.target.value)}>
                        {Object.entries(licensesCatalog).map(([key, license]) => {
                            return (
                                <FormControlLabel
                                    key={key}
                                    value={key}
                                    control={<Radio />}
                                    label={license.name}
                                    sx={{ margin: "0" }}
                                />
                            );
                        })}
                    </RadioGroup>
                </FormControl>
            </DialogContent>

            <DialogActions>
                <Button
                    className="uploadLicenseButton"
                    onClick={async () => {
                        await uploadLicense(licenseKey);
                    }}
                >
                    Save
                </Button>
                <Button onClick={() => closeModal("datastream")}>Cancel</Button>
            </DialogActions>
        </>
    );
};

export default DatastreamLicenseContent;
