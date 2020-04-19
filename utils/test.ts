import { ChildProcess, spawn } from 'child_process'

export const launchGanache = async (port: number): Promise<ChildProcess> => {
	const ganache = spawn('npx', ['ganache-cli', '-p', port.toString()])
	await new Promise((resolve) => {
		const handler = (data: Buffer): void => {
			console.log(data.toString())
			if (data.includes(`Listening on 127.0.0.1:${port}`)) {
				ganache.stdout.off('data', handler)
				resolve()
			}
		}

		ganache.stdout.on('data', handler)
	})
	return ganache
}
