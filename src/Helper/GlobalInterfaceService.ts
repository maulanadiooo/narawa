import { Context, t } from "elysia";

export interface IGlobalInterfaceService {
    set: Context['set']
}

export const ApiKeyHeader = t.Object({
    "x-apikey": t.String({
        error: "Apikey is required"
    })
})