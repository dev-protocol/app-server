import { writeFileSync } from 'fs'
import { resolve } from 'path'
import { configuredCipher } from './crypto'
import messages from '../secret-message/messages.json'

// This file expects called as follows:
// npm run add 0x0000000... "message"

const [, , address, message] = process.argv

const ciphertext = configuredCipher(message)
const data = {
	address,
	ciphertext
}
const added = [...messages, data]

writeFileSync(resolve('secret-message/messages.json'), JSON.stringify(added))

console.log('Completed')
