import { useState } from 'react'
import { useWallet } from '@solana/wallet-adapter-react'
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui'
import { Keypair, PublicKey, SystemProgram } from '@solana/web3.js'
import { useAnchorProgram } from './hooks/useAnchorProgram'
import './App.css'

const PROGRAM_ID = new PublicKey('2D8rWNeqJENDSjT2vEpWGcQjc4tcYArccEGtcrgBduMQ')

function App() {
  const { publicKey } = useWallet()
  const program = useAnchorProgram()
  const [loading, setLoading] = useState(false)
  const [teamCode, setTeamCode] = useState('')
  const [leaveCode, setLeaveCode] = useState('')
  const [kickPlayer, setKickPlayer] = useState('')
  const [kickTeamCode, setKickTeamCode] = useState('')
  const [logComment, setLogComment] = useState('')
  const [logTeamCode, setLogTeamCode] = useState('')
  const [logPlayer, setLogPlayer] = useState('')
  const [userRole, setUserRole] = useState<'coach' | 'player' | null>(null)
  const [teamData, setTeamData] = useState<any>(null)
  const [playerData, setPlayerData] = useState<any>(null)
  const [fetchCode, setFetchCode] = useState('')
  const [error, setError] = useState('')

  const createTeam = async () => {
    if (!publicKey || !program) return

    setLoading(true)
    setError('')
    try {
      const code = Array.from({ length: 6 }, () => String.fromCharCode(65 + Math.floor(Math.random() * 26))).join('')
      const codeBytes = new Uint8Array(code.split('').map(c => c.charCodeAt(0)))
      const [teamAddress] = PublicKey.findProgramAddressSync([new TextEncoder().encode('team'), codeBytes], PROGRAM_ID)

      const tx = await program.methods
        .createTeam(Array.from(codeBytes))
        .accounts({
          team: teamAddress,
          coach: publicKey,
          system_program: SystemProgram.programId,
        })
        .rpc()

      setError(`Team created successfully! Code: ${code}`)
    } catch (error) {
      setError('Error creating team: ' + (error as Error).message)
    }
    setLoading(false)
  }

  const joinTeam = async (code: string) => {
    if (!publicKey || !program || !code) return

    setLoading(true)
    setError('')
    try {
      const codeBytes = new Uint8Array(code.split('').map(c => c.charCodeAt(0)))
      const [teamKey] = PublicKey.findProgramAddressSync([new TextEncoder().encode('team'), codeBytes], PROGRAM_ID)
      const [playerKey] = PublicKey.findProgramAddressSync([new TextEncoder().encode('player'), publicKey.toBytes()], PROGRAM_ID)

      const tx = await program.methods
        .joinTeam(Array.from(codeBytes))
        .accounts({
          team: teamKey,
          player: playerKey,
          playerSigner: publicKey,
        })
        .rpc()

      setError(`Successfully joined team!`)
    } catch (error) {
      setError('Error joining team: ' + (error as Error).message)
    }
    setLoading(false)
  }

  const leaveTeam = async () => {
    if (!publicKey || !program || !leaveCode) return

    setLoading(true)
    setError('')
    try {
      const codeBytes = new Uint8Array(leaveCode.split('').map(c => c.charCodeAt(0)))
      const [teamKey] = PublicKey.findProgramAddressSync([new TextEncoder().encode('team'), codeBytes], PROGRAM_ID)
      const [playerKey] = PublicKey.findProgramAddressSync([new TextEncoder().encode('player'), publicKey.toBytes()], PROGRAM_ID)

      const tx = await program.methods
        .leaveTeam()
        .accounts({
          team: teamKey,
          player: playerKey,
          playerSigner: publicKey,
        })
        .rpc()

      setError(`Successfully left team!`)
    } catch (error) {
      setError('Error leaving team: ' + (error as Error).message)
    }
    setLoading(false)
  }

  const kickPlayerFunc = async () => {
    if (!publicKey || !program || !kickPlayer || !kickTeamCode) return

    setLoading(true)
    setError('')
    try {
      const codeBytes = new Uint8Array(kickTeamCode.split('').map(c => c.charCodeAt(0)))
      const [teamKey] = PublicKey.findProgramAddressSync([new TextEncoder().encode('team'), codeBytes], PROGRAM_ID)
      const playerPubkey = new PublicKey(kickPlayer)
      const [playerKey] = PublicKey.findProgramAddressSync([new TextEncoder().encode('player'), playerPubkey.toBytes()], PROGRAM_ID)

      const tx = await program.methods
        .kickPlayer()
        .accounts({
          team: teamKey,
          player: playerKey,
          coach: publicKey,
        })
        .rpc()

      setError(`Player kicked!`)
    } catch (error) {
      setError('Error kicking player: ' + (error as Error).message)
    }
    setLoading(false)
  }

  const logAttendance = async () => {
    if (!publicKey || !program || !logTeamCode || !logPlayer || !logComment) return

    setLoading(true)
    setError('')
    try {
      const codeBytes = new Uint8Array(logTeamCode.split('').map(c => c.charCodeAt(0)))
      const [teamKey] = PublicKey.findProgramAddressSync([new TextEncoder().encode('team'), codeBytes], PROGRAM_ID)
      const playerPubkey = new PublicKey(logPlayer)
      const [playerKey] = PublicKey.findProgramAddressSync([new TextEncoder().encode('player'), playerPubkey.toBytes()], PROGRAM_ID)
      const logKeypair = Keypair.generate()

      const tx = await program.methods
        .logAttendance(logComment)
        .accounts({
          log: logKeypair.publicKey,
          team: teamKey,
          player: playerKey,
          signer: publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([logKeypair])
        .rpc()

      setError(`Attendance logged!`)
    } catch (error) {
      setError('Error logging attendance: ' + (error as Error).message)
    }
    setLoading(false)
  }

  const logSkill = async () => {
    if (!publicKey || !program || !logTeamCode || !logPlayer || !logComment) return

    setLoading(true)
    setError('')
    try {
      const codeBytes = new Uint8Array(logTeamCode.split('').map(c => c.charCodeAt(0)))
      const [teamKey] = PublicKey.findProgramAddressSync([new TextEncoder().encode('team'), codeBytes], PROGRAM_ID)
      const playerPubkey = new PublicKey(logPlayer)
      const [playerKey] = PublicKey.findProgramAddressSync([new TextEncoder().encode('player'), playerPubkey.toBytes()], PROGRAM_ID)
      const logKeypair = Keypair.generate()

      const tx = await program.methods
        .logSkill(logComment)
        .accounts({
          log: logKeypair.publicKey,
          team: teamKey,
          player: playerKey,
          signer: publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([logKeypair])
        .rpc()

      setError(`Skill logged!`)
    } catch (error) {
      setError('Error logging skill: ' + (error as Error).message)
    }
    setLoading(false)
  }

  const fetchTeam = async () => {
    if (!program || !fetchCode) return

    try {
      const codeBytes = new Uint8Array(fetchCode.split('').map(c => c.charCodeAt(0)))
      const [teamKey] = PublicKey.findProgramAddressSync([new TextEncoder().encode('team'), codeBytes], PROGRAM_ID)
      const team = await (program.account as any).Team.fetch(teamKey)
      setTeamData(team)
      setError(`Team fetched: Coach ${team.coach}, Players: ${team.players.length}`)
    } catch (error) {
      setError('Error fetching team: ' + (error as Error).message)
    }
  }

  const fetchPlayer = async () => {
    if (!program || !publicKey) return

    try {
      const [playerKey] = PublicKey.findProgramAddressSync([new TextEncoder().encode('player'), publicKey.toBytes()], PROGRAM_ID)
      const player = await (program.account as any).Player.fetch(playerKey)
      setPlayerData(player)
      setError(`Player tokens: ${player.tokens}`)
    } catch (error) {
      setError('Error fetching player: ' + (error as Error).message)
    }
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1>Battle of Elements</h1>
        <WalletMultiButton />
      </header>

      <main className="app-main">
        {error && <div className="error">{error}</div>}

        {publicKey ? (
          <div className="dashboard">
            <section className="section">
              <h2>Wallet Connected!</h2>
              <p><strong>Address:</strong> {publicKey.toString()}</p>
              <p><strong>Program loaded:</strong> {program ? 'Yes' : 'No'}</p>
            </section>

            <section className="section">
              <h2>Select Role</h2>
              <div className="actions">
                <button onClick={() => setUserRole('coach')} className="role-btn">
                  Coach
                </button>
                <button onClick={() => setUserRole('player')} className="role-btn">
                  Player
                </button>
              </div>
            </section>

            {userRole === 'coach' && (
              <section className="section">
                <h2>Coach Actions</h2>
                <div className="actions">
                  <button onClick={createTeam} disabled={loading} className="create-team">
                    {loading ? 'Creating...' : 'Create Team'}
                  </button>
                </div>

                <div className="fetch-team">
                  <input
                    type="text"
                    placeholder="Team code to fetch"
                    value={fetchCode}
                    onChange={(e) => setFetchCode(e.target.value.toUpperCase())}
                  />
                  <button onClick={fetchTeam} disabled={!fetchCode}>
                    Fetch Team
                  </button>
                </div>

                {teamData && (
                  <div className="team-info">
                    <p><strong>Coach:</strong> {teamData.coach.toString()}</p>
                    <p><strong>Players:</strong></p>
                    <ul>
                      {teamData.players.map((p: any, i: number) => (
                        <li key={i}>{p.toString()}</li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="kick-player">
                  <input
                    type="text"
                    placeholder="Team code"
                    value={kickTeamCode}
                    onChange={(e) => setKickTeamCode(e.target.value.toUpperCase())}
                  />
                  <input
                    type="text"
                    placeholder="Player pubkey"
                    value={kickPlayer}
                    onChange={(e) => setKickPlayer(e.target.value)}
                  />
                  <button onClick={kickPlayerFunc} disabled={loading || !kickTeamCode || !kickPlayer}>
                    Kick Player
                  </button>
                </div>

                <div className="log-action">
                  <input
                    type="text"
                    placeholder="Team code"
                    value={logTeamCode}
                    onChange={(e) => setLogTeamCode(e.target.value.toUpperCase())}
                  />
                  <input
                    type="text"
                    placeholder="Player pubkey"
                    value={logPlayer}
                    onChange={(e) => setLogPlayer(e.target.value)}
                  />
                  <input
                    type="text"
                    placeholder="Comment"
                    value={logComment}
                    onChange={(e) => setLogComment(e.target.value)}
                  />
                  <button onClick={logAttendance} disabled={loading || !logTeamCode || !logPlayer || !logComment}>
                    Log Attendance
                  </button>
                  <button onClick={logSkill} disabled={loading || !logTeamCode || !logPlayer || !logComment}>
                    Log Skill
                  </button>
                </div>
              </section>
            )}

            {userRole === 'player' && (
              <section className="section">
                <h2>Player Actions</h2>
                <div className="actions">
                  <button onClick={fetchPlayer}>
                    Fetch My Tokens
                  </button>
                </div>

                {playerData && (
                  <div className="player-info">
                    <p><strong>Tokens:</strong> {playerData.tokens}</p>
                    <p><strong>Last Active:</strong> {new Date(playerData.lastActive * 1000).toLocaleString()}</p>
                  </div>
                )}

                <div className="join-team">
                  <input
                    type="text"
                    placeholder="Enter team code"
                    value={teamCode}
                    onChange={(e) => setTeamCode(e.target.value.toUpperCase())}
                  />
                  <button onClick={() => joinTeam(teamCode)} disabled={loading || !teamCode}>
                    Join Team
                  </button>
                </div>

                <div className="leave-team">
                  <input
                    type="text"
                    placeholder="Team code to leave"
                    value={leaveCode}
                    onChange={(e) => setLeaveCode(e.target.value.toUpperCase())}
                  />
                  <button onClick={leaveTeam} disabled={loading || !leaveCode}>
                    Leave Team
                  </button>
                </div>
              </section>
            )}
          </div>
        ) : (
          <div className="connect-wallet">
            <h2>Please connect your wallet to continue</h2>
            <p>Use the button above to connect your Phantom wallet.</p>
          </div>
        )}
      </main>
    </div>
  )
}

export default App
