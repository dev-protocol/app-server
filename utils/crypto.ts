import { createCipher, createDecipher } from 'crypto'
import { config } from 'dotenv'

config()

export const cipher = (data: string, key: string): string => {
	const c = createCipher('aes192', key)
	c.update(data, 'utf8', 'hex')
	const text = c.final('hex')
	return text
}

export const configuredCipher = (data: string): string =>
	cipher(data, process.env.CIPHER_KEY)

export const decipher = (ciphered: string, key: string): string => {
	const dc = createDecipher('aes192', key)
	dc.update(ciphered, 'hex', 'utf8')
	const text = dc.final('utf8')
	return text
}

export const configuredDecipher = (data: string): string =>
	decipher(data, process.env.CIPHER_KEY)
