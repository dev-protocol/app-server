import { AzureFunction, Context, HttpRequest } from '@azure/functions'
import Web3 from 'web3'
import messages from './messages.json'
import { createLockupContract } from '@dev-protocol/dev-kit-js/cjs/lockup'
import BigNumber from 'bignumber.js'
import { config } from 'dotenv'
import { configuredDecipher } from '../utils/crypto'
config()

export type SecretMessages = Array<{
	address: string
	ciphertext: string
}>

const responseCreator = (context: Context) => (
	status = 200,
	body: string | object = ''
) => {
	context.res = {
		status,
		body
	}
}

const digits18 = (x: number): BigNumber => new BigNumber(10).pow(18).times(x)

export const httpTrigger = (messages: SecretMessages): AzureFunction =>
	async function(context: Context, req: HttpRequest): Promise<void> {
		const response = responseCreator(context)
		const { query } = req
		const { property, signature, network } = query
		if (
			property === undefined ||
			signature === undefined ||
			network === undefined
		) {
			return response(400)
		}

		const web3 = new Web3(
			`https://${network}.infura.io/v3/${process.env.INFURA_IO_SECRET}`
		)
		const account = web3.eth.accounts.recover('hello', signature)
		const { getValue } = createLockupContract(web3)()

		const stakes = await getValue(property, account).then(x => new BigNumber(x))

		if (stakes.isLessThan(digits18(1))) {
			return response(402)
		}

		const message = messages.find(({ address }) => address === property)

		if (message === undefined) {
			return response(404)
		}

		const decipheredMessage = configuredDecipher(message.ciphertext)

		return response(200, decipheredMessage)
	}

export default httpTrigger(messages)
