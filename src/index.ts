import { Elysia, ValidationError } from "elysia";
import { PrintConsole } from "./Helper/PrintConsole";
import { Database } from "./Config/database";
import cors from "@elysiajs/cors";
import { ErrorResponse } from "./Helper/ResponseError";
import { ResponseApi } from "./Helper/ResponseApi";
import { setServerInstance } from "./Helper/ServerInstance";
import { ApiController } from "./Routes/api";
import { SessionManager } from "./Session/SessionManager";
import { staticPlugin } from '@elysiajs/static'
import { openapi } from '@elysiajs/openapi'

export const sessionManager = new SessionManager();
export const printConsole = new PrintConsole();
export const db = new Database();
await db.init();
Bun.env.TZ = "Etc/UTC";

const appServer = new Elysia()
  .use(staticPlugin({
    prefix: "/media",
    assets: "./public"
  }))
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
    // printConsole.info(`${request.method.toUpperCase()} ${url} ::: ${set.status} ::: ${ms - start} ms`)
  })
  .error({
    ErrorResponse
  })
  .onError(async ({ code, set, error, body, path, request }) => {
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
      set.status = 404;
      set.headers["Content-Type"] = "text/html";
      let html = await Bun.file("./src/Html/endpoint_not_found.html").text();
      let htmlReplace = html.replaceAll("{{WEBSITE_URL}}", Bun.env.WEBSITE_URL ?? 'url not publish yet');
      return htmlReplace
    } else if (error instanceof ValidationError) {
      
      const errorMessage = error.customError ?? error.valueError?.message ?? error.message;
      return ResponseApi({
        set: set,
        status: false,
        statusCode: 400,
        code: `VALIDATION_ERROR`,
        msg: errorMessage,
      })
    } else if (code === "INTERNAL_SERVER_ERROR") {
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
  .use(openapi({
    path: "/documentation",
    exclude: {
      paths: ["/media/*"]
    },
    documentation: {
      info: {
        title: "NaraWa API",
        version: "1.0.0",
        description: "NaraWa API",
        contact: {
          name: "Dio Maulana",
          email: "maulanadiodm@gmail.com"
        }
      },
      components: {
        securitySchemes: {
          apiKey: {
            type: 'apiKey',
            in: 'headers',
            name: 'x-apikey',
            description: 'Your apikey should in header with x-apikey'
          }
        }
      },
      tags: [
        { name: "Session", description: "Related with session" },
        { name: "Chat", description: "Related to chat" },
      ],
      servers: [
        {
          url: Bun.env.WEBSITE_URL ?? 'url not publish yet',
          description: 'Our base url API'
        },
      ],
    },
  }))
  .use(ApiController)
  .onStop((stop) => {
    printConsole.error(`Server Stopped!! ${stop.error}`)
    printConsole.error(`${stop.error}`)
    printConsole.info(`Restarting server in 2 seconds...`)
    // restart server
    // setTimeout(() => {
    //   Bun.spawn([Bun.env.NODE_ENV === "prod" ? "npm" : "bun", "run", "start"])
    //   printConsole.success(`Server restarted!!`)
    // }, 1000);
  })
  .listen({
    port: Bun.env.PORT ?? 6666,
    reusePort: true,
  }, (server) => {
    setServerInstance(server);
    printConsole.success(`Server running at ${server?.hostname}:${server?.port}`)
  })
