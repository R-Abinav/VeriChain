import React, { useState, useEffect } from 'react';
import { CheckCircle, AlertCircle, HelpCircle, Loader, Send, Wallet, TrendingUp, Image, Video } from 'lucide-react';
import { ethers } from 'ethers';

const API_URL = 'http://localhost:3001/api';

interface AnalysisResult {
  verdict: 'TRUE' | 'FALSE' | 'UNCLEAR';
  confidence: number;
  analysis: string;
  sources: string[];
}

interface FactCheck {
  id: string;
  claim: string;
  timestamp: string;
  analysis: AnalysisResult;
  stakesFor: number;
  stakesAgainst: number;
  userStake?: {
    amount: number;
    supportVerdict: boolean;
  };
}

export default function VeriChain() {
  const [claim, setClaim] = useState('');
  const [loading, setLoading] = useState(false);
  const [factChecks, setFactChecks] = useState<FactCheck[]>([]);
  const [selectedCheckId, setSelectedCheckId] = useState<string | null>(null);
  const [stakeAmount, setStakeAmount] = useState('');
  const [stakeSupport, setStakeSupport] = useState(true);
  const [walletConnected, setWalletConnected] = useState(false);
  const [userAddress, setUserAddress] = useState('');
  const [error, setError] = useState('');
  const [submitType, setSubmitType] = useState<'text' | 'image' | 'video'>('text');
  const [comingSoonMessage, setComingSoonMessage] = useState('');

  // Connect Wallet with Ethers
  const connectWallet = async () => {
    try {
      if (!window.ethereum) {
        setError('MetaMask or another Web3 wallet is required');
        return;
      }

      const provider = new ethers.BrowserProvider(window.ethereum);
      await provider.send('eth_requestAccounts', []);
      const signer = await provider.getSigner();
      const address = await signer.getAddress();

      setUserAddress(address);
      setWalletConnected(true);
      setError('');
    } catch (err: any) {
      setError(err.message || 'Failed to connect wallet');
      console.error(err);
    }
  };

  // Disconnect Wallet
  const disconnectWallet = () => {
    setWalletConnected(false);
    setUserAddress('');
  };

  // Handle Image/Video Upload
  const handleMediaUpload = (type: 'image' | 'video') => {
    setComingSoonMessage(`${type === 'image' ? '📷 Image' : '🎥 Video'} verification coming soon!`);
    setTimeout(() => setComingSoonMessage(''), 3000);
  };

  // Analyze Claim with Gemini API
  const handleAnalyzeClaim = async () => {
    if (!claim.trim()) {
      setError('Please enter a claim');
      return;
    }

    if (!walletConnected) {
      setError('Please connect your wallet first');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch(`${API_URL}/analyze`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ claim: claim.trim() }),
      });

      if (!response.ok) {
        throw new Error('Failed to analyze claim');
      }

      const data = await response.json();

      const newFactCheck: FactCheck = {
        id: Date.now().toString(),
        claim: claim.trim(),
        timestamp: new Date().toLocaleTimeString(),
        analysis: data.data,
        stakesFor: 0,
        stakesAgainst: 0,
      };

      setFactChecks([newFactCheck, ...factChecks]);
      setClaim('');
    } catch (err) {
      setError('Error analyzing claim. Make sure backend is running on localhost:3001');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Handle Staking
  const handleStake = (checkId: string) => {
    if (!stakeAmount || isNaN(Number(stakeAmount))) {
      setError('Please enter a valid stake amount');
      return;
    }

    setFactChecks((prev) =>
      prev.map((check) => {
        if (check.id === checkId) {
          const amount = Number(stakeAmount);
          return {
            ...check,
            stakesFor: stakeSupport ? check.stakesFor + amount : check.stakesFor,
            stakesAgainst: !stakeSupport ? check.stakesAgainst + amount : check.stakesAgainst,
            userStake: {
              amount,
              supportVerdict: stakeSupport,
            },
          };
        }
        return check;
      })
    );

    setStakeAmount('');
    setSelectedCheckId(null);
    setError('');
  };

  // Get verdict icon
  const getVerdictIcon = (verdict: string) => {
    if (verdict === 'TRUE') return <CheckCircle className="w-6 h-6 text-green-500" />;
    if (verdict === 'FALSE') return <AlertCircle className="w-6 h-6 text-red-500" />;
    return <HelpCircle className="w-6 h-6 text-yellow-500" />;
  };

  // Get verdict color
  const getVerdictColor = (verdict: string) => {
    if (verdict === 'TRUE') return 'bg-green-50 border-green-200';
    if (verdict === 'FALSE') return 'bg-red-50 border-red-200';
    return 'bg-yellow-50 border-yellow-200';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4 md:p-6">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <TrendingUp className="w-8 h-8 text-blue-400" />
              <h1 className="text-3xl md:text-4xl font-bold text-white">VeriChain</h1>
            </div>
            {walletConnected ? (
              <button
                onClick={disconnectWallet}
                className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-semibold transition"
              >
                <Wallet className="w-4 h-4" />
                <span className="text-sm">{userAddress.slice(0, 6)}...{userAddress.slice(-4)}</span>
              </button>
            ) : (
              <button
                onClick={connectWallet}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-semibold transition"
              >
                <Wallet className="w-4 h-4" />
                Connect Wallet
              </button>
            )}
          </div>
          <p className="text-slate-400">Decentralized misinformation detection with AI & community verification</p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        {/* Coming Soon Message */}
        {comingSoonMessage && (
          <div className="bg-blue-50 border border-blue-200 text-blue-800 px-4 py-3 rounded-lg mb-6 animate-pulse">
            {comingSoonMessage}
          </div>
        )}

        {/* Input Section */}
        {walletConnected ? (
          <div className="bg-slate-800 rounded-lg border border-slate-700 p-6 mb-8">
            {/* Tabs */}
            <div className="flex gap-2 mb-4">
              <button
                onClick={() => setSubmitType('text')}
                className={`px-4 py-2 rounded-lg font-semibold transition ${
                  submitType === 'text'
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                }`}
              >
                📝 Text
              </button>
              <button
                onClick={() => handleMediaUpload('image')}
                className="px-4 py-2 rounded-lg font-semibold transition bg-slate-700 text-slate-300 hover:bg-slate-600 flex items-center gap-2"
              >
                <Image className="w-4 h-4" /> Image
              </button>
              <button
                onClick={() => handleMediaUpload('video')}
                className="px-4 py-2 rounded-lg font-semibold transition bg-slate-700 text-slate-300 hover:bg-slate-600 flex items-center gap-2"
              >
                <Video className="w-4 h-4" /> Video
              </button>
            </div>

            {/* Text Input */}
            {submitType === 'text' && (
              <>
                <label className="block text-white font-semibold mb-3">Submit a Claim to Verify</label>
                <textarea
                  value={claim}
                  onChange={(e) => setClaim(e.target.value)}
                  placeholder="Enter a claim you want to fact-check..."
                  className="w-full bg-slate-700 text-white rounded px-4 py-3 mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  rows={3}
                />
                <button
                  onClick={handleAnalyzeClaim}
                  disabled={loading || !claim.trim()}
                  className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 text-white font-semibold py-3 rounded-lg transition flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <Loader className="w-5 h-5 animate-spin" />
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <Send className="w-5 h-5" />
                      Analyze with AI
                    </>
                  )}
                </button>
              </>
            )}
          </div>
        ) : (
          /* Centered Prompt to Connect Wallet */
          <div className="h-64 flex flex-col items-center justify-center mb-8">
            <div className="text-center">
              <Wallet className="w-16 h-16 text-slate-400 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-white mb-2">Connect Your Wallet</h2>
              <p className="text-slate-400 mb-6">You need to connect your wallet to start verifying claims</p>
              <button
                onClick={connectWallet}
                className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg font-semibold transition flex items-center gap-2 mx-auto"
              >
                <Wallet className="w-5 h-5" />
                Connect Wallet
              </button>
            </div>
          </div>
        )}

        {/* Fact Checks List */}
        <div className="space-y-4">
          {factChecks.length > 0 ? (
            factChecks.map((check) => (
              <div
                key={check.id}
                className={`rounded-lg border p-6 transition ${getVerdictColor(check.analysis.verdict)}`}
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-start gap-4 flex-1">
                    {getVerdictIcon(check.analysis.verdict)}
                    <div className="flex-1">
                      <p className="text-sm text-slate-500 mb-1">{check.timestamp}</p>
                      <h3 className="text-lg font-semibold text-slate-900">{check.claim}</h3>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-slate-900">{check.analysis.verdict}</div>
                    <div className="text-sm text-slate-600">Confidence: {check.analysis.confidence}%</div>
                  </div>
                </div>

                {/* AI Analysis */}
                <div className="bg-white bg-opacity-40 rounded p-4 mb-4">
                  <p className="text-sm text-slate-800">
                    <strong>AI Analysis:</strong> {check.analysis.analysis}
                  </p>
                  <div className="flex gap-2 mt-3 flex-wrap">
                    {check.analysis.sources.map((source, i) => (
                      <span key={i} className="inline-block bg-slate-200 text-slate-800 text-xs px-2 py-1 rounded">
                        {source}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Staking Info */}
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div className="bg-white bg-opacity-20 rounded p-3">
                    <p className="text-xs text-slate-700 mb-1">Support Verdict</p>
                    <p className="text-lg font-bold text-green-700">${check.stakesFor}</p>
                  </div>
                  <div className="bg-white bg-opacity-20 rounded p-3">
                    <p className="text-xs text-slate-700 mb-1">Dispute Verdict</p>
                    <p className="text-lg font-bold text-red-700">${check.stakesAgainst}</p>
                  </div>
                </div>

                {/* User Stake Display */}
                {check.userStake && (
                  <div className="bg-white bg-opacity-20 rounded p-3 mb-4">
                    <p className="text-sm text-slate-800">
                      <strong>Your Stake:</strong> ${check.userStake.amount}{' '}
                      {check.userStake.supportVerdict ? '✅ (Supporting)' : '❌ (Disputing)'}
                    </p>
                  </div>
                )}

                {/* Staking Section */}
                {selectedCheckId === check.id ? (
                  <div className="space-y-3">
                    <input
                      type="number"
                      value={stakeAmount}
                      onChange={(e) => setStakeAmount(e.target.value)}
                      placeholder="Amount to stake"
                      className="w-full bg-white bg-opacity-20 text-slate-900 rounded px-3 py-2 text-sm placeholder-slate-600"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setStakeSupport(true);
                          handleStake(check.id);
                        }}
                        className="flex-1 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded text-sm font-semibold transition"
                      >
                        Support ✅
                      </button>
                      <button
                        onClick={() => {
                          setStakeSupport(false);
                          handleStake(check.id);
                        }}
                        className="flex-1 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded text-sm font-semibold transition"
                      >
                        Dispute ❌
                      </button>
                      <button
                        onClick={() => setSelectedCheckId(null)}
                        className="flex-1 bg-slate-400 hover:bg-slate-500 text-white px-4 py-2 rounded text-sm font-semibold transition"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => setSelectedCheckId(check.id)}
                    className="w-full bg-slate-600 hover:bg-slate-700 text-white py-2 rounded text-sm font-semibold transition"
                  >
                    Add Your Stake
                  </button>
                )}
              </div>
            ))
          ) : walletConnected ? (
            <div className="text-center text-slate-400 py-12">
              <p>Submit a claim to get started</p>
            </div>
          ) : null}
        </div>

        {/* Footer Info */}
        <div className="mt-12 text-center text-slate-500 text-sm">
          <p>Backend: http://localhost:3001 | Smart Contracts: Sepolia Testnet</p>
        </div>
      </div>
    </div>
  );
}