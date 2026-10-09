import { useMemo } from 'react'
import { useConnection, useWallet } from '@solana/wallet-adapter-react'
import { AnchorProvider, Program } from '@coral-xyz/anchor'
import type { BN, Idl } from '@coral-xyz/anchor'
import type { PublicKey } from '@solana/web3.js'
import idl from '../idl/boe_program.json'

export interface TeamData {
  coach: PublicKey
  players: PublicKey[]
}

export interface PlayerData {
  tokens: BN
  lastActive: BN
}

// JSON imports widen IDL names to strings, so describe the accounts we read.
type BoeProgram = Program<Idl> & {
  account: {
    team: { fetch(address: PublicKey): Promise<TeamData> }
    player: { fetch(address: PublicKey): Promise<PlayerData> }
  }
}

export const useAnchorProgram = () => {
  const { connection } = useConnection()
  const wallet = useWallet()

  const program = useMemo(() => {
    const { publicKey, signTransaction, signAllTransactions } = wallet
    if (!publicKey || !signTransaction) return null

    try {
      const provider = new AnchorProvider(connection, {
        publicKey,
        signTransaction,
        signAllTransactions: signAllTransactions || (async (transactions) =>
          Promise.all(transactions.map(transaction => signTransaction(transaction)))),
      }, {
        commitment: 'confirmed',
      })

      return new Program(idl, provider) as BoeProgram
    } catch (error) {
      console.error('Failed to create Anchor program:', error)
      return null
    }
  }, [connection, wallet])

  return program
}
