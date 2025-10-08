export const IsValidHeaderApiKey = (key: string) => {
    const keyhashed = new Bun.CryptoHasher('sha512').update(key).digest('hex')
    if (keyhashed === Bun.env.KEY_SHA512) {
        return true
    }
    return false
}