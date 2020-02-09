import { AzureFunction, Context, HttpRequest } from '@azure/functions'
import Web3 from 'web3'
import messages from './messages.json'
import messagesRopsten from './messages.ropsten.json'
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

		const net =
			network === 'main' || network === 'mainnet' ? 'mainnet' : network
		const web3 = new Web3(
			new Web3.providers.HttpProvider(
				`https://${net}.infura.io/v3/${process.env.INFURA_IO_PROJECT}`
			)
		)
		const account = web3.eth.accounts.recover(
			'Please sign to confirm your address.',
			signature
		)
		const address =
			net === 'mainnet'
				? '0x3d40fab11ee30E3aa1900cCfAFD190F0851a6157'
				: net === 'ropsten'
				? '0x8BCA5A841aFAD83b78c850de130dc046F3424736'
				: ''
		const { getValue } = createLockupContract(web3)(address)

		const stakes = await getValue(property, account).then(x => new BigNumber(x))

		if (stakes.isLessThan(digits18(1))) {
			return response(402)
		}

		const message = (network === 'ropsten' ? messagesRopsten : messages).find(
			({ address }) => address.toLowerCase() === property.toLowerCase()
		)

		if (message === undefined) {
			return response(404)
		}

		const decipheredMessage = configuredDecipher(message.ciphertext)

		return response(200, decipheredMessage)
	}

export const run = httpTrigger(messages)
