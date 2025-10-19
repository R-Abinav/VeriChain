import React, { useState, useEffect } from 'react';
import { CheckCircle, AlertCircle, HelpCircle, Loader, Send, Wallet, Flame, TrendingUp, ArrowRight, Zap, Shield, Plus, Eye } from 'lucide-react';
import { ethers } from 'ethers';

declare global {
  interface Window {
    ethereum?: any;
  }
}

const API_URL = import.meta.env.VITE_API_URL;

// ⚠️ UPDATE THESE WITH YOUR DEPLOYED CONTRACT ADDRESSES
const FACT_CHECK_REGISTRY_ADDRESS = import.meta.env.VITE_FACT_CHECK_REGISTRY_ADDRESS; // Deploy on Sepolia
const STAKE_POOL_ADDRESS = import.meta.env.VITE_STAKE_POOL_ADDRESS ; // Deploy on Sepolia

if (import.meta.env.DEV) {
  console.log('[ENV]', {
    VITE_API_URL: API_URL,
    VITE_FACT_CHECK_REGISTRY_ADDRESS: FACT_CHECK_REGISTRY_ADDRESS,
    VITE_STAKE_POOL_ADDRESS: STAKE_POOL_ADDRESS,
  });
}

// Contract ABIs
const FACT_CHECK_REGISTRY_ABI = [
  'function submitFactCheck(string memory _claim, string memory _aiAnalysis, uint8 _confidenceScore) external returns (uint256)',
  'function addStake(uint256 _id, bool _supportVerdict, uint256 _amount) external',
  'function getFactCheck(uint256 _id) external view returns (tuple(uint256 id, string claim, string aiAnalysis, uint8 confidenceScore, uint8 verdict, address submittedBy, uint256 timestamp, uint256 stakesFor, uint256 stakesAgainst, bool finalized))',
  'function getTotalFactChecks() external view returns (uint256)',
  'function getStakes(uint256 _id) external view returns (tuple(address staker, uint256 amount, bool supportVerdict, uint256 timestamp)[])',
];

const STAKE_POOL_ABI = [
  'function deposit() external payable',
  'function withdraw(uint256 _amount) external',
  'function getBalance(address _user) external view returns (uint256)',
  'function getAvailableBalance(address _user) external view returns (uint256)',
];

interface AnalysisResult {
  verdict: 'TRUE' | 'FALSE' | 'UNCLEAR';
  confidence: number;
  analysis: string;
  sources: string[];
}

interface FactCheck {
  id: string;
  claim: string;
  submittedBy: string;
  timestamp: string;
  analysis?: AnalysisResult;
  stakesFor: number;
  stakesAgainst: number;
  totalStakers: number;
  userStake?: {
    amount: number;
    supportVerdict: boolean;
  };
  status: 'pending' | 'analyzed' | 'finalized';
}

export default function VeriChain() {
  const [currentView, setCurrentView] = useState<'landing' | 'voting' | 'submit'>('landing');
  const [walletConnected, setWalletConnected] = useState(false);
  const [userAddress, setUserAddress] = useState('');
  const [userBalance, setUserBalance] = useState('0');
  const [provider, setProvider] = useState<ethers.BrowserProvider | null>(null);
  const [signer, setSigner] = useState<ethers.Signer | null>(null);
  const [registryContract, setRegistryContract] = useState<ethers.Contract | null>(null);
  const [stakePoolContract, setStakePoolContract] = useState<ethers.Contract | null>(null);
  
  const [claimsList, setClaimsList] = useState<FactCheck[]>([]);
  const [claim, setClaim] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedForStaking, setSelectedForStaking] = useState<string | null>(null);
  const [stakeAmount, setStakeAmount] = useState('');
  const [stakeSupport, setStakeSupport] = useState(true);
  const [stakingInProgress, setStakingInProgress] = useState(false);

  // Fetch claims from smart contract
  const loadClaimsFromBlockchain = async () => {
    if (!registryContract) return;

    try {
      const totalClaims = await registryContract.getTotalFactChecks();
      const claims: FactCheck[] = [];

      for (let i = 0; i < Number(totalClaims); i++) {
        const factCheck = await registryContract.getFactCheck(i);
        const stakes = await registryContract.getStakes(i);

        claims.push({
          id: factCheck.id.toString(),
          claim: factCheck.claim,
          submittedBy: factCheck.submittedBy,
          timestamp: new Date(Number(factCheck.timestamp) * 1000).toLocaleTimeString(),
          analysis: {
            verdict: ['PENDING', 'TRUE', 'FALSE', 'UNCLEAR'][Number(factCheck.verdict)] as 'TRUE' | 'FALSE' | 'UNCLEAR',
            confidence: Number(factCheck.confidenceScore),
            analysis: factCheck.aiAnalysis,
            sources: []
          },
          stakesFor: Number(ethers.formatEther(factCheck.stakesFor)),
          stakesAgainst: Number(ethers.formatEther(factCheck.stakesAgainst)),
          totalStakers: stakes.length,
          status: 'analyzed'
        });
      }

      setClaimsList(claims);
    } catch (err) {
      console.error('Error loading claims:', err);
    }
  };

  // Load claims after wallet connects and contract is set
  useEffect(() => {
    if (registryContract && walletConnected) {
      loadClaimsFromBlockchain();
    }
  }, [registryContract, walletConnected]);

  // Connect Wallet with Ethers
  const connectWallet = async () => {
    try {
      if (!window.ethereum) {
        alert('No wallet found. Please install MetaMask or another Web3 wallet, then come back.');
        setError('No wallet detected. Install MetaMask and try again.');
        return;
      }

      const newProvider = new ethers.BrowserProvider(window.ethereum);
      const newSigner = await newProvider.getSigner();
      const address = await newSigner.getAddress();

      // Initialize contracts
      const registry = new ethers.Contract(
        FACT_CHECK_REGISTRY_ADDRESS,
        FACT_CHECK_REGISTRY_ABI,
        newSigner
      );
      const stakePool = new ethers.Contract(
        STAKE_POOL_ADDRESS,
        STAKE_POOL_ABI,
        newSigner
      );

      setProvider(newProvider);
      setSigner(newSigner);
      setRegistryContract(registry);
      setStakePoolContract(stakePool);
      setUserAddress(address);
      setWalletConnected(true);
      setCurrentView('voting');

      // Fetch user balance
      try {
        const balance = await stakePool.getAvailableBalance(address);
        setUserBalance(ethers.formatEther(balance));
      } catch (e) {
        console.log('Could not fetch balance - contracts may not be deployed');
      }

      setError('');
    } catch (err: any) {
      setError(err.message || 'Failed to connect wallet');
    }
  };

  const disconnectWallet = () => {
    setWalletConnected(false);
    setUserAddress('');
    setProvider(null);
    setSigner(null);
    setRegistryContract(null);
    setStakePoolContract(null);
    setCurrentView('landing');
  };

  // Submit Claim to Contract + AI Analysis
  const handleSubmitClaim = async () => {
    if (!claim.trim()) {
      setError('Please enter a claim');
      return;
    }

    if (!registryContract || !signer) {
      setError('Contracts not initialized');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // 1. Get AI Analysis
      const response = await fetch(`${API_URL}/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ claim: claim.trim() }),
      });

      if (!response.ok) throw new Error('Failed to analyze claim');
      const data = await response.json();

      // 2. Submit to Smart Contract
      const tx = await registryContract.submitFactCheck(
        claim.trim(),
        data.data.analysis,
        BigInt(data.data.confidence)
      );

      const receipt = await tx.wait();
      console.log('Claim submitted to blockchain:', receipt);

      // Refresh list from blockchain after successful submission
      await loadClaimsFromBlockchain();
      setClaim('');
      setCurrentView('voting');
    } catch (err: any) {
      setError(`Error: ${err.message || 'Failed to submit claim'}`);
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Stake on Claim via Smart Contract
  const handleStake = async (checkId: string) => {
    const check = claimsList.find(c => c.id === checkId);
    if (!check) return;

    if (check.submittedBy === userAddress) {
      setError("❌ You can't stake on your own claim!");
      return;
    }

    if (!stakeAmount || isNaN(Number(stakeAmount))) {
      setError('Please enter a valid stake amount');
      return;
    }

    if (!registryContract || !signer) {
      setError('Contracts not initialized or wallet not connected');
      return;
    }

    setStakingInProgress(true);
    setError('');

    try {
      const stakeAmountWei = ethers.parseEther(stakeAmount);

      // Call addStake on FactCheckRegistry
      // Note: The user must have already deposited to StakePool
      const tx = await registryContract.addStake(
        BigInt(checkId),
        stakeSupport,
        stakeAmountWei
      );

      // Wait for confirmation
      const receipt = await tx.wait();
      console.log('Stake confirmed on blockchain:', receipt);

      // Update UI
      setClaimsList(prev =>
        prev.map(c => {
          if (c.id === checkId) {
            const amount = Number(stakeAmount);
            return {
              ...c,
              stakesFor: stakeSupport ? c.stakesFor + amount : c.stakesFor,
              stakesAgainst: !stakeSupport ? c.stakesAgainst + amount : c.stakesAgainst,
              totalStakers: c.totalStakers + 1,
              userStake: { amount, supportVerdict: stakeSupport }
            };
          }
          return c;
        })
      );

      setStakeAmount('');
      setSelectedForStaking(null);
    } catch (err: any) {
      setError(`Staking failed: ${err.message}`);
      console.error(err);
    } finally {
      setStakingInProgress(false);
    }
  };

  // Deposit to StakePool
  const handleDepositToPool = async () => {
    if (!stakePoolContract || !signer) {
      setError('Contracts not initialized');
      return;
    }

    const depositAmount = prompt('Enter amount to deposit (ETH):');
    if (!depositAmount || isNaN(Number(depositAmount))) return;

    setLoading(true);
    try {
      const tx = await stakePoolContract.deposit({
        value: ethers.parseEther(depositAmount)
      });
      await tx.wait();
      
      // Update balance
      const newBalance = await stakePoolContract.getAvailableBalance(userAddress);
      setUserBalance(ethers.formatEther(newBalance));
      
      setError('');
    } catch (err: any) {
      setError(`Deposit failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const getVerdictIcon = (verdict: string) => {
    if (verdict === 'TRUE') return <CheckCircle className="w-6 h-6 text-emerald-400" />;
    if (verdict === 'FALSE') return <AlertCircle className="w-6 h-6 text-rose-400" />;
    return <HelpCircle className="w-6 h-6 text-amber-400" />;
  };

  const getVerdictBg = (verdict: string) => {
    if (verdict === 'TRUE') return 'from-emerald-500/20 to-emerald-600/20 border-emerald-500/30';
    if (verdict === 'FALSE') return 'from-rose-500/20 to-rose-600/20 border-rose-500/30';
    return 'from-amber-500/20 to-amber-600/20 border-amber-500/30';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 text-white">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-purple-500 opacity-5 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-blue-500 opacity-5 rounded-full blur-3xl"></div>
      </div>

      <div className="relative z-10">
        {/* Header */}
        <nav className="border-b border-slate-800/50 backdrop-blur-md bg-slate-950/30 sticky top-0 z-40">
          <div className="max-w-7xl mx-auto px-4 md:px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3 cursor-pointer" onClick={() => walletConnected && setCurrentView('voting')}>
              <div className="p-2 bg-gradient-to-br from-purple-500 to-blue-600 rounded-xl">
                <Zap className="w-6 h-6" />
              </div>
              <h1 className="text-2xl font-black bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">VeriChain</h1>
            </div>

            {walletConnected ? (
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <p className="text-sm text-slate-400">Balance</p>
                  <p className="font-bold text-emerald-400">{parseFloat(userBalance).toFixed(4)} ETH</p>
                </div>
                <button
                  onClick={handleDepositToPool}
                  className="px-3 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm font-semibold transition-all duration-200"
                >
                  Deposit
                </button>
                <button
                  onClick={disconnectWallet}
                  className="relative group flex items-center justify-center gap-2 min-w-48 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 px-5 py-2 rounded-lg font-semibold transition-all duration-200"
                >
                  <span className="group-hover:hidden inline-flex items-center gap-2">
                    <Wallet className="w-4 h-4" />
                    {userAddress.slice(0, 6)}...{userAddress.slice(-4)}
                  </span>
                  <span className="hidden group-hover:inline text-rose-300">Disconnect Wallet</span>
                </button>
              </div>
            ) : null}
          </div>
        </nav>

        <div className="max-w-7xl mx-auto px-4 md:px-6 py-8">
          {/* Landing Page */}
          {!walletConnected && currentView === 'landing' && (
            <div className="min-h-screen flex items-center justify-center">
              <div className="text-center space-y-8">
                <div className="space-y-4">
                  <h2 className="text-5xl md:text-6xl font-black bg-gradient-to-r from-purple-400 via-blue-400 to-purple-400 bg-clip-text text-transparent">
                    Verify. Stake. Earn.
                  </h2>
                  <p className="text-xl text-slate-400">Agentic AI-powered, Web3 × AI platform for decentralized misinformation detection with on-chain proof</p>
                </div>

                

                <button
                  onClick={connectWallet}
                  className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 px-10 py-4 rounded-xl font-bold text-lg transition-all duration-200 inline-flex items-center gap-2 shadow-2xl hover:shadow-purple-500/50"
                >
                  <Wallet className="w-5 h-5" />
                  Connect Wallet
                  <ArrowRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          )}

          {/* Main App */}
          {walletConnected && currentView === 'voting' && (
            <div className="space-y-6">
              <div className="flex gap-4">
                <button
                  onClick={() => setCurrentView('submit')}
                  className="flex-1 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 px-6 py-3 rounded-xl font-semibold transition-all duration-200 flex items-center justify-center gap-2"
                >
                  <Plus className="w-5 h-5" />
                  Submit Claim
                </button>
                <button
                  onClick={loadClaimsFromBlockchain}
                  className="px-6 py-3 bg-slate-700 hover:bg-slate-600 rounded-xl font-semibold transition-all duration-200"
                  aria-label="Refresh to see latest claims"
                  title="Refresh to see latest claims"
                >
                  🔄 Refresh
                </button>
              </div>

              {error && (
                <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-300">
                  {error}
                </div>
              )}

              <div className="space-y-4">
                {claimsList.length === 0 ? (
                  <div className="text-center py-12 text-slate-400">
                    No claims yet. Submit one to get started!
                  </div>
                ) : (
                  claimsList.map((claim) => (
                    <div key={claim.id} className={`bg-gradient-to-br ${getVerdictBg(claim.analysis?.verdict || 'UNCLEAR')} border rounded-2xl p-6 backdrop-blur-sm transition-all duration-300 hover:shadow-xl`}>
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            {claim.analysis && getVerdictIcon(claim.analysis.verdict)}
                            <span className="text-sm text-slate-400">{claim.timestamp}</span>
                          </div>
                          <h3 className="text-xl font-bold text-white mb-2">{claim.claim}</h3>
                          <p className="text-sm text-slate-400">Posted by {claim.submittedBy}</p>
                        </div>
                        {claim.analysis && (
                          <div className="text-right">
                            <div className="text-3xl font-black text-purple-400">{claim.analysis.verdict}</div>
                            <div className="text-sm text-slate-400">{claim.analysis.confidence}%</div>
                          </div>
                        )}
                      </div>

                      {claim.analysis && (
                        <div className="bg-slate-900/50 border border-slate-700/50 rounded-xl p-4 mb-4">
                          <p className="text-sm text-slate-300"><strong>🤖 AI:</strong> {claim.analysis.analysis}</p>
                          <div className="flex gap-2 mt-3 flex-wrap">
                            {claim.analysis.sources.map((s, i) => (
                              <span key={i} className="text-xs bg-slate-800 px-2 py-1 rounded text-slate-300">{s}</span>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="grid grid-cols-3 gap-3 mb-4">
                        <div className="bg-emerald-500/20 border border-emerald-500/30 rounded-lg p-3">
                          <p className="text-xs text-emerald-300">Support</p>
                          <p className="text-2xl font-bold text-emerald-400">${claim.stakesFor}</p>
                        </div>
                        <div className="bg-slate-800/50 border border-slate-700/30 rounded-lg p-3">
                          <p className="text-xs text-slate-400">Stakers</p>
                          <p className="text-2xl font-bold text-slate-300">{claim.totalStakers}</p>
                        </div>
                        <div className="bg-rose-500/20 border border-rose-500/30 rounded-lg p-3">
                          <p className="text-xs text-rose-300">Dispute</p>
                          <p className="text-2xl font-bold text-rose-400">${claim.stakesAgainst}</p>
                        </div>
                      </div>

                      {claim.userStake && (
                        <div className="bg-blue-500/20 border border-blue-500/30 rounded-lg p-3 mb-4">
                          <p className="text-sm text-blue-300">✅ Your stake: ${claim.userStake.amount} {claim.userStake.supportVerdict ? 'Supporting' : 'Disputing'}</p>
                        </div>
                      )}

                      {claim.submittedBy !== userAddress ? (
                        selectedForStaking === claim.id ? (
                          <div className="space-y-3">
                            <input
                              type="number"
                              value={stakeAmount}
                              onChange={(e) => setStakeAmount(e.target.value)}
                              placeholder="Amount (ETH)"
                              className="w-full bg-slate-900/50 border border-slate-700/50 rounded-lg px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                            />
                            <div className="flex gap-2">
                              <button
                                onClick={() => {
                                  setStakeSupport(true);
                                  handleStake(claim.id);
                                }}
                                disabled={stakingInProgress}
                                className="flex-1 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-600 px-3 py-2 rounded-lg text-sm font-semibold transition-all duration-200 flex items-center justify-center gap-2"
                              >
                                {stakingInProgress ? <Loader className="w-4 h-4 animate-spin" /> : '✅'}
                                Support
                              </button>
                              <button
                                onClick={() => {
                                  setStakeSupport(false);
                                  handleStake(claim.id);
                                }}
                                disabled={stakingInProgress}
                                className="flex-1 bg-rose-600 hover:bg-rose-700 disabled:bg-slate-600 px-3 py-2 rounded-lg text-sm font-semibold transition-all duration-200 flex items-center justify-center gap-2"
                              >
                                {stakingInProgress ? <Loader className="w-4 h-4 animate-spin" /> : '❌'}
                                Dispute
                              </button>
                              <button
                                onClick={() => setSelectedForStaking(null)}
                                disabled={stakingInProgress}
                                className="flex-1 bg-slate-700 hover:bg-slate-600 disabled:bg-slate-600 px-3 py-2 rounded-lg text-sm font-semibold transition-all duration-200"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <button
                            onClick={() => setSelectedForStaking(claim.id)}
                            className="w-full bg-slate-700 hover:bg-slate-600 px-4 py-2 rounded-lg font-semibold transition-all duration-200"
                          >
                            Add Your Stake
                          </button>
                        )
                      ) : (
                        <div className="bg-slate-800/50 border border-slate-700/50 rounded-lg p-3 text-center">
                          <p className="text-sm text-slate-400">👤 This is your claim</p>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Submit Claim */}
          {walletConnected && currentView === 'submit' && (
            <div className="max-w-2xl mx-auto">
              <button
                onClick={() => setCurrentView('voting')}
                className="mb-6 text-slate-400 hover:text-white flex items-center gap-2 transition-all duration-200"
              >
                ← Back
              </button>

              <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 border border-slate-700/50 backdrop-blur-md rounded-2xl p-8 space-y-6">
                <h2 className="text-3xl font-black text-white">Submit a Claim</h2>

                {error && (
                  <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-300">
                    {error}
                  </div>
                )}

                <textarea
                  value={claim}
                  onChange={(e) => setClaim(e.target.value)}
                  placeholder="Enter a claim to verify..."
                  className="w-full bg-slate-900/50 border border-slate-700/50 text-white rounded-xl px-4 py-4 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
                  rows={6}
                />

                <button
                  onClick={handleSubmitClaim}
                  disabled={loading || !claim.trim()}
                  className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 disabled:from-slate-600 disabled:to-slate-700 px-6 py-3 rounded-xl font-bold transition-all duration-200 flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <Loader className="w-5 h-5 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    <>
                      <Send className="w-5 h-5" />
                      Submit & Analyze
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}