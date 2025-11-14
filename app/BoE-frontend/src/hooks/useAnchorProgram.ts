import { useMemo } from 'react'
import { useConnection, useWallet } from '@solana/wallet-adapter-react'
import { AnchorProvider, Program } from '@coral-xyz/anchor'
import idl from '../idl/boe_program.json'

export const useAnchorProgram = () => {
  const { connection } = useConnection()
  const wallet = useWallet()

  const program = useMemo(() => {
    if (!wallet.publicKey || !wallet.signTransaction) return null

    try {
      const walletWithSignAll = {
        ...wallet,
        signAllTransactions: wallet.signAllTransactions || (async (txs) => Promise.all(txs.map(tx => wallet.signTransaction!(tx))))
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const provider = new AnchorProvider(connection, walletWithSignAll as any, {
        commitment: 'confirmed',
      })

      return new Program(idl, provider)
    } catch (error) {
      console.error('Failed to create Anchor program:', error)
      return null
    }
  }, [connection, wallet])

  return program
}