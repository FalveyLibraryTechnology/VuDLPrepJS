import { Request, Response, Router } from "express"; // Types
import passport = require("passport");
import Config from "../models/Config";
import { Database, User } from "../services/Database";

interface NextFunction {
    (err?: Error): void;
}

const loginPath = "/api/auth/login";

export function authenticate(req: Request, res: Response, next?: NextFunction): void {
    const authMethod = passport.authenticate(Config.getInstance().authenticationStrategy, {
        failureRedirect: loginPath + "?fail=true",
        // We need to remember the referer when we regenerate the session so that post-login redirect works:
        keepSessionInfo: true,
    });
    authMethod(req, res, next);
}

function saveSessionReferer(req) {
    req.session.referer = req.originalUrl;
}

export function requireLogin(req: Request, res: Response, next?: NextFunction): void {
    if (req.user) {
        return next();
    }
    saveSessionReferer(req);
    res.redirect(loginPath);
}

export async function requireToken(req: Request, res: Response, next?: NextFunction): Promise<void> {
    // Check for API key in header or session
    const userToken = req.header("Authorization") ? req.header("Authorization").slice(6) : req.session.token ?? null;

    if (await Database.getInstance().confirmToken(userToken)) {
        return next();
    }

    // Take ye to login!
    saveSessionReferer(req);
    res.sendStatus(401);
}

// Express session settings
export function getAuthRouter(): Router {
    const authRouter = Router();
    authRouter.use(passport.initialize());
    authRouter.use(passport.session());

    // Debug sessions
    authRouter.use(function (req, res, next) {
        if (req.method === "OPTIONS") {
            return next();
        }
        for (const key in req.session) {
            if (key == "cookie") {
                continue;
            }
        }
        next();
    });

    function saveReferer(req, res, next) {
        if (req.query.referer ?? false) {
            req.session.referer = req.query.referer;
        }
        next();
    }

    function showLoginForm(req, res) {
        const requirePasswords = Config.getInstance().authenticationRequirePasswords;
        const failed = (req.query.fail ?? "").length > 0;
        res.render("../../views/login", { requirePasswords, failed });
    }

    function postLoginRedirect(req, res) {
        const referral = req.query.referer ?? req.session.referer;
        res.redirect(referral ?? Config.getInstance().clientUrl);
        req.session.referer = null;
    }

    // We have a different login flow depending on whether or not there's a login screen...
    const loginFlow =
        Config.getInstance().authenticationStrategy === "saml"
            ? [saveReferer, authenticate, postLoginRedirect]
            : [saveReferer, showLoginForm];
    authRouter.get("/login", ...loginFlow);

    // Use passport.authenticate() as route middleware to authenticate the
    // request.  If authentication fails, the user will be redirected back to the
    // login page.  Otherwise, the primary route function will be called,
    // which, in this example, will redirect the user to the referring URL.
    authRouter.post("/login", authenticate, postLoginRedirect);

    authRouter.get("/logout", passport.initialize(), async function (req, res) {
        await req.logout(() => {
            res.redirect(Config.getInstance().clientUrl);
        });
    });

    authRouter.get("/token/confirm/:token", async function (req: Request, res: Response) {
        const isGood = await Database.getInstance().confirmToken(req.params.token);
        res.sendStatus(isGood ? 200 : 401);
    });

    authRouter.get("/token/mint", async function (req: Request, res: Response) {
        if (!req.user) {
            return res.sendStatus(401);
        }
        const token = await Database.getInstance().makeToken(req.user as User);
        req.session.token = token;
        res.json(token);
    });
    return authRouter;
}
