import { useEffect, useState } from "react";
import { ethers } from "ethers";
import "./App.css";

const TOKEN_ADDRESS = import.meta.env.VITE_TOKEN_ADDRESS;
const RPC_URL = import.meta.env.VITE_RPC_URL || "http://127.0.0.1:8545";

// Minimal ABI: chỉ cần event Transfer + optional helpers + approve
const TOKEN_ABI = [
  "event Transfer(address indexed from, address indexed to, uint256 value)",
  "event Approval(address indexed owner, address indexed spender, uint256 value)",
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)",
  "function balanceOf(address account) view returns (uint256)",
  "function approve(address spender, uint256 value) returns (bool)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function transfer(address to, uint256 value) returns (bool)"
];


function formatAmount(value, decimals) {
  try {
    return ethers.formatUnits(value, decimals);
  } catch (e) {
    return value.toString();
  }
}

function HistoryRow({ item }) {
  const short = (s) => (s ? s.slice(0, 6) + "..." + s.slice(-4) : s);
  return (
    <tr>
      <td>{item.direction}</td>
      <td title={item.from}>{short(item.from)}</td>
      <td title={item.to}>{short(item.to)}</td>
      <td style={{textAlign: "right"}}>{item.amount}</td>
      <td>{item.blockNumber}</td>
      <td>
        <a
          href="#"
          onClick={(e) => { e.preventDefault(); navigator.clipboard?.writeText(item.txHash); alert("Copied txHash"); }}
        >
          {short(item.txHash)}
        </a>
      </td>
    </tr>
  );
}

export default function App() {
  const [address, setAddress] = useState("");
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState([]);
  const [symbol, setSymbol] = useState("");
  const [decimals, setDecimals] = useState(18);
  const [error, setError] = useState("");

  useEffect(() => {
    // try to read token metadata once
    if (!TOKEN_ADDRESS) return;
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const contract = new ethers.Contract(TOKEN_ADDRESS, TOKEN_ABI, provider);
    contract.symbol().then(setSymbol).catch(() => setSymbol(""));
    contract.decimals().then((d) => setDecimals(Number(d))).catch(() => setDecimals(18));
  }, []);

  async function fetchHistoryFor(addr) {
    setError("");
    setLoading(true);
    setHistory([]);
    try {
      if (!ethers.isAddress(addr)) {
        setError("Invalid Ethereum address");
        setLoading(false);
        return;
      }
      const provider = new ethers.JsonRpcProvider(RPC_URL);
      const contract = new ethers.Contract(TOKEN_ADDRESS, TOKEN_ABI, provider);

      // get latest block to use as toBlock
      const latest = await provider.getBlockNumber();

      // Query Transfer events where from = addr (sent) and to = addr (received)
      // fromBlock 0 is fine on local dev; for mainnet you should set a reasonable fromBlock.
      const sentEvents = await contract.queryFilter(contract.filters.Transfer(addr, null), 0, latest);
      const recvEvents = await contract.queryFilter(contract.filters.Transfer(null, addr), 0, latest);

      // normalize into unified array with direction
      const mapEvent = (ev, dir) => {
        const parsed = ev.args; // [from, to, value]
        return {
          direction: dir, // "Sent" or "Received"
          from: parsed.from,
          to: parsed.to,
          amountRaw: parsed.value,
          amount: formatAmount(parsed.value, decimals),
          txHash: ev.transactionHash,
          blockNumber: ev.blockNumber,
          logIndex: ev.logIndex
        };
      };

      const sent = sentEvents.map((e) => mapEvent(e, "Sent"));
      const recv = recvEvents.map((e) => mapEvent(e, "Received"));

      // merge & sort by blockNumber, then logIndex
      const merged = [...sent, ...recv].sort((a, b) => {
        if (a.blockNumber !== b.blockNumber) return a.blockNumber - b.blockNumber;
        return (a.logIndex || 0) - (b.logIndex || 0);
      });

      // convert amounts again using fetched decimals (in case decimals resolved async)
      for (const it of merged) {
        it.amount = formatAmount(it.amountRaw, decimals);
      }

      setHistory(merged.reverse()); // newest first
    } catch (err) {
      console.error(err);
      setError("Failed to fetch events: " + (err.message || err));
    }
    setLoading(false);
  }

  const handleApprove = async () => {
    const spender = document.getElementById("spender").value;
    const amount = document.getElementById("approveAmount").value;

    if (!spender || !amount) return alert("Nhập đủ thông tin!");

    if (!ethers.isAddress(spender)) {
      alert("Invalid spender address!");
      return;
    }

    try {
      // Connect to MetaMask
      if (!window.ethereum) {
        alert("Please install MetaMask!");
        return;
      }

      const provider = new ethers.BrowserProvider(window.ethereum);
      await provider.send("eth_requestAccounts", []);
      const signer = await provider.getSigner();
      
      const token = new ethers.Contract(TOKEN_ADDRESS, TOKEN_ABI, signer);
      
      const tx = await token.approve(spender, ethers.parseUnits(amount, decimals));
      await tx.wait();
      alert("Approve thành công!");
      
      // Clear inputs
      document.getElementById("spender").value = "";
      document.getElementById("approveAmount").value = "";
    } catch (e) {
      console.error(e);
      alert("Approve thất bại: " + (e.message || e));
    }
  };

  return (
    <div style={{ maxWidth: 980, margin: "36px auto", padding: 12 }}>
      <h1>QuangDai Token - Transfer History</h1>
      <p style={{color:"#444"}}>Token: <strong>{symbol || "—"}</strong> ({TOKEN_ADDRESS})</p>

      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        <input
          style={{ flex: 1, padding: "8px 10px", fontSize: 16 }}
          placeholder="Enter Ethereum address (0x...)"
          value={address}
          onChange={(e) => setAddress(e.target.value.trim())}
        />
        <button
          style={{ padding: "8px 14px" }}
          onClick={() => fetchHistoryFor(address)}
          disabled={loading || !address}
        >
          {loading ? "Loading..." : "Fetch history"}
        </button>
      </div>

      <br /><br />
      <h2>Approve Cho Địa Chỉ Khác</h2>
      <div style={{ marginBottom: 12 }}>
        <input
          type="text"
          placeholder="Spender address"
          id="spender"
          style={{ width: "300px", padding: "8px", marginRight: "8px" }}
        />
        <input
          type="number"
          placeholder="Amount"
          id="approveAmount"
          style={{ width: "150px", padding: "8px", marginRight: "8px" }}
        />
        <button 
          onClick={handleApprove}
          style={{ padding: "8px 14px" }}
        >
          Approve
        </button>
      </div>

      {error && <div style={{ color: "crimson", marginBottom: 12 }}>{error}</div>}

      <div>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead style={{ textAlign: "left", borderBottom: "1px solid #eee" }}>
            <tr>
              <th>Dir</th>
              <th>From</th>
              <th>To</th>
              <th style={{textAlign:"right"}}>Amount ({symbol || "TOKEN"})</th>
              <th>Block</th>
              <th>Tx</th>
            </tr>
          </thead>
          <tbody>
            {history.length === 0 && (
              <tr>
                <td colSpan={6} style={{ padding: 18, color: "#666" }}>
                  No transfers found (try another address or press Fetch).
                </td>
              </tr>
            )}
            {history.map((it) => (
              <HistoryRow key={it.txHash + "-" + it.logIndex} item={it} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
