import Elysia from "elysia";
import { sessionMiddleware } from "../../Middleware/session.middleware";
import { SessionParamsDto } from "../Session/Session.types";
import { LabelService } from "./Service";
import { ApiKeyHeader } from "../../Helper/GlobalInterfaceService";
import { LabelTypes } from "./Label.types";

const labelService = new LabelService();
export const LabelController = new Elysia({ prefix: "/label" })
    .use(sessionMiddleware)
    .get("/", async ({ params, session, set }) => {
        return labelService.GetLabel({ set, params, session });
    }, {
        params: SessionParamsDto,
        headers: ApiKeyHeader,
        detail: {
            tags: ['Label'],
            description: "Get all labels"
        }
    })
    .get("/assigned", async ({ params, session, set }) => {
        return labelService.GetLabelAssigned({ set, params, session });
    }, {
        params: SessionParamsDto,
        headers: ApiKeyHeader,
        detail: {
            tags: ['Label'],
            description: "Get all labels assigned to phone number"
        }
    })
    .post("/", async ({ params, session, set, body }) => {
        return labelService.AddLabel({ set, params, session, body });
    }, {
        body: LabelTypes.AddLabelBody,
        params: SessionParamsDto,
        headers: ApiKeyHeader,
        detail: {
            tags: ['Label'],
            description: "Add a new label"
        }
    })
    .delete("/:labelId", async ({ params, session, set }) => {
        return labelService.DeleteLabel({ set, params, session });
    }, {
        params: LabelTypes.DeleteLabelParams,
        headers: ApiKeyHeader,
        detail: {
            tags: ['Label'],
            description: "Delete label"
        }
    })
    .patch("/:labelId", async ({ params, session, set, body }) => {
        return labelService.EditLabel({ set, params, session, body });
    }, {
        body: LabelTypes.EditLabelBody,
        params: LabelTypes.EditLabelParams,
        headers: ApiKeyHeader,
        detail: {
            tags: ['Label'],
            description: "Edit label name"
        }
    })
    .post("/assign", async ({ set, body, params, session }) => {
        return labelService.AssignLabelChat({ set, params, session, body });
    }, {
        body: LabelTypes.AssignLabelChatBody,
        params: SessionParamsDto,
        headers: ApiKeyHeader,
        detail: {
            tags: ['Label'],
            description: "Assign label to phone number"
        }
    })
    .delete("/assign", async ({ set, body, params, session }) => {
        return labelService.RemoveLabelChat({ set, params, session, body });
    }, {
        params: SessionParamsDto,
        body: LabelTypes.RemoveLabelChatBody,
        headers: ApiKeyHeader,
        detail: {
            tags: ['Label'],
            description: "Remove label from phone number"
        }
    })