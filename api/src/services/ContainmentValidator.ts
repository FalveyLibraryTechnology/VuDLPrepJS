import Config from "../models/Config";
import FedoraDataCollection from "../models/FedoraDataCollection";
import FedoraDataCollector from "./FedoraDataCollector";

class ContainmentValidator {
    private static instance: ContainmentValidator;
    protected config: Config;
    protected fedoraDataCollector: FedoraDataCollector;

    constructor(config: Config, fedoraDataCollector: FedoraDataCollector) {
        this.config = config;
        this.fedoraDataCollector = fedoraDataCollector;
    }

    public static getInstance(): ContainmentValidator {
        if (!ContainmentValidator.instance) {
            ContainmentValidator.instance = new ContainmentValidator(
                Config.getInstance(),
                FedoraDataCollector.getInstance(),
            );
        }
        return ContainmentValidator.instance;
    }

    public static setInstance(instance: ContainmentValidator): void {
        ContainmentValidator.instance = instance;
    }

    /**
     * Check all classes of possible containment errors.
     * @param child  Child PID or FedoraDataCollection representing child
     * @param parent Parent PID or FedoraDataCollection representing parent
     * @returns Error message if a problem is found, null if the relationship is valid
     */
    public async checkForErrors(
        child: string | FedoraDataCollection,
        parent: string | FedoraDataCollection,
    ): Promise<string | null> {
        const childData = typeof child === "string" ? await this.fedoraDataCollector.getObjectData(child) : child;
        const parentData = typeof parent === "string" ? await this.fedoraDataCollector.getHierarchy(parent) : parent;
        return (
            this.checkForParentLoopErrors(childData.pid, parentData) ??
            this.checkForParentModelErrors(parentData.pid, parentData.models, childData.models)
        );
    }

    /**
     * Validate parent PIDs to avoid infinite loops.
     * @param pid        Child PID
     * @param parentData FedoraDataCollection describing parent
     * @returns Error message if a problem is found, null if the relationship is valid
     */
    public checkForParentLoopErrors(pid: string, parentData: FedoraDataCollection): string | null {
        if (pid == parentData.pid) {
            return "Object cannot be its own parent.";
        }
        if (parentData.getAllParents().includes(pid)) {
            return "Object cannot be its own grandparent.";
        }
        return null;
    }

    /**
     * Validate parent and child models to be sure the objects can be legally related.
     * @param parentPid    Parent PID being checked (used for messages and special case handling)
     * @param parentModels All models of parent PID
     * @param childModels  All models of child PID
     * @returns Error message if a problem is found, null if the relationship is valid
     */
    public checkForParentModelErrors(
        parentPid: string,
        parentModels: Array<string>,
        childModels: Array<string>,
    ): string | null {
        if (!parentModels.includes("vudl-system:CollectionModel")) {
            return `Illegal parent ${parentPid}; not a collection!`;
        }
        if (childModels.includes("vudl-system:DataModel") && !parentModels.includes("vudl-system:ListCollection")) {
            return "DataModel objects must be contained by a ListCollection";
        }
        if (
            childModels.includes("vudl-system:ListCollection") &&
            !parentModels.includes("vudl-system:ResourceCollection")
        ) {
            return "ListCollection objects must be contained by a ResourceCollection";
        }
        if (
            childModels.includes("vudl-system:ResourceCollection") &&
            !parentModels.includes("vudl-system:FolderCollection")
        ) {
            return "ResourceCollection objects must be contained by a FolderCollection";
        }
        if (
            childModels.includes("vudl-system:FolderCollection") &&
            !parentModels.includes("vudl-system:FolderCollection")
        ) {
            return "FolderCollection objects must be contained by a FolderCollection";
        }
        return null;
    }
}

export default ContainmentValidator;
