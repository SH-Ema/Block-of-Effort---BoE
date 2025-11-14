use anchor_lang::prelude::*;

declare_id!("2D8rWNeqJENDSjT2vEpWGcQjc4tcYArccEGtcrgBduMQ");

#[program]
pub mod boe_program {
    use super::*;

    pub fn create_team(ctx: Context<CreateTeam>, code: [u8; 6]) -> Result<()> {
        let team = &mut ctx.accounts.team;
        team.coach = ctx.accounts.coach.key();
        team.code = code;
        team.players = Vec::new();
        Ok(())
    }

    pub fn join_team(ctx: Context<JoinTeam>, code: [u8; 6]) -> Result<()> {
        let team = &mut ctx.accounts.team;
        require!(team.code == code, BOEError::InvalidCode);

        let player = &mut ctx.accounts.player;
        player.owner = ctx.accounts.player_signer.key();
        let player_key = ctx.accounts.player_signer.key();

        if !team.players.contains(&player_key) {
            team.players.push(player_key);
        }

        if !player.teams.contains(&ctx.accounts.team.key()) {
            player.teams.push(ctx.accounts.team.key());
        }

        Ok(())
    }

    pub fn leave_team(ctx: Context<LeaveTeam>) -> Result<()> {
        let team = &mut ctx.accounts.team;
        let player = &mut ctx.accounts.player;

        require!(player.owner == ctx.accounts.player_signer.key(), BOEError::Unauthorized);

        let player_key = ctx.accounts.player_signer.key();
        team.players.retain(|x| x != &player_key);
        player.teams.retain(|x| x != &ctx.accounts.team.key());

        Ok(())
    }

    pub fn kick_player(ctx: Context<KickPlayer>) -> Result<()> {
        let team = &mut ctx.accounts.team;

        require!(team.coach == ctx.accounts.coach.key(), BOEError::Unauthorized);

        let player_key = ctx.accounts.player.owner;
        let player = &mut ctx.accounts.player;
        team.players.retain(|x| x != &player_key);
        player.teams.retain(|x| x != &ctx.accounts.team.key());

        Ok(())
    }

    pub fn log_attendance(ctx: Context<LogAction>, comment: String) -> Result<()> {
        require!(ctx.accounts.signer.key() == ctx.accounts.team.coach || ctx.accounts.signer.key() == ctx.accounts.player.owner, BOEError::Unauthorized);

        let log = &mut ctx.accounts.log;
        log.team = ctx.accounts.team.key();
        log.player = ctx.accounts.player.key();
        log.timestamp = Clock::get()?.unix_timestamp;
        log.kind = LogKind::Attendance;
        log.comment = comment;

        let player = &mut ctx.accounts.player;
        player.tokens += 2;
        player.last_active = log.timestamp;

        Ok(())
    }

    pub fn log_skill(ctx: Context<LogAction>, comment: String) -> Result<()> {
        require!(ctx.accounts.signer.key() == ctx.accounts.team.coach || ctx.accounts.signer.key() == ctx.accounts.player.owner, BOEError::Unauthorized);

        let log = &mut ctx.accounts.log;
        log.team = ctx.accounts.team.key();
        log.player = ctx.accounts.player.key();
        log.timestamp = Clock::get()?.unix_timestamp;
        log.kind = LogKind::Skill;
        log.comment = comment;

        let player = &mut ctx.accounts.player;
        player.tokens += 5;
        player.last_active = log.timestamp;

        Ok(())
    }
}

// Accounts

#[account]
pub struct Team {
    pub coach: Pubkey,
    pub players: Vec<Pubkey>,
    pub code: [u8; 6],
}

#[account]
pub struct Player {
    pub owner: Pubkey,
    pub teams: Vec<Pubkey>,
    pub tokens: u64,
    pub last_active: i64,
}

#[account]
pub struct Log {
    pub team: Pubkey,
    pub player: Pubkey,
    pub timestamp: i64,
    pub kind: LogKind,
    pub comment: String,
}

// Enums

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq)]
pub enum LogKind {
    Attendance,
    Skill,
}

// Contexts

#[derive(Accounts)]
#[instruction(code: [u8; 6])]
pub struct CreateTeam<'info> {
    #[account(init, payer = coach, space = 8 + 32 + 4 + 32*100 + 6, seeds = [b"team", code.as_ref()], bump)]
    pub team: Account<'info, Team>,
    #[account(mut)]
    pub coach: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(code: [u8; 6])]
pub struct JoinTeam<'info> {
    #[account(mut, seeds = [b"team", code.as_ref()], bump)]
    pub team: Account<'info, Team>,
    #[account(init_if_needed, payer = player_signer, space = 8 + 32 + 4 + 32*10 + 8 + 8, seeds = [b"player", player_signer.key().as_ref()], bump)]
    pub player: Account<'info, Player>,
    #[account(mut)]
    pub player_signer: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct LeaveTeam<'info> {
    #[account(mut, seeds = [b"team", team.code.as_ref()], bump)]
    pub team: Account<'info, Team>,
    #[account(mut, seeds = [b"player", player_signer.key().as_ref()], bump)]
    pub player: Account<'info, Player>,
    pub player_signer: Signer<'info>,
}

#[derive(Accounts)]
pub struct KickPlayer<'info> {
    #[account(mut, seeds = [b"team", team.code.as_ref()], bump)]
    pub team: Account<'info, Team>,
    #[account(mut, seeds = [b"player", player.owner.as_ref()], bump)]
    pub player: Account<'info, Player>,
    #[account(mut)]
    pub coach: Signer<'info>,
}

#[derive(Accounts)]
pub struct LogAction<'info> {
    #[account(init, payer = signer, space = 300)]
    pub log: Account<'info, Log>,
    #[account(mut, seeds = [b"team", team.code.as_ref()], bump)]
    pub team: Account<'info, Team>,
    #[account(mut, seeds = [b"player", player.owner.as_ref()], bump)]
    pub player: Account<'info, Player>,
    #[account(mut)]
    pub signer: Signer<'info>,
    pub system_program: Program<'info, System>,
}

// Errors

#[error_code]
pub enum BOEError {
    #[msg("Invalid team code")]
    InvalidCode,
    #[msg("Unauthorized")]
    Unauthorized,
}

