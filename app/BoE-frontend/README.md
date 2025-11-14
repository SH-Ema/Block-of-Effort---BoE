# Battle of Elements Frontend

A React-based frontend for the Battle of Elements Solana program, allowing users to create and join teams using their Solana wallet.

## Features

- Connect Solana wallet (Phantom)
- Create teams with generated codes
- Join teams using team codes
- Modern UI with responsive design

## Tech Stack

- React 19
- TypeScript
- Vite
- Solana Web3.js
- Anchor framework
- Wallet Adapter

## Getting Started

1. Install dependencies:
   ```bash
   npm install
   ```

2. Start development server:
   ```bash
   npm run dev
   ```

3. Build for production:
   ```bash
   npm run build
   ```

## Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

## Configuration

The app connects to Solana Devnet by default. Update the network in `src/main.tsx` if needed.

## Program Integration

The frontend interacts with the Battle of Elements Anchor program deployed on Solana.
