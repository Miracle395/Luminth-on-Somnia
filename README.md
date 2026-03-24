# Luminth

Luminth is A reactive liquid staking vault on Somnia.

With Luminth users get to stake $PONG and receive liquid staking tokens while their assets grow automatically, with balances updating in instantly using onchain reactivity.

Before now, traditional DeFi dashboards rely on polling or manual refresh, but Luminth uses Somnia Reactivity to update user balances instantly when yield is generated.


## How It Works?

1. Stake
Users deposit $PONG into the Luminth Vault and receive sPONG (liquid staking tokens).

2. Earn
Yield is compounded inside the vault.

3. Reactivity. (Core Innovation)
When yield is generated, the contract emits:

The frontend listens to this event using a WebSocket provider.

4. Instant UI Update.
   
As soon as the event fires:
- User balance updates.
- UI reflects new yield.
- No refresh, no polling.


# Luminth matters, but, why?

Well, it's because most DeFi apps feel static.

Luminth introduces:

*Instant financial feedback.*
*Reactive UX tied directly to onchain events.*
*A more transparent and engaging staking experience.*


## Luminth's Tech Stack.

- **Frontend:** HTML, CSS, JavaScript
- **Web3:** Ethers.js
- **Smart Contracts:** Solidity (Somnia Testnet)
- **Reactivity:** Somnia Reactivity SDK (event-driven updates)

---

## 🌐 Deployment

- **Network:** Somnia Testnet (Shannon)
- **Vault Contract:** `0x83c1006a1D4D68727a6eBD358Fbfb7a38234066C`

---

## 🚀 Key Features

- Stake / Unstake $PONG
- Receive liquid staking token (sPONG)
- Real-time balance updates via on-chain events
- Animated UI feedback for yield
- No backend or polling required

---

## 🎯 Use Case

Luminth demonstrates how **reactivity can transform DeFi UX** from static dashboards into live, event-driven financial interfaces.

This pattern can extend to:
- lending protocols
- liquidation monitoring
- trading dashboards
- on-chain analytics

---

## 🧪 How to Run Locally

```bash
git clone <your-repo>
cd luminth
open index.html
