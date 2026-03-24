/* ============================================================
   LUMINTH — Reactive Liquid Staking Frontend (FINAL)
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
  "function totalAssets() view returns (uint256)",
  "event YieldCompounded(uint256 yieldAmount, uint256 newTotalAssets)"
];

/* ============================================================
   3. STATE
============================================================ */
let provider, signer, user;
let token, vault;
let readProvider = new ethers.providers.JsonRpcProvider(SOMNIA_RPC);

/* ============================================================
   4. INIT (DOM SAFE)
============================================================ */
document.addEventListener("DOMContentLoaded", () => {

  const connectBtn = document.getElementById("connectWalletBtn");
  const accountBtn = document.getElementById("accountBtn");
  const actionBtn  = document.getElementById("stakeButton");
  const input      = document.getElementById("stakeInput");
  const status     = document.getElementById("status");
  const balanceEl  = document.getElementById("sUSDTBalance");
  const maxBtn     = document.getElementById("maxBtn");

  /* ============================================================
     CONNECT (UNIFIED)
  ============================================================ */
  async function connectWallet() {
    if (!window.ethereum) {
      alert("Install MetaMask");
      return;
    }

    try {
      await switchToSomnia();

      provider = new ethers.providers.Web3Provider(window.ethereum);
      signer   = provider.getSigner();
      user     = await signer.getAddress();

      initContracts();
      onConnectedUI();
      listenReactivity();
      refresh();

    } catch (err) {
      console.error("Connection failed:", err);
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
      } else {
        throw err;
      }
    }
  }

  /* ============================================================
     CONTRACT INIT
  ============================================================ */
  function initContracts() {
    token = new ethers.Contract(PONG_ADDRESS, ERC20_ABI, signer);
    vault = new ethers.Contract(VAULT_ADDRESS, VAULT_ABI, signer);
  }

  /* ============================================================
     UI AFTER CONNECT
  ============================================================ */
  function onConnectedUI() {
    document.getElementById("connectWalletBtn").style.display = "none";
    document.getElementById("stakeButton").style.display = "block";

    const avatar = document.getElementById("accountAvatar");
    const short = `${user.slice(0,6)}...${user.slice(-4)}`;
    avatar.innerHTML = `<div class="avatar-initial">${short}</div>`;
  }

  /* ============================================================
     BALANCES
  ============================================================ */
  async function refresh() {
    if (!user) return;

    try {
      const [bal, shares] = await Promise.all([
        token.balanceOf(user),
        vault.balanceOf(user)
      ]);

      window.userBalance = bal;
      window.userShares  = shares;

      balanceEl.textContent = ethers.utils.formatUnits(shares, 18);

    } catch (err) {
      console.error("Refresh error:", err);
    }
  }

  /* ============================================================
     MAX BUTTON
  ============================================================ */
  maxBtn.onclick = () => {
    input.value = ethers.utils.formatUnits(window.userBalance || 0, 18);
  };

  /* ============================================================
     STAKE
  ============================================================ */
  actionBtn.onclick = async () => {
    if (!user) return;

    const val = input.value;
    if (!val || Number(val) <= 0) return;

    const amount = ethers.utils.parseUnits(val, 18);

    try {
      status.textContent = "Checking approval...";

      const allowance = await token.allowance(user, VAULT_ADDRESS);

      if (allowance.lt(amount)) {
        status.textContent = "Approving...";
        const tx = await token.approve(
          VAULT_ADDRESS,
          ethers.constants.MaxUint256
        );
        await tx.wait();
      }

      status.textContent = "Depositing...";
      const tx = await vault.deposit(amount, user);
      await tx.wait();

      status.textContent = "✅ Staked!";
      input.value = "";

      refresh();

    } catch (err) {
      console.error(err);
      status.textContent = "❌ Transaction failed";
    }
  };

  /* ============================================================
     REACTIVITY
  ============================================================ */
  function listenReactivity() {
    const wsProvider = new ethers.providers.WebSocketProvider(
      "wss://dream-rpc.somnia.network/ws"
    );

    const vaultWS = new ethers.Contract(
      VAULT_ADDRESS,
      VAULT_ABI,
      wsProvider
    );

    vaultWS.on("YieldCompounded", (amount) => {
      const y = ethers.utils.formatUnits(amount, 18);

      status.textContent = `⚡ Yield +${y} PONG auto-compounded`;

      // visual pulse
      document.body.style.boxShadow = "inset 0 0 20px #00ff90";
      setTimeout(() => {
        document.body.style.boxShadow = "none";
      }, 600);

      refresh();
    });
  }

  /* ============================================================
     BUTTON WIRING (KEY FIX)
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