import { Elysia, ValidationError } from "elysia";
import { PrintConsole } from "./Helper/PrintConsole";
import { Database } from "./Config/database";
import cors from "@elysiajs/cors";
import { ErrorResponse } from "./Helper/ResponseError";
import { ResponseApi } from "./Helper/ResponseApi";
import { setServerInstance } from "./Helper/ServerInstance";
import { ApiController } from "./Routes/api";

export const printConsole = new PrintConsole();
export const db = new Database();
await db.init();
Bun.env.TZ = "Etc/UTC";

const appServer = new Elysia()
  .use(cors({
    methods: "*",
    origin: Bun.env.MODE === "prod" ? String(Bun.env.ALOWED_ORIGIN).split(",") : ["*"],
  }))
  .derive(() => {
    return {
      start: Date.now()
    }
  })
  .onAfterHandle(({ request, set, start, body, headers, params, response }) => {
    const url = request.url;
    const ms = Date.now();
    printConsole.info(`${request.method.toUpperCase()} ${url} ::: ${set.status} ::: ${ms - start} ms`)
  })
  .error({
    ErrorResponse
  })
  .onError(({ code, set, error, body, path, request }) => {
    if (error instanceof ErrorResponse) {
      if (error.statusCode !== 401 && error.statusCode !== 402) {
        // TODO: loging ?
      }

      return ResponseApi({
        set: set,
        status: false,
        statusCode: error.statusCode,
        msg: error.message,
        code: error.code.toUpperCase(),
      })
    } else if (code === "NOT_FOUND") {
      printConsole.error(`NOT FOUND!!! ${request.method}:::${request.url}`)
      return ResponseApi({
        set: set,
        status: false,
        statusCode: 404,
        code: "ENDPOINT_NOT_FOUND",
        msg: "Endpoint Not Found",
      })
    } else if (error instanceof ValidationError) {
      const jsonMessage = JSON.parse(error.message);
      const { summary, errors } = jsonMessage;
      let errorsData: any[] = [];
      for (const error of errors) {
        const { path, message, schema } = error;
        errorsData.push({
          field: path.replace("/", ""),
          message: message,
        })
      }
      return ResponseApi({
        set: set,
        status: false,
        statusCode: 400,
        code: `VALIDATION_ERROR`,
        error: errorsData,
        msg: `Validation error`,
      })
    } else if (code === "INTERNAL_SERVER_ERROR") {
      // TODO: loging ?
      return ResponseApi({
        set: set,
        status: false,
        statusCode: 500,
        msg: "Internal server error",
        code: code,
      })
    } else if (error instanceof TypeError) {
      return ResponseApi({
        set: set,
        status: false,
        statusCode: 500,
        msg: error.message,
        code: "VALIDATION_ERROR",
      })
    } else {
      printConsole.error(`${error}`)
      return ResponseApi({
        set: set,
        status: false,
        statusCode: 500,
        msg: `Something bad happen,try again later`,
        code: "UNKNOWN_ERROR",
      })
    }
  })
  .use(ApiController)
  .onStop((stop) => {
    printConsole.error(`Server Stopped!! ${stop.error}`)
    printConsole.error(`${stop.error}`)
  })
  .listen({
    port: Bun.env.PORT ?? 6666,
    reusePort: true,
  }, (server) => {
    setServerInstance(server);
    printConsole.success(`Server running at ${server?.hostname}:${server?.port}`)
  })
