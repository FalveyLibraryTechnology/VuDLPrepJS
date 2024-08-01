import Config from "../models/Config";
import ContainmentValidator from "./ContainmentValidator";

describe("ContainmentValidator", () => {
    describe("checkForParentModelErrors", () => {
        let validator: ContainmentValidator;

        beforeEach(() => {
            validator = new ContainmentValidator(new Config({ trash_pid: "trash:123" }));
        });

        it("won't allow data in non-trash folder", () => {
            expect(
                validator.checkForParentModelErrors("foo:123", ["vudl-system:FolderModel"], ["vudl-system:DataModel"]),
            ).toEqual("Illegal parent foo:123; not a collection!");
        });

        it("will allow data in trash folder", () => {
            expect(
                validator.checkForParentModelErrors(
                    "trash:123",
                    ["vudl-system:FolderModel"],
                    ["vudl-system:DataModel"],
                ),
            ).toEqual(null);
        });
    });
});
