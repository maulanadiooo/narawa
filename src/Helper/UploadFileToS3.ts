import { S3Client } from "bun"
import { printConsole } from "..";

export const uploadFileToS3 = async (file: Buffer, pathSave: string) => {
    try {
        const bucket = new S3Client({
            endpoint: Bun.env.S3_ENDPOINT,
            region: Bun.env.S3_REGION,
            accessKeyId: Bun.env.S3_ACCESS_KEY ?? '',
            secretAccessKey: Bun.env.S3_SECRET_KEY ?? '',
            bucket: Bun.env.S3_BUCKET_NAME ?? ''
        })
        await bucket.write(pathSave, file, {
            acl: "public-read"
        })
        return true;
    } catch (e) {
        printConsole.error(`UPLOAD FILE S3::::: ${e}`)
        printConsole.error(`URL::::: ${Bun.env.S3_ENDPOINT}`)
        printConsole.error(`KEY::::: ${Bun.env.S3_ACCESS_KEY}`)
        printConsole.error(`SECRET::::: ${Bun.env.S3_SECRET_KEY}`)
        return false;
    }
}