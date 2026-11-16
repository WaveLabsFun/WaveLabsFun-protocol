# WaveLabs

**Analog soul, onchain pulse.**

[![Live site](https://img.shields.io/badge/live-wavelabs.fun-1ef792?style=flat-square)](https://wavelabs.fun)
[![Chain](https://img.shields.io/badge/chain-Solana-9945ff?style=flat-square)](https://solana.com)

| | |
|---|---|
| Chain | Solana (mainnet) |
| Contract address | `CA: to be announced` |
| Site | https://wavelabs.fun |

## Overview

WaveLabs is a retro signal desk for Solana. A glowing monitor watches the chain, a live board tracks the ten most-boosted tokens, and one pinned row is reserved for the WaveLabs token the moment its contract address goes public.

## Features

- **Live market board** - ten trending Solana tokens with logo, price, 24h change, volume and liquidity, refreshed every 60 seconds and paused while the tab is hidden.
- **Pinned home row** - a placeholder holds row one until the contract address is stated; after that it fetches price data and launchpad details in parallel.
- **Ticker** - a marquee fed by the same live data.
- **Scope bench** - an interactive oscilloscope with spring-damped controls.
- **Quiet failure** - last good data stays on screen if a feed drops; dashes show where nothing has been read yet.
- **Motion-safe** - every animation has an instant fallback under `prefers-reduced-motion`.

## Links

- X: https://x.com/UseWave
- Site: https://wavelabs.fun
- Whitepaper: [docs/whitepaper.md](docs/whitepaper.md)

## Develop

```bash
npm install
npm run build   # writes dist/ and runs the gate harness
npm run serve   # serves dist/ locally
```

Facts that can change (contract address, social links, data sources) live in `src/registers.js`, each with a state of `stated`, `absent` or `unconfirmed`. Anything not `stated` renders inert. Colour literals live only in `src/tokens.css`.

## License

MIT. See [LICENSE](LICENSE).
