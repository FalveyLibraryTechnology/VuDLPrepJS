import * as request from "supertest";
import * as session from "express-session";
import { StatusCodes } from "http-status-codes";
import app from "../app";
import { getAuthRouter } from "./auth";
import Config from "../models/Config";

describe("index", () => {
    beforeAll(() => {
        Config.setInstance(new Config({}));
        app.use(session({ secret: "testing", resave: true, saveUninitialized: true }));
        app.use("/auth", getAuthRouter());
    });
    beforeEach(() => {
        Config.setInstance(new Config({}));
    });
    afterEach(() => {
        jest.restoreAllMocks();
    });

    it("displays a login form by default", async () => {
        const response = await request(app).get("/auth/login").expect(StatusCodes.OK);
        expect(response.text).not.toContain("Login failed; please try again.");
        expect(response.text).toContain(`<form action="/api/auth/login" method="post">`);
        expect(response.text).toContain("Username");
        expect(response.text).toContain("Password");
        expect(response.text).toContain("Submit");
    });

    it("displays a fail message when appropriate", async () => {
        const response = await request(app).get("/auth/login?fail=true").expect(StatusCodes.OK);
        expect(response.text).toContain("Login failed; please try again.");
        expect(response.text).toContain(`<form action="/api/auth/login" method="post">`);
        expect(response.text).toContain("Username");
        expect(response.text).toContain("Password");
        expect(response.text).toContain("Submit");
    });

    it("can disable the password control", async () => {
        Config.setInstance(
            new Config({
                Authentication: {
                    require_passwords: "false",
                },
            }),
        );
        const response = await request(app).get("/auth/login").expect(StatusCodes.OK);
        expect(response.text).not.toContain("Login failed; please try again.");
        expect(response.text).toContain(`<form action="/api/auth/login" method="post">`);
        expect(response.text).toContain("Username");
        expect(response.text).not.toContain("Password");
        expect(response.text).toContain("Submit");
    });
});
