import { createConfig, http, injected } from 'wagmi';
import { base } from 'wagmi/chains';
import { farcasterMiniApp as miniAppConnector } from '@farcaster/miniapp-wagmi-connector';

export const config = createConfig({
    chains: [base], // Base Mainnet only
    transports: {
        [base.id]: http('https://base-rpc.publicnode.com'),
    },
    connectors: [
        miniAppConnector(),
        injected()
    ]
});
