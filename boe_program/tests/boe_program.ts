import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { BoeProgram } from "../target/types/boe_program";
import { assert } from "chai";

describe("boe_program", () => {
  // Configure the client to use the local cluster.
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.boeProgram as Program<BoeProgram>;

  let teamKeypair: anchor.web3.Keypair;
  let playerSigner: anchor.web3.Keypair;
  let playerPda: anchor.web3.PublicKey;

  it("Creates a team!", async () => {
    // Wait for validator to be ready
    await new Promise(resolve => setTimeout(resolve, 5000));
    teamKeypair = anchor.web3.Keypair.generate();
    const code = Array.from({ length: 6 }, () => Math.floor(Math.random() * 256));

    const tx = await program.methods
      .createTeam(code)
      .accounts({
        team: teamKeypair.publicKey,
        coach: provider.publicKey,
      })
      .signers([teamKeypair])
      .rpc();

    console.log("CreateTeam tx signature:", tx);

    const teamAccount = await program.account.team.fetch(teamKeypair.publicKey);
    assert.equal(teamAccount.coach.toBase58(), provider.publicKey.toBase58());
    assert.deepEqual(teamAccount.code, code);
    assert.equal(teamAccount.players.length, 0);
  });

  it("Joins a team!", async () => {
    playerSigner = anchor.web3.Keypair.generate();

    // Airdrop SOL to player signer for rent
    await provider.connection.confirmTransaction(
      await provider.connection.requestAirdrop(playerSigner.publicKey, 1 * anchor.web3.LAMPORTS_PER_SOL)
    );

    [playerPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("player"), playerSigner.publicKey.toBuffer()],
      program.programId
    );

    const teamAccountBefore = await program.account.team.fetch(teamKeypair.publicKey);
    assert.equal(teamAccountBefore.players.length, 0);

    const teamCode = teamAccountBefore.code;

    const tx = await program.methods
      .joinTeam(teamCode)
      .accounts({
        team: teamKeypair.publicKey,
        playerSigner: playerSigner.publicKey,
      })
      .signers([playerSigner])
      .rpc();

    console.log("JoinTeam tx signature:", tx);

    const teamAccount = await program.account.team.fetch(teamKeypair.publicKey);
    const playerAccount = await program.account.player.fetch(playerPda);

    assert.include(
      teamAccount.players.map((p) => p.toBase58()),
      playerSigner.publicKey.toBase58()
    );
    assert.include(
      playerAccount.teams.map((t) => t.toBase58()),
      teamKeypair.publicKey.toBase58()
    );
  });

  it("Logs attendance", async () => {
    const logKeypair = anchor.web3.Keypair.generate();
    const comment = "Attended training";

    const tx = await program.methods
      .logAttendance(comment)
      .accounts({
        log: logKeypair.publicKey,
        team: teamKeypair.publicKey,
        player: playerPda,
        signer: playerSigner.publicKey,
      })
      .signers([logKeypair, playerSigner])
      .rpc();

    console.log("LogAttendance tx signature:", tx);

    const playerAccount = await program.account.player.fetch(playerPda);
    assert.equal(playerAccount.tokens.toNumber(), 2);
  });

  it("Logs skill", async () => {
    const logKeypair = anchor.web3.Keypair.generate();
    const comment = "Scored a goal";

    const tx = await program.methods
      .logSkill(comment)
      .accounts({
        log: logKeypair.publicKey,
        team: teamKeypair.publicKey,
        player: playerPda,
        signer: provider.publicKey, // coach
      })
      .signers([logKeypair])
      .rpc();

    console.log("LogSkill tx signature:", tx);

    const playerAccount = await program.account.player.fetch(playerPda);
    assert.equal(playerAccount.tokens.toNumber(), 7); // 2 from attendance + 5 from skill
  });

  it("Leaves a team", async () => {
    const tx = await program.methods
      .leaveTeam()
      .accounts({
        team: teamKeypair.publicKey,
        player: playerPda,
        playerSigner: playerSigner.publicKey,
      })
      .signers([playerSigner])
      .rpc();

    console.log("LeaveTeam tx signature:", tx);

    const teamAccount = await program.account.team.fetch(teamKeypair.publicKey);
    const playerAccount = await program.account.player.fetch(playerPda);

    assert.notInclude(
      teamAccount.players.map((p) => p.toBase58()),
      playerSigner.publicKey.toBase58()
    );
    assert.notInclude(
      playerAccount.teams.map((t) => t.toBase58()),
      teamKeypair.publicKey.toBase58()
    );
  });

  it("Coach can kick player", async () => {
    // First, join again
    const teamCode = (await program.account.team.fetch(teamKeypair.publicKey)).code;
    const txJoin = await program.methods
      .joinTeam(teamCode)
      .accounts({
        team: teamKeypair.publicKey,
        playerSigner: playerSigner.publicKey,
      })
      .signers([playerSigner])
      .rpc();

    console.log("Re-joined team tx:", txJoin);

    // Kick the player
    const txKick = await program.methods
      .kickPlayer()
      .accounts({
        team: teamKeypair.publicKey,
        player: playerPda,
        coach: provider.publicKey,
      })
      .rpc();

    console.log("KickPlayer tx signature:", txKick);

    const teamAccount = await program.account.team.fetch(teamKeypair.publicKey);
    const playerAccount = await program.account.player.fetch(playerPda);

    assert.notInclude(
      teamAccount.players.map((p) => p.toBase58()),
      playerSigner.publicKey.toBase58()
    );
    assert.notInclude(
      playerAccount.teams.map((t) => t.toBase58()),
      teamKeypair.publicKey.toBase58()
    );
  });

  it("Join with wrong code fails", async () => {
    const wrongCode = [0, 0, 0, 0, 0, 0];
    try {
      await program.methods
        .joinTeam(wrongCode)
        .accounts({
          team: teamKeypair.publicKey,
          playerSigner: playerSigner.publicKey,
        })
        .signers([playerSigner])
        .rpc();
      assert.fail("Should have thrown InvalidCode error");
    } catch (err) {
      if (err instanceof anchor.AnchorError) {
        assert.equal(err.error.errorCode.code, "InvalidCode");
      } else {
        throw err;
      }
    }
  });

  it("Unauthorized logging fails", async () => {
    const unauthorizedSigner = anchor.web3.Keypair.generate();
    await provider.connection.confirmTransaction(
      await provider.connection.requestAirdrop(unauthorizedSigner.publicKey, 1 * anchor.web3.LAMPORTS_PER_SOL)
    );

    const logKeypair = anchor.web3.Keypair.generate();
    try {
      await program.methods
        .logAttendance("Unauthorized")
        .accounts({
          log: logKeypair.publicKey,
          team: teamKeypair.publicKey,
          player: playerPda,
          signer: unauthorizedSigner.publicKey,
        })
        .signers([logKeypair, unauthorizedSigner])
        .rpc();
      assert.fail("Should have thrown Unauthorized error");
    } catch (err) {
      if (err instanceof anchor.AnchorError) {
        assert.equal(err.error.errorCode.code, "Unauthorized");
      } else {
        throw err;
      }
    }
  });

  it("Unauthorized leave fails", async () => {
    // First, join again
    const teamCode = (await program.account.team.fetch(teamKeypair.publicKey)).code;
    await program.methods
      .joinTeam(teamCode)
      .accounts({
        team: teamKeypair.publicKey,
        playerSigner: playerSigner.publicKey,
      })
      .signers([playerSigner])
      .rpc();

    const wrongSigner = anchor.web3.Keypair.generate();
    await provider.connection.confirmTransaction(
      await provider.connection.requestAirdrop(wrongSigner.publicKey, 1 * anchor.web3.LAMPORTS_PER_SOL)
    );

    try {
      await program.methods
        .leaveTeam()
        .accounts({
          team: teamKeypair.publicKey,
          player: playerPda,
          playerSigner: wrongSigner.publicKey,
        })
        .signers([wrongSigner])
        .rpc();
      assert.fail("Should have thrown Unauthorized error");
    } catch (err) {
      if (err instanceof anchor.AnchorError) {
        assert.equal(err.error.errorCode.code, "Unauthorized");
      } else {
        throw err;
      }
    }
  });

  it("Unauthorized kick fails", async () => {
    const wrongCoach = anchor.web3.Keypair.generate();
    await provider.connection.confirmTransaction(
      await provider.connection.requestAirdrop(wrongCoach.publicKey, 1 * anchor.web3.LAMPORTS_PER_SOL)
    );

    try {
      await program.methods
        .kickPlayer()
        .accounts({
          team: teamKeypair.publicKey,
          player: playerPda,
          coach: wrongCoach.publicKey,
        })
        .signers([wrongCoach])
        .rpc();
      assert.fail("Should have thrown Unauthorized error");
    } catch (err) {
      if (err instanceof anchor.AnchorError) {
        assert.equal(err.error.errorCode.code, "Unauthorized");
      } else {
        throw err;
      }
    }
  });

  it("Joining the same team twice doesn't duplicate", async () => {
    const teamCode = (await program.account.team.fetch(teamKeypair.publicKey)).code;
    const initialPlayers = (await program.account.team.fetch(teamKeypair.publicKey)).players.length;

    // Join again
    await program.methods
      .joinTeam(teamCode)
      .accounts({
        team: teamKeypair.publicKey,
        playerSigner: playerSigner.publicKey,
      })
      .signers([playerSigner])
      .rpc();

    const finalPlayers = (await program.account.team.fetch(teamKeypair.publicKey)).players.length;
    assert.equal(finalPlayers, initialPlayers, "Player should not be added twice");
  });

  it("Logging multiple actions accumulates tokens", async () => {
    // Already logged attendance (+2) and skill (+5), total 7
    const playerAccount = await program.account.player.fetch(playerPda);
    assert.equal(playerAccount.tokens.toNumber(), 7);

    // Log another attendance
    const logKeypair = anchor.web3.Keypair.generate();
    await program.methods
      .logAttendance("Another attendance")
      .accounts({
        log: logKeypair.publicKey,
        team: teamKeypair.publicKey,
        player: playerPda,
        signer: playerSigner.publicKey,
      })
      .signers([logKeypair, playerSigner])
      .rpc();

    const updatedPlayer = await program.account.player.fetch(playerPda);
    assert.equal(updatedPlayer.tokens.toNumber(), 9, "Tokens should accumulate");
  });

  it("Leaving a team not part of doesn't change state", async () => {
    // Create another team
    const anotherTeam = anchor.web3.Keypair.generate();
    const anotherCode = Array.from({ length: 6 }, () => Math.floor(Math.random() * 256));
    await program.methods
      .createTeam(anotherCode)
      .accounts({
        team: anotherTeam.publicKey,
        coach: provider.publicKey,
      })
      .signers([anotherTeam])
      .rpc();

    const initialPlayers = (await program.account.team.fetch(anotherTeam.publicKey)).players.length;

    // Try to leave this team
    await program.methods
      .leaveTeam()
      .accounts({
        team: anotherTeam.publicKey,
        player: playerPda,
        playerSigner: playerSigner.publicKey,
      })
      .signers([playerSigner])
      .rpc();

    const finalPlayers = (await program.account.team.fetch(anotherTeam.publicKey)).players.length;
    assert.equal(finalPlayers, initialPlayers, "Leaving a team not part of should not change player count");
  });
});

