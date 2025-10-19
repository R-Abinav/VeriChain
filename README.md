# VeriChain: Decentralized Claim Verification with Incentivized Community & AI

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Solidity](https://img.shields.io/badge/Solidity-0.8.20-blue.svg)](https://soliditylang.org/)
[![React](https://img.shields.io/badge/React-19.1.1-blue.svg)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9.3-blue.svg)](https://www.typescriptlang.org/)

**A Decentralized, Agentic AI-Powered Misinformation Detection Platform**

VeriChain combines agentic AI with community-driven verification to create an immutable, decentralized database of verified information. Built on blockchain technology, it serves as a verification layer that platforms can query via API rather than being a standalone social platform.

## 🌟 Overview

VeriChain is a decentralized verification protocol combining community consensus, economic incentives, and AI analysis to create a portable verification layer. Rather than building another social platform, VeriChain serves as verification infrastructure that any platform can integrate via API.

### The Problem
- **Verification Gap**: Misinformation spreads before fact-checking catches it. No universal trust mechanism exists across platforms.
- **Incentive Misalignment**: Fact-checkers aren't compensated. Platforms profit from engagement, not accuracy.
- **Fragmentation**: Every platform fact-checks independently, duplicating work and creating inconsistent trust models.

### The Solution
VeriChain creates a decentralized marketplace where specialized AI agents verify claims and communities stake capital to vote on accuracy. Agents earn compensation for accurate work, creating sustainable economic incentives.

## 🚀 How It Works

1. **Claim Submission**: Users stake ETH to submit claims, preventing spam.
2. **AI Verification**: Specialized agents analyze claims (text logic, image authenticity, source credibility, citation accuracy). Each agent gets compensated.
3. **Community Voting**: Users stake ETH to vote TRUE/FALSE. Correct voters earn rewards; incorrect voters lose a small penalty.
4. **Consensus**: Final verdict weighs community votes 70% and AI analysis 30%. If they conflict, result = UNCLEAR.
5. **Immutable Record**: Verdict stored on blockchain. Any platform queries via API instead of fact-checking independently.
6. **Rewards**: Correct voters and accurate agents earn from verification fees. Protocol takes a cut for infrastructure.

## 🏗️ Architecture

### Smart Contracts
- **FactCheckRegistry**: Manages claims, AI analysis, and verdicts
- **StakePool**: Handles token deposits, staking, rewards, and penalties

### Backend Services
- **Express.js API**: RESTful endpoints for claim analysis
- **Gemini AI Integration**: Google's Gemini 2.5 Pro for fact-checking
- **TypeScript**: Full type safety and modern development

### Frontend Application
- **React 19**: Modern UI with hooks and functional components
- **Ethers.js**: Web3 integration for blockchain interactions
- **Tailwind CSS**: Responsive design with gradient themes
- **MetaMask Integration**: Wallet connection and transaction signing

## 📁 Project Structure

```
veriChain/
├── web3/                    # Smart contracts and blockchain logic
│   ├── contracts/           # Solidity smart contracts
│   │   ├── FactCheckRegistry.sol
│   │   └── StakePool.sol
│   ├── scripts/            # Deployment scripts
│   │   ├── deploy.ts
│   │   └── checkOwner.ts
│   ├── test/               # Contract tests
│   │   └── FactCheckRegistry_StakePool.test.ts
│   ├── artifacts/          # Compiled contracts
│   ├── cache/              # Hardhat cache
│   ├── typechain-types/    # TypeScript bindings
│   ├── hardhat.config.ts   # Hardhat configuration
│   └── package.json
├── backend/                 # API server and AI integration
│   ├── src/
│   │   ├── config/         # Environment configuration
│   │   │   └── env.config.ts
│   │   ├── routes/         # API routes
│   │   │   └── analyze.routes.ts
│   │   ├── services/       # Business logic (Gemini AI)
│   │   │   └── gemini.service.ts
│   │   ├── types/          # TypeScript type definitions
│   │   │   └── index.ts
│   │   └── index.ts        # Express server
│   ├── dist/               # Compiled JavaScript
│   ├── package.json
│   └── tsconfig.json
└── frontend/               # React frontend
    ├── src/
    │   ├── App.tsx         # Main application component
    │   ├── main.jsx        # React entry point
    │   ├── index.css       # Global styles
    │   └── vite-env.d.ts   # Vite type definitions
    ├── public/             # Static assets
    ├── package.json
    ├── vite.config.js      # Vite configuration
    ├── tailwind.config.js  # Tailwind CSS config
    └── postcss.config.js   # PostCSS configuration
```

## 🛠️ Setup & Installation

### Prerequisites
- Node.js (v18+)
- npm or yarn
- MetaMask wallet
- Sepolia ETH for testing
- Google Gemini API key

### 1. Clone the Repository
```bash
git clone <repository-url>
cd veriChain
```

### 2. Environment Setup

Create `.env` files in both `web3/` and `backend/` directories:

**web3/.env**
```env
SEPOLIA_RPC_URL=https://sepolia.infura.io/v3/YOUR_INFURA_KEY
PRIVATE_KEY=your_wallet_private_key
```

**backend/.env**
```env
GEMINI_API_KEY=your_gemini_api_key
PORT=3001
NODE_ENV=development
```

**frontend/.env**
```env
VITE_API_URL=http://localhost:3001
VITE_FACT_CHECK_REGISTRY_ADDRESS=your_deployed_registry_address
VITE_STAKE_POOL_ADDRESS=your_deployed_stake_pool_address
```

### 3. Smart Contracts Setup

```bash
cd web3
npm install
npx hardhat compile
npx hardhat test
```

### 4. Deploy Contracts

```bash
# Deploy to Sepolia testnet
npx hardhat run scripts/deploy.ts --network sepolia
```

Save the deployed contract addresses for your frontend configuration.

### 5. Backend Setup

```bash
cd ../backend
npm install
npm run build
npm start
```

The backend will start on `http://localhost:3001`

### 6. Frontend Setup

```bash
cd ../frontend
npm install
npm run dev
```

The frontend will start on `http://localhost:5173`

## 🧪 Testing

### Smart Contract Tests
```bash
cd web3
npx hardhat test
```

### Backend API Tests
```bash
cd backend
# Start the server
npm start

# Test endpoints
curl http://localhost:3001/api/health
curl -X POST http://localhost:3001/api/analyze \
  -H "Content-Type: application/json" \
  -d '{"claim": "The Earth is flat"}'
```

### Frontend Testing
```bash
cd frontend
npm run dev
# Open http://localhost:5173 in your browser
```

## 🔄 Workflow

1. **Claim Submission**: User submits a claim via frontend or API
2. **AI Analysis**: Gemini AI analyzes the claim and provides confidence score
3. **Community Staking**: Users deposit ETH and stake on verdict accuracy
4. **Verdict Finalization**: System combines AI confidence with community consensus
5. **On-Chain Recording**: Final verdict and all stakes recorded immutably on blockchain

## 🎯 Verdict Logic

The platform uses a sophisticated decision-making process:

- **TRUE**: AI confident (≥70%) AND community votes TRUE AND stakes not close
- **FALSE**: AI not confident (<70%) AND community votes FALSE AND stakes not close  
- **UNCLEAR**: Close stakes OR conflicting AI/community signals

### Smart Contract Logic
```solidity
bool communityVotesTRUE = check.stakesFor > check.stakesAgainst;
bool aiVotesTRUE = check.confidenceScore >= thresholdValueForAi;

// Check if stakes are close (within 20% difference)
uint256 totalStakes = check.stakesFor + check.stakesAgainst;
bool stakesAreClose = totalStakes > 0 && 
    (check.stakesFor * 100 / totalStakes > 40 && check.stakesFor * 100 / totalStakes < 60);

// Final verdict logic
if(aiVotesTRUE && communityVotesTRUE && !stakesAreClose){
    check.verdict = Verdict.TRUE;
}
else if(!aiVotesTRUE && !communityVotesTRUE && !stakesAreClose){
    check.verdict = Verdict.FALSE;
}
else{
    check.verdict = Verdict.UNCLEAR;
}
```

## 🔧 API Endpoints

### Health Check
```
GET /api/health
```

### Analyze Claim
```
POST /api/analyze
Content-Type: application/json

{
  "claim": "Your claim here"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "verdict": "TRUE|FALSE|UNCLEAR",
    "confidence": 85,
    "analysis": "Brief explanation of reasoning",
    "sources": ["Source 1", "Source 2"]
  }
}
```

### Batch Analysis
```
POST /api/analyze/batch
Content-Type: application/json

{
  "claims": ["claim1", "claim2", "claim3"]
}
```

## 🏛️ Smart Contract Details

### FactCheckRegistry Contract

**Key Functions:**
- `submitFactCheck(string _claim, string _aiAnalysis, uint8 _confidenceScore)`: Submit a new claim
- `addStake(uint256 _id, bool _supportVerdict, uint256 _amount)`: Stake on a claim
- `finalizeVerdict(uint256 _id)`: Finalize verdict (owner only)
- `getFactCheck(uint256 _id)`: Get claim details
- `getStakes(uint256 _id)`: Get all stakes for a claim

**Events:**
- `FactCheckSubmitted`: Emitted when a claim is submitted
- `StakeAdded`: Emitted when a stake is added
- `VerdictFinalized`: Emitted when verdict is finalized

### StakePool Contract

**Key Functions:**
- `deposit()`: Deposit ETH to stake pool
- `withdraw(uint256 _amount)`: Withdraw ETH from stake pool
- `lockTokensForStake(address _user, uint256 _amount)`: Lock tokens for staking
- `unlockTokens(address _user, uint256 _amount)`: Unlock tokens after staking
- `claimRewards(address _user, uint256 _stakedAmount)`: Claim staking rewards
- `applyPenalty(address _user, uint256 _stakedAmount)`: Apply penalty for wrong votes

**Reward System:**
- Correct voters earn 10% reward
- Incorrect voters lose 5% penalty
- Tokens are locked during active staking

## 🎨 Frontend Features

### User Interface
- **Modern Design**: Gradient backgrounds with glassmorphism effects
- **Responsive Layout**: Works on desktop and mobile devices
- **Real-time Updates**: Live staking and verdict updates
- **Wallet Integration**: MetaMask connection with balance display

### Key Components
- **Landing Page**: Welcome screen with wallet connection
- **Claim Submission**: Text area for submitting new claims
- **Voting Interface**: Staking interface with support/dispute options
- **Claim Display**: Real-time claim status and staking information
- **Balance Management**: Deposit/withdraw from stake pool

### State Management
- React hooks for state management
- Ethers.js for blockchain interactions
- Real-time balance updates
- Error handling and user feedback

## 🚀 Deployment

### Smart Contracts
```bash
cd web3
npx hardhat run scripts/deploy.ts --network sepolia
```

### Backend
```bash
cd backend
npm run build
npm start
```

### Frontend
```bash
cd frontend
npm run build
# Deploy dist/ folder to your hosting service
```

## 🔮 Current Implementation

We've deployed a working prototype on Sepolia testnet with:

- ✅ **Smart Contracts**: FactCheckRegistry and StakePool deployed and tested
- ✅ **React dApp**: Full-featured frontend with wallet integration
- ✅ **AI Integration**: Gemini 2.5 Pro providing preliminary verdicts
- ✅ **Staking Mechanisms**: Real ETH staking with rewards and penalties
- ✅ **Immutable Records**: All verification data stored on blockchain
- ✅ **API Infrastructure**: RESTful API for claim analysis

This proves the core concept works and demonstrates scalability potential.

## 🎯 Why This Works

Traditional fact-checking can't scale. AI-only solutions lack context. Reddit-style voting gets gamed. VeriChain combines all three:

- **Human Judgment**: Catches nuance and context
- **AI Analysis**: Prevents attacks and provides consistency
- **Economic Stakes**: Makes gaming expensive
- **Blockchain Transparency**: Auditable and immutable

## 🏆 Key Advantages

- **Portable**: Platforms integrate via API—no need to build their own verification system
- **Sustainable**: Agents earning money creates permanent incentive to improve accuracy
- **Decentralized**: No single entity controls verification; multiple agents compete
- **Anti-Gaming**: Attacking requires controlling most capital AND fooling AI AND manipulating community
- **Transparent**: Every verification shows which agents analyzed it and why

## 🎯 Target Market

- **DAOs**: Governance verification and proposal fact-checking
- **Crypto Communities**: Social media misinformation detection
- **News Organizations**: Fact-checking infrastructure
- **Decentralized Social Networks**: Content verification layer
- **Enterprises**: Internal claim verification systems

## 💰 Business Model

- **Verification Fees**: Per-claim analysis fees
- **Agent Compensation**: Based on accuracy and performance
- **Enterprise API**: Licensing for large-scale integrations
- **Data Access**: Research and analytics for academic institutions

## 🔮 Future Roadmap

- **Decentralized Oracle**: Evolve into a fully decentralized oracle for misinformation detection
- **Platform Integration**: API integrations with Twitter, Reddit, news aggregators
- **Advanced AI Models**: Integration with multiple AI providers for enhanced accuracy
- **Governance Token**: Community governance for platform parameters
- **Cross-Chain Support**: Expand to multiple blockchain networks
- **Image/Video Analysis**: Multi-modal fact-checking capabilities
- **Reputation System**: Agent reputation based on historical accuracy

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🔗 Links

- **Presentation**: https://www.canva.com/design/DAG2DtXAqic/4J_Ia01bA7rJYezofOWLXA/edit

## 🙏 Acknowledgments

- **Google Gemini AI** for providing the AI analysis capabilities
- **Hardhat framework** for smart contract development
- **Express.js** for the backend API
- **React & Vite** for the frontend framework
- **Ethers.js** for Web3 integration
- **Tailwind CSS** for styling
- **The Web3 community** for inspiration and support

## 🛡️ Security Considerations

- **Smart Contract Audits**: Contracts should be audited before mainnet deployment
- **API Rate Limiting**: Implement rate limiting for AI analysis endpoints
- **Input Validation**: All user inputs are validated and sanitized
- **Private Key Security**: Never commit private keys to version control
- **Environment Variables**: Use secure environment variable management


---

**Built with ❤️ by Team Baked**

*Decentralized verification for a more truthful world.*