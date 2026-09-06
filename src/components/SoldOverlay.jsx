function SoldOverlay({
  soldPlayer,
  totalPlayersSold,
  winningTeamSquadSize,
  maxSquadSize,
  slotsRemaining,
  nextPlayer,
  onNextPlayer,
  readOnly = false,
}) {
  if (!soldPlayer) {
    return null;
  }

  return (
    <div className="sold-screen-overlay">
      <div className="sold-screen-glow"></div>

      {/* =====================================================
          TOP BAR
      ===================================================== */}

      <div className="sold-screen-topbar">
        <div className="sold-top-left">
          <strong>DPL AUCTION 2026</strong>

          <span>ROUND 01</span>
        </div>

        <div className="sold-top-center">
          <span className="sold-status-dot"></span>
          PLAYER SOLD
        </div>

        <div className="sold-top-right">
          PLAYER {soldPlayer.playerNumber}
        </div>
      </div>

      {/* =====================================================
          MAIN SOLD CONTENT
      ===================================================== */}

      <div className="sold-screen-main">

        {/* ===================================================
            LEFT TEAM PANEL
        =================================================== */}

        <aside className="sold-side-panel sold-left-panel">

          <span className="sold-panel-label">
            WINNING TEAM
          </span>

          <img
            src={soldPlayer.teamLogo}
            alt={soldPlayer.teamName}
            className="sold-team-logo"
          />

          <strong className="sold-side-team-name">
            {soldPlayer.teamShortName}
          </strong>

          <span className="sold-side-team-full">
            {soldPlayer.teamName}
          </span>

          <div className="sold-side-divider"></div>

          <span className="sold-panel-label">
            PURSE REMAINING
          </span>

          <strong className="sold-purse">
            ₹
            {soldPlayer.remainingPurse.toLocaleString(
              "en-IN"
            )}
          </strong>

        </aside>

        {/* ===================================================
            CENTER PLAYER
        =================================================== */}

        <section className="sold-player-center">

          <div className="sold-player-status">
            PLAYER
          </div>

          <div className="sold-big-title">
            SOLD!
          </div>

          <div className="sold-player-photo">

            {soldPlayer.image ? (
              <img
                src={soldPlayer.image}
                alt={soldPlayer.playerName}
              />
            ) : (
              <div className="sold-player-placeholder">
                <span>
                  {soldPlayer.playerName
                    .charAt(0)
                    .toUpperCase()}
                </span>
              </div>
            )}

          </div>

          <span className="sold-player-category">
            {soldPlayer.category}
          </span>

          <h1 className="sold-player-name">
            {soldPlayer.playerName}
          </h1>

          <span className="sold-player-country">
            🇮🇳 {soldPlayer.country}
          </span>

          {/* =================================================
              SOLD TO + FINAL BID
          ================================================= */}

          <div className="sold-result-box">

            <div className="sold-result-team">

              <img
                src={soldPlayer.teamLogo}
                alt=""
              />

              <div>
                <span>SOLD TO</span>

                <strong>
                  {soldPlayer.teamId}
                </strong>
              </div>

            </div>

            <div className="sold-final-price">

              <span>FINAL BID</span>

              <strong>
                ₹
                {soldPlayer.finalPrice.toLocaleString(
                  "en-IN"
                )}
              </strong>

            </div>

          </div>

          <div className="sold-congratulations">
            CONGRATULATIONS {soldPlayer.teamId}!
          </div>

          <p className="sold-description">
            {soldPlayer.playerName} is now part of
            your squad.
          </p>

        </section>

        {/* ===================================================
            RIGHT INFORMATION PANEL
        =================================================== */}

        <aside className="sold-side-panel sold-right-panel">

          <div className="sold-info-block">

            <span>FINAL BID</span>

            <strong className="sold-side-price">
              ₹
              {soldPlayer.finalPrice.toLocaleString(
                "en-IN"
              )}
            </strong>

          </div>

          <div className="sold-info-divider"></div>

          <div className="sold-info-block">

            <span>TEAM</span>

            <strong>
              {soldPlayer.teamId}
            </strong>

          </div>

          <div className="sold-info-divider"></div>

          <div className="sold-info-block">

            <span>SET</span>

            <strong>
              {soldPlayer.set}
            </strong>

          </div>

          <div className="sold-info-divider"></div>

          <div className="sold-info-block">

            <span>SQUAD</span>

            <strong>
              {winningTeamSquadSize} / {maxSquadSize}
            </strong>

          </div>

        </aside>

      </div>

      {/* =====================================================
          BOTTOM STATISTICS BAR
      ===================================================== */}

      <div className="sold-bottom-bar">

        <div className="sold-stat">

          <span>PLAYERS SOLD</span>

          <strong>
            {totalPlayersSold}
          </strong>

        </div>

        <div className="sold-stat">

          <span>CURRENT SET</span>

          <strong>
            {soldPlayer.set}
          </strong>

        </div>

        <div className="sold-stat">

          <span>SLOTS FILLED</span>

          <strong>
            {winningTeamSquadSize}
          </strong>

        </div>

        <div className="sold-stat">

          <span>SLOTS REMAINING</span>

          <strong>
            {slotsRemaining}
          </strong>

        </div>

        {/* =================================================
            OPERATOR-ONLY NEXT PLAYER CONTROL
        ================================================= */}

        {!readOnly && (
          <button
            className="sold-next-player"
            onClick={onNextPlayer}
          >
            <div>

              <span>
                {nextPlayer
                  ? "NEXT PLAYER"
                  : "FINISH AUCTION"}
              </span>

              <strong>
                {nextPlayer
                  ? nextPlayer.name
                  : "END AUCTION"}
              </strong>

            </div>

            <span className="sold-next-arrow">
              →
            </span>

          </button>
        )}

        {/* =================================================
            TEAM VIEWER STATUS
        ================================================= */}

        {readOnly && (
          <div className="sold-next-player">
            <div>

              <span>
                LIVE AUCTION
              </span>

              <strong>
                WAITING FOR NEXT PLAYER
              </strong>

            </div>

            <span className="sold-next-arrow">
              •
            </span>

          </div>
        )}

      </div>

    </div>
  );
}

export default SoldOverlay;