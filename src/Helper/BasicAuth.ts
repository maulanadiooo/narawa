import { printConsole } from "..";

export const checkBasicAuth = (headers: Record<string, string | undefined>) => {
    const auth = headers.authorization;

    if (!auth || !auth.startsWith('Basic ')) {
        printConsole.error('Basic authentication required');
        return false;
    }

    try {
        const base64Credentials = auth.split(' ')[1];
        const credentials = Buffer.from(base64Credentials, 'base64').toString('utf-8');
        const [username, password] = credentials.split(':');

        const validUsername = Bun.env.DOCUMENTATION_USER ?? 'documentation';
        const validPassword = Bun.env.DOCUMENTATION_PASSWORD ?? '123456';

        return username === validUsername && password === validPassword;
    } catch (error) {
        printConsole.error(`Error checking basic authentication: ${error}`);
        printConsole.error('Invalid authentication format');
        return false;
    }
};