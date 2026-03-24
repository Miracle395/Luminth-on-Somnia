/* ============================================================
   LUMINTH — Reactive Liquid Staking Frontend (CLEAN)
============================================================ */

/* ============================================================
   1. CONFIG
============================================================ */
const SOMNIA_CHAIN_ID = 50312;
const SOMNIA_CHAIN_ID_HEX = "0xC488";
const SOMNIA_RPC = "https://dream-rpc.somnia.network";

const PONG_ADDRESS  = "0x9beaA0016c22B646Ac311Ab171270B0ECf23098F";
const VAULT_ADDRESS = "0x83c1006a1D4D68727a6eBD358Fbfb7a38234066C";

/* ============================================================
   2. ABIs
============================================================ */
const ERC20_ABI = [
  "function balanceOf(address) view returns (uint256)",
  "function allowance(address,address) view returns (uint256)",
  "function approve(address,uint256) returns (bool)",
  "function decimals() view returns (uint8)"
];

const VAULT_ABI = [
  "function deposit(uint256 assets, address receiver)",
  "function withdraw(uint256 shares, address receiver)",
  "function balanceOf(address user) view returns (uint256)",
  "event YieldCompounded(uint256 yieldAmount, uint256 newTotalAssets)"
];

/* ============================================================
   3. STATE
============================================================ */
let provider, signer, user;
let token, vault;

let readProvider = new ethers.providers.JsonRpcProvider(SOMNIA_RPC);

let lastShares = 0;
let mode = "stake";

/* ============================================================
   4. INIT
============================================================ */
document.addEventListener("DOMContentLoaded", () => {

  const connectBtn = document.getElementById("connectWalletBtn");
  const accountBtn = document.getElementById("accountBtn");
  const actionBtn  = document.getElementById("stakeButton");
  const input      = document.getElementById("stakeInput");
  const status     = document.getElementById("status");
  const balanceEl  = document.getElementById("sUSDTBalance");
  const maxBtn     = document.getElementById("maxBtn");

  const stakeTab   = document.getElementById("stakeTab");
  const unstakeTab = document.getElementById("unstakeTab");

  /* ============================================================
     CONNECT
  ============================================================ */
  async function connectWallet() {
    if (!window.ethereum) return alert("Install MetaMask");

    try {
      await switchToSomnia();

      provider = new ethers.providers.Web3Provider(window.ethereum);
      signer   = provider.getSigner();
      user     = await signer.getAddress();

      initContracts();
      onConnectedUI();
      listenReactivity();

      await refresh();

    } catch (err) {
      console.error(err);
    }
  }

  /* ============================================================
     NETWORK
  ============================================================ */
  async function switchToSomnia() {
    try {
      await window.ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: SOMNIA_CHAIN_ID_HEX }]
      });
    } catch (err) {
      if (err.code === 4902) {
        await window.ethereum.request({
          method: "wallet_addEthereumChain",
          params: [{
            chainId: SOMNIA_CHAIN_ID_HEX,
            chainName: "Somnia",
            rpcUrls: [SOMNIA_RPC],
            nativeCurrency: { name: "STT", symbol: "STT", decimals: 18 }
          }]
        });
      } else throw err;
    }
  }

  /* ============================================================
     CONTRACTS
  ============================================================ */
  function initContracts() {
    token = new ethers.Contract(PONG_ADDRESS, ERC20_ABI, signer);
    vault = new ethers.Contract(VAULT_ADDRESS, VAULT_ABI, signer);
  }

  /* ============================================================
     UI
  ============================================================ */
  function onConnectedUI() {
    connectBtn.style.display = "none";
    actionBtn.style.display  = "block";

    const avatar = document.getElementById("accountAvatar");
    avatar.innerHTML = `<div class="avatar-initial">
      ${user.slice(2,3).toUpperCase()}
    </div>`;
  }

  /* ============================================================
     MODE
  ============================================================ */
  function renderMode() {
    const isStake = mode === "stake";

    stakeTab.classList.toggle("active", isStake);
    unstakeTab.classList.toggle("active", !isStake);

    document.querySelector(".staking-heading").textContent =
      isStake ? "Stake $PONG to earn automatically."
              : "Unstake your $PONG anytime.";

    document.getElementById("stakeActionText").textContent =
      isStake ? "Stake" : "Unstake";

    input.value = "";
    status.textContent = "";
  }

  stakeTab.onclick   = () => { mode = "stake"; renderMode(); };
  unstakeTab.onclick = () => { mode = "unstake"; renderMode(); };

  /* ============================================================
     ANIMATION
  ============================================================ */
  function animateValue(el, start, end, duration = 800) {
    const t0 = performance.now();

    function frame(t) {
      const p = Math.min((t - t0) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      el.textContent = (start + (end - start) * eased).toFixed(4);
      if (p < 1) requestAnimationFrame(frame);
    }

    requestAnimationFrame(frame);
  }

  /* ============================================================
     REFRESH
  ============================================================ */
  async function refresh() {
    if (!user) return;

    const [bal, shares] = await Promise.all([
      token.balanceOf(user),
      vault.balanceOf(user)
    ]);

    window.userBalance = bal;
    window.userShares  = shares;

    const newBalance = Number(
      ethers.utils.formatUnits(shares, 18)
    );

    animateValue(balanceEl, lastShares, newBalance);
    lastShares = newBalance;
  }

  /* ============================================================
     MAX
  ============================================================ */
  maxBtn.onclick = () => {
    const value = mode === "stake"
      ? window.userBalance
      : window.userShares;

    input.value = ethers.utils.formatUnits(value || 0, 18);
  };

  /* ============================================================
     ACTION
  ============================================================ */
  actionBtn.onclick = async () => {
    if (!user) return;

    const val = input.value;
    if (!val || Number(val) <= 0) return;

    try {
      actionBtn.disabled = true;

      if (mode === "stake") {

        const amount = ethers.utils.parseUnits(val, 18);

        const allowance = await token.allowance(user, VAULT_ADDRESS);

        if (allowance.lt(amount)) {
          const tx = await token.approve(
            VAULT_ADDRESS,
            ethers.constants.MaxUint256
          );
          await tx.wait();
        }

        const tx = await vault.deposit(amount, user);
        await tx.wait();

        status.textContent = "✅ Staked!";

      } else {

        const shares = ethers.utils.parseUnits(val, 18);

        const tx = await vault.withdraw(shares, user);
        await tx.wait();

        status.textContent = "✅ Unstaked!";
      }

      input.value = "";
      await refresh();

    } catch (err) {
      console.error(err);
      status.textContent = "❌ Transaction failed";
    } finally {
      actionBtn.disabled = false;
    }
  };

  /* ============================================================
     FLOATING YIELD
  ============================================================ */
  function showFloatingYield(amount) {
    const el = document.createElement("div");
    el.className = "floating-yield";
    el.textContent = `+${amount.toFixed(4)} PONG`;

    document.body.appendChild(el);
    setTimeout(() => el.remove(), 1200);
  }

  /* ============================================================
     REACTIVITY
  ============================================================ */
  function listenReactivity() {
    const ws = new ethers.providers.WebSocketProvider(
      "wss://dream-rpc.somnia.network/ws"
    );

    const v = new ethers.Contract(
      VAULT_ADDRESS,
      VAULT_ABI,
      ws
    );

    v.on("YieldCompounded", (amount) => {

      const y = Number(
        ethers.utils.formatUnits(amount, 18)
      );

      status.textContent = `⚡ +${y.toFixed(4)} PONG earned`;

      document.body.classList.add("yield-pulse");
      setTimeout(() => {
        document.body.classList.remove("yield-pulse");
      }, 600);

      showFloatingYield(y);

      refresh();
    });
  }

  /* ============================================================
     BUTTONS
  ============================================================ */
  connectBtn.onclick = connectWallet;

  accountBtn.onclick = async () => {
    if (!user) {
      await connectWallet();
    } else {
      const menu = document.getElementById("accountMenu");
      menu.style.display =
        menu.style.display === "block" ? "none" : "block";
    }
  };

});