import * as curveJs from 'curve25519-js'
import { randomBytes, generateKeyPairSync } from 'crypto'
import { KeyPair, valueReviver, AppDataSync, Fingerprint } from './types.mysqlauth'

export const generateKeyPair = (): KeyPair => {
	try {
		const { publicKey, privateKey } = generateKeyPairSync('x25519')

		const pubBuffer = publicKey.export({
			format: 'der',
			type: 'spki'
		}) as Buffer

		const privBuffer = privateKey.export({
			format: 'der',
			type: 'pkcs8'
		}) as Buffer

		return {
			public: pubBuffer.slice(12, 44) as unknown as Uint8Array,
			private: privBuffer.slice(16, 48) as unknown as Uint8Array
		}
	} catch(e) {
		const keyPair = curveJs.generateKeyPair(Uint8Array.from(randomBytes(32)))
		return {
			public: Buffer.from(keyPair.public) as unknown as Uint8Array,
			private: Buffer.from(keyPair.private) as unknown as Uint8Array
		}
	}
}

const toUint8 = (input: Uint8Array | Buffer) => Buffer.isBuffer(input) ? Uint8Array.from(input) : input

const calculateSignature = (privKey: Uint8Array | Buffer, message: Uint8Array | Buffer) => {
	const priv = toUint8(privKey)
	const msg = toUint8(message)
	return Buffer.from(curveJs.sign(priv, msg))
}

const generateSignalPubKey = (pubKey: Uint8Array | Buffer) => {
	const key = Buffer.isBuffer(pubKey) ? Uint8Array.from(pubKey) : pubKey
	if (key.length === 33) return key
	const prefixed = new Uint8Array(1 + key.length)
	prefixed[0] = 5
	prefixed.set(key, 1)
	return prefixed
}

const signedKeyPair = (identityKeyPair: KeyPair, keyId: number) => {
	const preKey = generateKeyPair()
	const pubKey = generateSignalPubKey(preKey.public)
	const signature = calculateSignature(identityKeyPair.private, pubKey)
	return { keyPair: preKey, signature, keyId }
}

const allocate = (str: string) => {
	let p = str.length

	if (!p){
		return new Uint8Array(1)
	}

	let n = 0

	while (--p % 4 > 1 && str.charAt(p) === "="){
		++n
	}

	return new Uint8Array(Math.ceil(str.length * 3) / 4 - n).fill(0)
}

const parseTimestamp = (timestamp: string | number | Long) => {
	if (typeof timestamp === 'string') {
		return parseInt(timestamp, 10)
	}

	if (typeof timestamp === "number") {
		return timestamp
	}

	return timestamp
}

export const fromObject = (args: AppDataSync) => {
	const f: Fingerprint = {
		...args.fingerprint,
		deviceIndexes: Array.isArray(args.fingerprint.deviceIndexes) ? args.fingerprint.deviceIndexes : []
	}

	const message = {
		keyData: Array.isArray(args.keyData) ? args.keyData : new Uint8Array(),
		fingerprint: {
			rawId: f.rawId || 0,
			currentIndex: f.rawId || 0,
			deviceIndexes: f.deviceIndexes
		},
		timestamp: parseTimestamp(args.timestamp)
	}

	if (typeof args.keyData === "string") {
		message.keyData = allocate(args.keyData)
	}

	return message
}

export const BufferJSON = {
	replacer: (_: string, value: any) => {
		if (Buffer.isBuffer(value) || value instanceof Uint8Array || value?.type === 'Buffer') {
			const val = value?.data || value;
			return {
				type: 'Buffer',
				data: Buffer.from(val).toString('base64')
			}
		}
		return value;
	},
	reviver: (_: string, value: valueReviver) => {
		if (typeof value === 'object' && !!value && (value.buffer === true || value.type === 'Buffer')) {
			const val = value.data || value.value;
			if (typeof val === 'string') {
				return Buffer.from(val, 'base64');
			}
			return Buffer.from(val || []);
		}
		return value;
	}
};

export const initAuthCreds = () => {
	const identityKey = generateKeyPair()
	return {
		noiseKey: generateKeyPair(),
		pairingEphemeralKeyPair: generateKeyPair(),
		signedIdentityKey: identityKey,
		signedPreKey: signedKeyPair(identityKey, 1),
		registrationId: Uint16Array.from(randomBytes(2))[0] & 16383,
		advSecretKey: randomBytes(32).toString('base64'),
		processedHistoryMessages: [],
		nextPreKeyId: 1,
		firstUnuploadedPreKeyId: 1,
		accountSyncCounter: 0,
		registered: false,
		accountSettings: {
			unarchiveChats: false
		}
	}
}