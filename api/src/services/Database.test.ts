import Config from "../models/Config";
import Database from "./Database";

const schema = {
    createTable: jest.fn(),
    dropTableIfExists: jest.fn(),
};
const databaseFunctions = {
    now: jest.fn(),
};
const table = {
    insert: jest.fn(),
};
const connection = () => table;
connection.schema = schema;
connection.fn = databaseFunctions;
jest.mock("knex", () => {
    return {
        knex: jest.fn(async () => connection),
        Knex: jest.fn(),
    };
});
jest.mock("nanoid", () => {
    return {
        nanoid: jest.fn(() => "nanoid"),
    };
});

describe("Database", () => {
    beforeEach(() => {
        Config.setInstance(
            new Config({
                Database: {
                    client: "fake",
                    connection: {},
                },
            }),
        );
        // Database code is currently "chatty" but we don't want the tests to be noisy
        jest.spyOn(console, "log").mockImplementation(jest.fn());
    });

    afterEach(() => {
        jest.clearAllMocks();
        jest.restoreAllMocks();
        // We don't want the database connection to persist between tests
        Database.getInstance().connection = null;
    });

    it("initializes the database appropriately", async () => {
        const database = await Database.getInstance();
        const userSpy = jest.spyOn(database, "getUserBy").mockImplementation(() => {
            throw new Error("no such table");
        });
        const token = await database.makeToken({ id: 1, username: "foo", password: "bar", hash: "xyzzy" });
        expect(token).toEqual("nanoid");
        expect(userSpy).toHaveBeenCalledTimes(1);
        expect(userSpy).toHaveBeenCalledWith("id", -1);
        expect(schema.createTable).toHaveBeenCalledTimes(3);
        expect(schema.dropTableIfExists).toHaveBeenCalledTimes(3);
        expect(databaseFunctions.now).toHaveBeenCalledTimes(1);
    });

    it("does not re-initialize the database unnecessarily", async () => {
        const database = await Database.getInstance();
        const userSpy = jest.spyOn(database, "getUserBy").mockResolvedValue(null);
        const token = await database.makeToken({ id: 1, username: "foo", password: "bar", hash: "xyzzy" });
        expect(token).toEqual("nanoid");
        expect(userSpy).toHaveBeenCalledTimes(1);
        expect(userSpy).toHaveBeenCalledWith("id", -1);
        expect(schema.createTable).toHaveBeenCalledTimes(0);
        expect(schema.dropTableIfExists).toHaveBeenCalledTimes(0);
        expect(databaseFunctions.now).toHaveBeenCalledTimes(1);
    });
});
