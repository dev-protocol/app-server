import { config } from 'dotenv'
import { sign, verify } from 'jsonwebtoken'

config()

export const cipher = (data: string, key: string): string => sign(data, key)

export const configuredCipher = (data: string): string =>
	cipher(data, process.env.CIPHER_KEY)

export const decipher = (ciphered: string, key: string): string | object =>
	verify(ciphered, key)

export const configuredDecipher = (data: string): string | object =>
	decipher(data, process.env.CIPHER_KEY)
