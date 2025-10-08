import Elysia from "elysia";
import { ErrorResponse } from "../Helper/ResponseError";
import { IsValidHeaderApiKey } from "../Helper/Crypto";

export const ApikeyMiddleware = new Elysia({ name: "ApikeyMiddleware" })
    .derive({ as: "scoped" }, async ({ headers }) => {
        const apikey = headers["x-apikey"];

        if (!apikey) {
            throw new ErrorResponse(401, "UNAUTHORIZED", "Apikey is required");
        }

        if (!IsValidHeaderApiKey(apikey)) {
            throw new ErrorResponse(401, "UNAUTHORIZED", "Invalid apikey");
        }

        return {};
    })