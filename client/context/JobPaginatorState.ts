const confirmSavedMagicLabels = (count: number) => {
    return window.confirm("You will be saving " + count + " unreviewed, auto-generated label(s). Are you sure?");
};

const findNewPagePosition = (page, list) => {
    const foundIndex = list.findIndex((listItem) => {
        return listItem.filename >= page;
    });
    return foundIndex === -1 ? list.length : foundIndex;
};

const deletePageValidation = (order: Array) => {
    if (order.length < 2) {
        alert("You cannot delete the last page in a job.");
        return false;
    }
    return window.confirm("Are you sure you wish to delete the current page?");
};

const getAddedPages = (order, pages) => {
    return pages.reduce((order, page) => {
        order.splice(findNewPagePosition(page, order), 0, {
            filename: page,
            label: null,
        });
        return order;
    }, order);
};

const getNonRemovedPages = (order, deletedPages) =>
    order.filter((o) => !deletedPages.includes(o.filename));

const getLabel = (order, imageNumber) => {
    return typeof order[imageNumber] === "undefined" ? null : order[imageNumber].label;
};

const countMagicLabels = (order, startAt: number) => {
    let count = 0;
    for (let startIndex = startAt; startIndex < order.length; startIndex++) {
        if (null === getLabel(order, startIndex)) {
            count++;
        }
    }
    return count;
};

const userMustReviewMoreLabels = (order) => {
    const count = countMagicLabels(order, 0);
    return count > 0 && !confirmSavedMagicLabels(count);
};

export {
    countMagicLabels,
    deletePageValidation,
    getAddedPages,
    getNonRemovedPages,
    getLabel,
    confirmSavedMagicLabels,
    findNewPagePosition,
    userMustReviewMoreLabels,
};
