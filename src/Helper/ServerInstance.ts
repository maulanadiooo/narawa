import { Serve } from "elysia/dist/universal/server";

export let serverInstance: Serve | null = null;

export const setServerInstance = (instance: Serve) => {
    serverInstance = instance;
};