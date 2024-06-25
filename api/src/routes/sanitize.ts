import { Request, Response } from "express";

interface NextFunction {
    (err?: Error): void;
}

export const defaultSanitizeRegEx = /^[-.a-zA-Z0-9_]+$/;
export const pidSanitizeRegEx = /^[a-zA-Z]+:[0-9]+/;

export function sanitizeParameters(customRules = {}, defaultRule = defaultSanitizeRegEx) {
    return function (req: Request, res: Response, next: NextFunction) {
        for (const x in req.params) {
            if (!req.params[x].match(customRules[x] ?? defaultRule)) {
                return res.status(400).json({ error: "invalid: " + x });
            }
        }
        next();
    };
}

export const pidSanitizer = sanitizeParameters({ pid: pidSanitizeRegEx }, /^$/);
export const datastreamSanitizer = sanitizeParameters({ pid: pidSanitizeRegEx, stream: defaultSanitizeRegEx }, /^$/);
