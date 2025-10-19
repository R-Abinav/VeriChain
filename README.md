# VeriChain 

**A Decentralized, Agentic AI-Powered Misinformation Detection Platform**

VeriChain combines agentic AI with community-driven verification to create an immutable, decentralized database of verified information. Built on blockchain technology, it serves as a verification layer that platforms can query via API rather than being a standalone social platform.

## 🌟 Overview

VeriChain is a misinformation detection platform.

## 🚀 Features

### Core Functionality
- **Claim Submission**: Users submit claims or articles for verification
- **AI Analysis**: Gemini AI provides confidence scores and fact-checking results
- **Community Staking**: Users stake ETH on verdict accuracy with financial incentives
- **Verdict Finalization**: Combines AI confidence with community consensus
- **On-Chain Proof**: Immutable record of all verification data

### Smart Contracts
- **FactCheckRegistry**: Manages claims, AI analysis, and verdicts
- **StakePool**: Handles token deposits, staking, rewards, and penalties

## 📁 Project Structure

```
veriChain/
├── web3/                    # Smart contracts and blockchain logic
│   ├── contracts/           # Solidity smart contracts
│   ├── scripts/            # Deployment scripts
│   ├── test/               # Contract tests
│   └── hardhat.config.ts   # Hardhat configuration
├── backend/                 # API server and AI integration
│   ├── src/
│   │   ├── config/         # Environment configuration
│   │   ├── routes/         # API routes
│   │   ├── services/       # Business logic (Gemini AI)
│   │   └── types/          # TypeScript type definitions
│   └── package.json
└── frontend/               # React frontend (coming soon)
```

## 🛠️ Setup & Installation

### Prerequisites
- Node.js (v18+)
- npm or yarn
- MetaMask wallet
- Sepolia ETH for testing

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

### 3. Smart Contracts Setup

```bash
cd web3
npm install
npx hardhat compile
npx hardhat test
```

### 4. Backend Setup

```bash
cd ../backend
npm install
npm run build
npm start
```

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

### Batch Analysis
```
POST /api/analyze/batch
Content-Type: application/json

{
  "claims": ["claim1", "claim2", "claim3"]
}
```

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

## 🔮 Future Roadmap

- **Decentralized Oracle**: Evolve into a fully decentralized oracle for misinformation detection
- **Platform Integration**: API integrations with Twitter, Reddit, news aggregators
- **Advanced AI Models**: Integration with multiple AI providers for enhanced accuracy
- **Governance Token**: Community governance for platform parameters
- **Cross-Chain Support**: Expand to multiple blockchain networks

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🔗 Links

- **Demo**: [Coming Soon]
- **Documentation**: [Coming Soon]
- **Discord**: [Coming Soon]
- **Twitter**: [Coming Soon]

## 🙏 Acknowledgments

- Google Gemini AI for providing the AI analysis capabilities
- Hardhat framework for smart contract development
- Express.js for the backend API
- The Web3 community for inspiration and support

---

**Built with ❤️ by Hong Kao**
