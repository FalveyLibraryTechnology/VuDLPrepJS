import React from "react";

import { usePaginatorContext } from "../../context/PaginatorContext";
import usePaginatorControls from "../../hooks/usePaginatorControls";
import MagicLabeler from "../../util/MagicLabeler";
import PaginatorControlGroup from "./PaginatorControlGroup";
import ZoomToggleButton from "./ZoomToggleButton";

import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh';
import CompareArrowsIcon from '@mui/icons-material/CompareArrows';
import DeleteForeverIcon from '@mui/icons-material/DeleteForever';

const PaginatorControls = (): React.ReactElement => {
    const {
        state: { currentPage, zoom, order },
        action: {
            autonumberFollowingPages,
            getLabel,
            getMagicLabel,
            setLabel,
            prevPage,
            nextPage,
            deletePage,
            save,
            toggleZoom,
        },
    } = usePaginatorContext();
    const pageCount = order.length;
    const {
        action: {
            updateCurrentPageLabel,
            approveCurrentPageLabel,
            setLabelPrefix,
            setLabelBody,
            setLabelSuffix,
            toggleBrackets,
            toggleCase,
            toggleRoman,
        },
    } = usePaginatorControls(currentPage, getMagicLabel, setLabel);
    return pageCount > 0 ? (
        <div className="controls">
            <div className="top-row">
				<div className="top-row__left">
					<input type="text" value={getLabel(currentPage) ?? ""} id="page" onChange={updateCurrentPageLabel} />
					<button onClick={prevPage}>Prev</button>
					<button
						onClick={() => {
							approveCurrentPageLabel();
							nextPage();
						}}
					>
						Next
					</button>
					<div className="status"></div>
				</div>

				<div className="top-row__right">
					<ZoomToggleButton toggleZoom={toggleZoom} zoom={zoom} />
					<button
						className="btn-primary"
						onClick={() => {
							approveCurrentPageLabel();
							save(false);
						}}
					>
						Save
					</button>
					<button
						className="btn-primary"
						onClick={() => {
							approveCurrentPageLabel();
							save(true);
						}}
					>
						Save and Publish
					</button>
				</div>
            </div>
            <PaginatorControlGroup callback={setLabelPrefix} label="prefixes">
                {MagicLabeler.prefixes}
            </PaginatorControlGroup>
            <PaginatorControlGroup callback={setLabelBody} label="labels">
                {MagicLabeler.labels}
            </PaginatorControlGroup>
            <PaginatorControlGroup callback={setLabelSuffix} label="suffixes">
                {MagicLabeler.suffixes}
            </PaginatorControlGroup>
            <div className="group">
				<div className="toggles">
					<button onClick={toggleBrackets} title="Toggle Brackets">
						[ ]
					</button>
					<button onClick={toggleCase} title="Toggle Case">
						Aa
					</button>
					<button onClick={toggleRoman} title="Toggle Roman Numerals">
						4<CompareArrowsIcon />IV
					</button>
					<button onClick={autonumberFollowingPages} title="Autonumber Following Pages">
						<AutoFixHighIcon />
					</button>
				</div>

				<button className="delete-btn" onClick={deletePage} title="Delete Current Page">
					<DeleteForeverIcon /> Delete Current Page
				</button>
            </div>
        </div>
    ) : (
        // No pages, only show save buttons:
        <>
            <button className="primary" onClick={() => save(false)}>
                Save
            </button>
            <button className="primary" onClick={() => save(true)}>
                Save and Publish
            </button>
        </>
    );
};

export default PaginatorControls;
