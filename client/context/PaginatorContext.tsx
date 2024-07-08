import React, { createContext, ReactNode, useContext, useReducer } from "react";
import MagicLabeler from "../util/MagicLabeler";
import { useFetchContext } from "./FetchContext";
import {
    countMagicLabels,
    deletePageValidation,
    getAddedPages,
    getNonRemovedPages,
    getLabel,
    userMustReviewMoreLabels,
} from "./JobPaginatorState";
import { getImageUrl, getJobUrl } from "../util/routes";

/**
 * Pass a shared entity to react components,
 * specifically a way to make api requests.
 */
const paginatorContextParams = {
    active: false,
    currentPage: 0,
    zoom: false,
    order: [],
    magicLabelCache: [],
    category: "",
    job: "",
};

const PaginatorContext = createContext({});

const typePayloadMapping = {
    UPDATE_ACTIVE: "active",
    UPDATE_CURRENT_PAGE: "currentPage",
    UPDATE_ZOOM: "zoom",
    UPDATE_ORDER: "order",
    UPDATE_MAGIC_LABEL_CACHE: "magicLabelCache",
    UPDATE_CATEGORY: "category",
    UPDATE_JOB: "job",
};
/**
 * Update the shared states of react components.
 */
const paginatorReducer = (state, { type, payload }) => {
    if (Object.keys(typePayloadMapping).includes(type)) {
        return {
            ...state,
            [`${typePayloadMapping[type]}`]: payload,
        };
    } else {
        console.error(`paginator action type: ${type} does not exist`);
        return state;
    }
};

interface PaginatorContextProviderProps {
    children: ReactNode
}

export const PaginatorContextProvider = ({ children }: PaginatorContextProviderProps) => {
    const [state, dispatch] = useReducer(paginatorReducer, paginatorContextParams);
    const value = { state, dispatch };
    return <PaginatorContext.Provider value={value}>{children}</PaginatorContext.Provider>;
};

export const usePaginatorContext = () => {
    const {
        action: { makeRequest, fetchJSON },
    } = useFetchContext();

    const {
        state: { active, currentPage, zoom, order, magicLabelCache, category, job },
        dispatch,
    } = useContext(PaginatorContext);

    const saveMagicLabels = () => {
        order.forEach((o, orderIndex) => {
            if (null === getLabel(order, orderIndex)) {
                setLabel(orderIndex, getMagicLabel(orderIndex));
            }
        });
    };

    const setOrder = (order) =>
        dispatch({
            type: "UPDATE_ORDER",
            payload: order,
        });

    const setMagicLabelCache = (magicLabelCache) =>
        dispatch({
            type: "UPDATE_MAGIC_LABEL_CACHE",
            payload: magicLabelCache,
        });

    const setLabel = (imageNumber, text) => {
        setMagicLabelCache([]); // clear label cache whenever there is a change
        if (typeof order[imageNumber] === "undefined") {
            return;
        }
        order[imageNumber].label = text !== null && text.length === 0 ? null : text;
        setOrder(order);
        dispatchEvent(new Event("Prep.editted"));
    };

    const getMagicLabel = (imageNumber) => {
        const label = getLabel(order, imageNumber);

        if (label) {
            return label;
        }
        if (typeof magicLabelCache[imageNumber] === "undefined") {
            magicLabelCache[imageNumber] = MagicLabeler.getLabel(imageNumber, getMagicLabel);
            setMagicLabelCache(magicLabelCache);
        }
        return magicLabelCache[imageNumber];
    };

    const setCurrentPage = (currentPage) =>
        dispatch({
            type: "UPDATE_CURRENT_PAGE",
            payload: currentPage,
        });

    const setPage = (page: number) => {
        if (page >= 0 && page < order.length) {
            setCurrentPage(page);
        }
    };

    const nextPage = () => {
        setPage(currentPage + 1);
    };

    const prevPage = () => {
        setPage(currentPage - 1);
    };

    const updatePagesByStatus = (order, status) => {
        const {
            file_problems: { deleted, added },
        } = status;
        const message = [];
        let newOrder = order;
        if (deleted.length > 0) {
            message.push(deleted.length + " file(s) have been removed from the job since the last edit.\n");
            newOrder = getNonRemovedPages(newOrder, deleted);
        }

        if (added.length > 0) {
            message.push(added.length + " file(s) have been added to the job since the last edit.\n");
            newOrder = getAddedPages(newOrder, added);
        }

        if (message.length) {
            alert(message.join(""));
            setOrder(newOrder);
        }
    };

    const setCategory = (category) =>
        dispatch({
            type: "UPDATE_CATEGORY",
            payload: category,
        });

    const setJob = (job) =>
        dispatch({
            type: "UPDATE_JOB",
            payload: job,
        });

    const initialize = (initialCategory, initialJob) => {
        setCategory(initialCategory);
        setJob(initialJob);
    };

    const loadJob = async (initialCategory, initialJob) => {
        initialize(initialCategory, initialJob);
        // There was a problem where switching jobs would sometimes fail to redraw the display,
        // because the filenames in the order for the new job overlapped with filenames from the
        // order in the previously-loaded job. To avoid this, we should always clear out the
        // whole order before loading new data.
        setOrder([]);
        setMagicLabelCache([]); // clear label cache whenever there is a change
        const { order } = await fetchJSON(getJobUrl(initialCategory, initialJob));
        setOrder(order);
        setCurrentPage(0);
        updatePagesByStatus(order, await fetchJSON(getJobUrl(initialCategory, initialJob, "/status")));
    };

    const deletePage = async () => {
        if (deletePageValidation(order)) {
            const imageUrl = getJobImageUrl(order[currentPage], "*");
            const imageFilename = imageUrl.split("/").reverse()[1];
            try {
                await makeRequest(imageUrl, { method: "DELETE" });
                const newOrder = getNonRemovedPages(order, [imageFilename]);
                setOrder(newOrder);
                if (currentPage >= newOrder.length) {
                    setPage(currentPage - 1);
                }
                alert("Page deleted!");
            } catch (error) {
                console.error(error);
                alert("Unable to delete!");
            }
        }
    };
    const publishValid = async (published) => {
        if (published) {
            const {
                derivatives: { expected, processed },
            } = await fetchJSON(getJobUrl(category, job, "/status"));
            if (expected > processed) {
                alert(
                    `Derivative images have not been generated yet. Please` +
                        ` go back to the main menu and hit the "build" button` +
                        ` for this job before publishing it.`
                );
                return false;
            }
            return window.confirm(
                "Are you sure you wish to publish this job? You will not be able to make any further edits."
            );
        }
        return true;
    };

    const save = async (published) => {
        if (userMustReviewMoreLabels(order)) {
            return;
        }
        saveMagicLabels();
        if (await publishValid(published)) {
            try {
                await makeRequest(
                    getJobUrl(category, job),
                    {
                        method: "PUT",
                        body: JSON.stringify({ order, published }),
                    },
                    {
                        "Content-Type": "application/json",
                    }
                );
                alert("Success!");
                window.location.assign("/paginate"); // TODO: Route better?
                dispatchEvent(new Event("Prep.saved"));
            } catch (error) {
                alert("Unable to save!");
            }
        }
    };

    const autonumberFollowingPages = () => {
        const affected = order.length - (currentPage + 1) - countMagicLabels(order, currentPage + 1);
        if (affected > 0 && !window.confirm("You will be clearing " + affected + " label(s). Are you sure?")) {
            return;
        }

        for (let i = currentPage + 1; i < order.length; i++) {
            setLabel(i, null);
        }
    };

    const getJobImageUrl = (orderImage, size) => {
        if (typeof orderImage === "undefined") {
            return false;
        }
        return getImageUrl(category, job, orderImage.filename, size);
    };
    const setZoom = (zoom) => dispatch({ type: "UPDATE_ZOOM", payload: zoom });
    const toggleZoom = () => setZoom(!zoom);

    return {
        state: {
            active,
            currentPage,
            zoom,
            order,
            magicLabelCache,
            category,
            job,
        },
        action: {
            getLabel: (imageNumber) => {
                return getLabel(order, imageNumber);
            },
            initialize,
            setLabel,
            getMagicLabel,
            setPage,
            nextPage,
            prevPage,
            deletePage,
            loadJob,
            setOrder,
            save,
            autonumberFollowingPages,
            getJobImageUrl,
            toggleZoom,
        },
    };
};

export default { PaginatorContextProvider, usePaginatorContext };
