import React, { useState } from "react";
import ChildList from "./children/ChildList";
import Accordion from "@mui/material/Accordion";
import AccordionSummary from "@mui/material/AccordionSummary";
import AccordionDetails from "@mui/material/AccordionDetails";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { useEditorContext } from "../../context/EditorContext";
import { getRecentPidsCatalog } from "../../util/RecentPidsCatalog";

export interface Parent {
    pid: string;
    title: string;
}

interface PidPickerProps {
    selected: string;
    setSelected: (pid: string) => void;
    parents?: Array<Parent>;
}

const PidPicker = ({ selected, setSelected, parents = [] }: PidPickerProps): React.ReactElement => {
    const {
        state: { favoritePidsCatalog },
    } = useEditorContext();
    const [textboxPid, setTextboxPid] = useState<string>("");
    const favorites = [];
    for (const pid in favoritePidsCatalog) {
        favorites[favorites.length] = (
            <li key={`favorite_${pid}`}>
                <button onClick={() => setSelected(pid)}>{favoritePidsCatalog[pid]}</button>
            </li>
        );
    }
    const favoritesAccordion =
        favorites.length > 0 ? (
            <Accordion>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>Choose PID from Favorites</AccordionSummary>
                <AccordionDetails>
                    <ul>{favorites}</ul>
                </AccordionDetails>
            </Accordion>
        ) : null;

    const recentPidsCatalog = getRecentPidsCatalog();
    const recents = [];
    for (const pid in recentPidsCatalog) {
        recents[recents.length] = (
            <li key={`recent_${pid}`}>
                <button onClick={() => setSelected(pid)}>{recentPidsCatalog[pid]}</button>
            </li>
        );
    }
    const recentAccordion =
        recents.length > 0 ? (
            <Accordion>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>Choose PID from Recently Viewed</AccordionSummary>
                <AccordionDetails>
                    <ul>{recents}</ul>
                </AccordionDetails>
            </Accordion>
        ) : null;

    const parentAccordions = parents.map((parent: Parent) => {
        return (
            <Accordion key={`clone_parent_${parent.pid}`}>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    Choose PID from Parent ({parent.title})
                </AccordionSummary>
                <AccordionDetails>
                    <ChildList pid={parent.pid} selectCallback={setSelected} />
                </AccordionDetails>
            </Accordion>
        );
    });

    return selected.length > 0 ? (
        <>
            Selected pid: {selected}. <button onClick={() => setSelected("")}>Clear</button>
        </>
    ) : (
        <>
            <Accordion>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>Enter PID manually</AccordionSummary>
                <AccordionDetails>
                    <label>
                        Enter PID:{" "}
                        <input type="text" value={textboxPid} onChange={(e) => setTextboxPid(e.target.value)} />
                    </label>
                    <button onClick={() => setSelected(textboxPid)}>Set</button>
                </AccordionDetails>
            </Accordion>
            <Accordion>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>Choose PID from Tree</AccordionSummary>
                <AccordionDetails>
                    <ChildList selectCallback={setSelected} />
                </AccordionDetails>
            </Accordion>
            {parentAccordions}
            {favoritesAccordion}
            {recentAccordion}
        </>
    );
};

export default PidPicker;
