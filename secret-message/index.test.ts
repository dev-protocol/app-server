/* eslint-disable accessor-pairs */
import test, { before, after } from 'ava'
import { Context, HttpRequest } from '@azure/functions'
import * as lockup from '@dev-protocol/dev-kit-js/cjs/lockup'
import { ChildProcess } from 'child_process'
import { stub } from 'sinon'
import { launchGanache } from '../utils/test'
import Web3 from 'web3'
import { httpTrigger as _httpTrigger, SecretMessages } from '.'
import { cipher } from '../utils/crypto'

const req = (data: any): HttpRequest => (data as unknown) as HttpRequest
const httpTrigger = async (
	messages: SecretMessages,
	request: HttpRequest
): Promise<{
	[key: string]: any
}> =>
	new Promise(resolve => {
		_httpTrigger(messages)(
			({
				set res(v: any) {
					resolve(v)
				}
			} as unknown) as Context,
			request
		)
	})

let ganache: ChildProcess
const store = new Map<string, string>()

before(async () => {
	ganache = await launchGanache(7545)
	stub(lockup, 'createLockupContract').callsFake(() => () =>
		({
			getValue: async (address: string) => store.get(address)
		} as any)
	)
})

after(() => {
	process.kill(ganache.pid)
})

const prepare = ({
	message
}: {
	message: string
}): {
	network: string
	messages: SecretMessages
	signature: string
	property: string
} => {
	const web3 = new Web3('ws://localhost:7545')
	const account = web3.eth.accounts.create()
	const { signature } = account.sign('Please sign to confirm your address.')
	const property = '0x3EE1dF804544B2326b827AE30dDC9A93C35002D5'
	const ciphertext = cipher(message, 'password')
	const messages = [{ address: property, ciphertext }]
	const network = 'main'
	store.set(property, '1000000000000000000')
	process.env.CIPHER_KEY = 'password'
	process.env.INFURA_IO_PROJECT = '9ca60bd34e2a42f0ae9fe6fbd652d754' // For testing
	return {
		network,
		messages,
		signature,
		property
	}
}

test('returns deciphered text', async t => {
	const { network, messages, signature, property } = prepare({
		message: 'Hello World'
	})

	const res = await httpTrigger(
		messages,
		req({
			query: {
				property,
				network,
				signature
			}
		})
	)

	t.deepEqual(res, {
		status: 200,
		body: 'Hello World'
	})
})

test('returns a response with status code 400 when property address is not founded in the query string', async t => {
	const { network, messages, signature } = prepare({
		message: 'Hello World'
	})

	const res = await httpTrigger(
		messages,
		req({
			query: {
				network,
				signature
			}
		})
	)

	t.deepEqual(res, {
		status: 400,
		body: ''
	})
})

test('returns a response with status code 400 when a network is not founded in the request body', async t => {
	const { messages, signature, property } = prepare({
		message: 'Hello World'
	})

	const res = await httpTrigger(
		messages,
		req({
			query: {
				property,
				signature
			}
		})
	)

	t.deepEqual(res, {
		status: 400,
		body: ''
	})
})

test('returns a response with status code 400 when a signature is not founded in the request body', async t => {
	const { network, messages, property } = prepare({
		message: 'Hello World'
	})

	const res = await httpTrigger(
		messages,
		req({
			query: {
				property,
				network
			}
		})
	)

	t.deepEqual(res, {
		status: 400,
		body: ''
	})
})

test('returns a response with status code 402 when sent from an account that staking to specified property is less than 1 DEV', async t => {
	const { network, messages, signature } = prepare({
		message: 'Hello World'
	})
	const property = '0x2C55AFeDC55525f974D23E9FE410478aF8a0F6Ce'

	store.set(property, '999999999999999999')

	const res = await httpTrigger(
		messages,
		req({
			query: {
				property,
				network,
				signature
			}
		})
	)

	t.deepEqual(res, {
		status: 402,
		body: ''
	})
})

test('returns a response with status code 404 when a property address is not founded in the stored messages', async t => {
	const { network, messages, signature, property } = prepare({
		message: 'Hello World'
	})
	const msg = messages.find(({ address }) => address === property)
	msg.address = '0x000'

	const res = await httpTrigger(
		messages,
		req({
			query: {
				property,
				network,
				signature
			}
		})
	)

	t.deepEqual(res, {
		status: 404,
		body: ''
	})
})
