import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  CircleDollarSign,
  Clock3,
  LogOut,
  Radio,
  ShieldCheck,
  Users,
  Wallet,
  X,
  Zap,
} from "lucide-react";

import { supabase } from "../../lib/supabase";
import "./TeamOwnerDashboard.css";

const MAX_SQUAD_SIZE = 5;
const STARTING_PURSE = 10000;

/*
 * The operator currently uses this auction queue.
 * The live auction state stores the currentPlayerIndex,
 * while player details themselves are maintained by the
 * auction application.
 */
const AUCTION_PLAYERS = [
  {
    id: 7,
    playerNumber: "#07",
    playerName: "ARJUN SHARMA",
    category: "BATSMAN",
    age: 21,
    style: "RIGHT HAND",
    country: "INDIA",
    basePrice: 500,
    set: "OUTSIDE PARTICIPANTS",
    image: null,
  },
  {
    id: 8,
    playerNumber: "#08",
    playerName: "ADITYA RAJ",
    category: "BOWLER",
    age: 22,
    style: "RIGHT HAND",
    country: "INDIA",
    basePrice: 500,
    set: "OUTSIDE PARTICIPANTS",
    image: null,
  },
  {
    id: 9,
    playerNumber: "#09",
    playerName: "KARAN PATEL",
    category: "BATSMAN",
    age: 21,
    style: "RIGHT HAND",
    country: "INDIA",
    basePrice: 500,
    set: "OUTSIDE PARTICIPANTS",
    image: null,
  },
  {
    id: 10,
    playerNumber: "#10",
    playerName: "ROHAN DAS",
    category: "ALL ROUNDER",
    age: 22,
    style: "RIGHT HAND",
    country: "INDIA",
    basePrice: 500,
    set: "OUTSIDE PARTICIPANTS",
    image: null,
  },
  {
    id: 11,
    playerNumber: "#11",
    playerName: "SANJAY KUMAR",
    category: "BATSMAN",
    age: 22,
    style: "RIGHT HAND",
    country: "INDIA",
    basePrice: 500,
    set: "OUTSIDE PARTICIPANTS",
    image: null,
  },
];

const FALLBACK_TEAMS = [
  {
    id: "TEAM 01",
    name: "MELBOURNE TECH STARS",
    logo: "/assets/teams/team-01.png",
    owner: "/assets/owners/team-01.webp",
    amount: 10000,
    shortName: "STARS",
  },
  {
    id: "TEAM 02",
    name: "CANBERRA CODE COMETS",
    logo: "/assets/teams/team-02.png",
    owner: "/assets/owners/team-02.webp",
    amount: 10000,
    shortName: "COMETS",
  },
  {
    id: "TEAM 03",
    name: "TOWNSVILLE TECH TITANS",
    logo: "/assets/teams/team-03.png",
    owner: "/assets/owners/team-03.webp",
    amount: 10000,
    shortName: "TITANS",
  },
  {
    id: "TEAM 04",
    name: "SYDNEY CLOUD THUNDER",
    logo: "/assets/teams/team-04.png",
    owner: "/assets/owners/team-04.webp",
    amount: 10000,
    shortName: "THUNDER",
  },
  {
    id: "TEAM 05",
    name: "DARWIN DATA CYCLONES",
    logo: "/assets/teams/team-05.png",
    owner: "/assets/owners/team-05.webp",
    amount: 10000,
    shortName: "CYCLONES",
  },
  {
    id: "TEAM 06",
    name: "SYDNEY SILICON SIXERS",
    logo: "/assets/teams/team-06.png",
    owner: "/assets/owners/team-06.webp",
    amount: 10000,
    shortName: "SIXERS",
  },
  {
    id: "TEAM 07",
    name: "GEELONG GENGARS",
    logo: "/assets/teams/team-07.png",
    owner: "/assets/owners/team-07.webp",
    amount: 10000,
    shortName: "GENGARS",
  },
  {
    id: "TEAM 08",
    name: "BRISBANE BYTE HEAT",
    logo: "/assets/teams/team-08.png",
    owner: "/assets/owners/team-08.webp",
    amount: 10000,
    shortName: "BYTE HEAT",
  },
  {
    id: "TEAM 09",
    name: "PERTH PIXEL SCORCHERS",
    logo: "/assets/teams/team-09.png",
    owner: "/assets/owners/team-09.webp",
    amount: 10000,
    shortName: "SCORCHERS",
  },
  {
    id: "TEAM 10",
    name: "NEWCASTLE NETWORK BLAZERS",
    logo: "/assets/teams/team-10.png",
    owner: "/assets/owners/team-10.webp",
    amount: 10000,
    shortName: "BLAZERS",
  },
];

const formatCurrency = (value) => {
  const numericValue = Number(value ?? 0);

  return `₹${numericValue.toLocaleString("en-IN")}`;
};

const getTeamId = (team) => {
  if (!team) {
    return "";
  }

  return String(
    team.id ??
      team.team_id ??
      team.teamId ??
      team.code ??
      ""
  ).trim();
};

const getTeamName = (team) => {
  if (!team) {
    return "TEAM";
  }

  return (
    team.name ??
    team.team_name ??
    team.teamName ??
    team.id ??
    "TEAM"
  );
};

const getTeamLogo = (team) => {
  if (!team) {
    return null;
  }

  return (
    team.logo ??
    team.logo_url ??
    team.logoUrl ??
    null
  );
};

const getSquadPlayers = (team) => {
  if (!team) {
    return [];
  }

  const players =
    team.players ??
    team.squad ??
    team.squadPlayers ??
    team.squad_players ??
    [];

  return Array.isArray(players) ? players : [];
};

const getPlayerId = (player) => {
  if (!player) {
    return "";
  }

  return String(
    player.id ??
      player.player_id ??
      player.playerId ??
      player.number ??
      player.playerNumber ??
      ""
  );
};

const getPlayerName = (player) => {
  if (!player) {
    return "No player";
  }

  return (
    player.name ??
    player.player_name ??
    player.playerName ??
    "Unknown Player"
  );
};

const getPlayerRole = (player) => {
  if (!player) {
    return "PLAYER";
  }

  return (
    player.role ??
    player.player_role ??
    player.category ??
    "PLAYER"
  );
};

const getPlayerBasePrice = (player) => {
  if (!player) {
    return 0;
  }

  return Number(
    player.basePrice ??
      player.base_price ??
      player.baseBid ??
      player.base_bid ??
      0
  );
};

const getPlayerImage = (player) => {
  if (!player) {
    return null;
  }

  return (
    player.image ??
    player.image_url ??
    player.imageUrl ??
    null
  );
};

const getSoldPrice = (player) => {
  if (!player) {
    return 0;
  }

  return Number(
    player.soldPrice ??
      player.sold_price ??
      player.finalPrice ??
      player.final_price ??
      player.price ??
      0
  );
};

const getSoldTeam = (player) => {
  if (!player) {
    return "";
  }

  return String(
    player.soldTeam ??
      player.sold_team ??
      player.teamId ??
      player.team_id ??
      player.team ??
      ""
  ).trim();
};

const normalizeAuctionState = (rawState) => {
  if (!rawState) {
    return {};
  }

  if (
    typeof rawState === "object" &&
    rawState.state &&
    typeof rawState.state === "object"
  ) {
    return rawState.state;
  }

  return rawState;
};

function TeamOwnerDashboard({
  currentUser,
  onLogout,
  authError,
}) {
  const [auctionState, setAuctionState] =
    useState(null);

  const [loading, setLoading] = useState(true);

  const [connectionError, setConnectionError] =
    useState("");

  const loadAuctionState = useCallback(
    async () => {
      try {
        setConnectionError("");

        const { data, error } = await supabase
          .from("auction_state")
          .select("state, updated_at")
          .eq("id", 1)
          .maybeSingle();

        if (error) {
          throw error;
        }

        if (data?.state) {
          setAuctionState(
            normalizeAuctionState(data.state)
          );
        }
      } catch (error) {
        setConnectionError(
          error.message ||
            "Unable to connect to the live auction."
        );
      } finally {
        setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    let mounted = true;

    const initialize = async () => {
      await loadAuctionState();

      if (!mounted) {
        return;
      }
    };

    initialize();

    const channel = supabase
      .channel("team-owner-auction-state")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "auction_state",
          filter: "id=eq.1",
        },
        (payload) => {
          if (!mounted) {
            return;
          }

          if (payload.new?.state) {
            setAuctionState(
              normalizeAuctionState(
                payload.new.state
              )
            );

            setConnectionError("");
            setLoading(false);
          }
        }
      )
      .subscribe((status) => {
        if (!mounted) {
          return;
        }

        if (status === "SUBSCRIBED") {
          setConnectionError("");
        }

        if (
          status === "CHANNEL_ERROR" ||
          status === "TIMED_OUT"
        ) {
          setConnectionError(
            "Live auction connection interrupted. Retrying..."
          );
        }
      });

    return () => {
      mounted = false;
      supabase.removeChannel(channel);
    };
  }, [loadAuctionState]);

  const teams = useMemo(() => {
    const stateTeams = auctionState?.teams;

    if (!Array.isArray(stateTeams)) {
      return FALLBACK_TEAMS;
    }

    return stateTeams;
  }, [auctionState]);

  const teamId = useMemo(
    () =>
      String(
        currentUser?.team_id ?? ""
      ).trim(),
    [currentUser]
  );

  const myTeam = useMemo(() => {
    if (!teamId) {
      return null;
    }

    const normalizedTeamId =
      teamId.toLowerCase();

    return (
      teams.find(
        (team) =>
          getTeamId(team).toLowerCase() ===
          normalizedTeamId
      ) ?? null
    );
  }, [teamId, teams]);

  const fallbackTeam = useMemo(() => {
    if (!teamId) {
      return null;
    }

    return (
      FALLBACK_TEAMS.find(
        (team) =>
          getTeamId(team).toLowerCase() ===
          teamId.toLowerCase()
      ) ?? null
    );
  }, [teamId]);

  const displayTeam =
    myTeam ?? fallbackTeam;

  const teamName = getTeamName(
    displayTeam
  );

  const teamLogo =
    getTeamLogo(displayTeam);

  /*
   * Build the squad from the actual soldPlayers
   * structure stored by the operator.
   */
  const squadPlayers = useMemo(() => {
    const players =
      getSquadPlayers(myTeam);

    if (players.length > 0) {
      return players;
    }

    const soldPlayers =
      auctionState?.soldPlayers;

    if (!Array.isArray(soldPlayers)) {
      return [];
    }

    return soldPlayers.filter((player) => {
      const soldTeam = getSoldTeam(player);

      return (
        soldTeam.toLowerCase() ===
        teamId.toLowerCase()
      );
    });
  }, [
    myTeam,
    auctionState,
    teamId,
  ]);

  const squadCount =
    squadPlayers.length;

  /*
   * IMPORTANT:
   * The real auction_state stores remaining purse
   * as `amount`.
   */
  const purse = useMemo(() => {
    if (myTeam) {
      const possiblePurse =
        myTeam.amount ??
        myTeam.remainingPurse ??
        myTeam.remaining_purse ??
        myTeam.purse ??
        myTeam.balance ??
        myTeam.remainingBalance ??
        myTeam.remaining_balance;

      if (
        possiblePurse !== undefined &&
        possiblePurse !== null
      ) {
        return Math.max(
          0,
          Number(possiblePurse)
        );
      }
    }

    return Math.max(
      0,
      STARTING_PURSE -
        squadPlayers.reduce(
          (total, player) =>
            total + getSoldPrice(player),
          0
        )
    );
  }, [myTeam, squadPlayers]);

  const spent = Math.max(
    0,
    STARTING_PURSE - purse
  );

  const slotsRemaining = Math.max(
    0,
    MAX_SQUAD_SIZE - squadCount
  );

  /*
   * The database does not currently store
   * `currentPlayer`.
   *
   * It stores `currentPlayerIndex`, so resolve
   * the active player from the auction queue.
   */
  const currentPlayer = useMemo(() => {
    const index = Number(
      auctionState?.currentPlayerIndex
    );

    if (
      Number.isInteger(index) &&
      index >= 0 &&
      index < AUCTION_PLAYERS.length
    ) {
      return AUCTION_PLAYERS[index];
    }

    /*
     * As a secondary fallback, try to recover the
     * current player name from the latest ticker.
     */
    const tickerMessages =
      auctionState?.tickerMessages;

    if (Array.isArray(tickerMessages)) {
      const latestCurrentPlayerMessage =
        tickerMessages.find((message) =>
          String(message?.text ?? "")
            .toUpperCase()
            .includes("CURRENT PLAYER:")
        );

      if (latestCurrentPlayerMessage) {
        const text = String(
          latestCurrentPlayerMessage.text
        );

        const match = text.match(
          /CURRENT PLAYER:\s*([^•]+)/i
        );

        const playerName =
          match?.[1]?.trim();

        if (playerName) {
          const matchedPlayer =
            AUCTION_PLAYERS.find(
              (player) =>
                player.playerName.toLowerCase() ===
                playerName.toLowerCase()
            );

          if (matchedPlayer) {
            return matchedPlayer;
          }
        }
      }
    }

    return null;
  }, [auctionState]);

  const currentBid = Number(
    auctionState?.currentBid ??
      auctionState?.current_bid ??
      0
  );

  const highestBidder = String(
    auctionState?.highestBidder ??
      auctionState?.highest_bidder ??
      auctionState?.highestBidderName ??
      auctionState?.highest_bidder_name ??
      ""
  );

  const auctionStatus = String(
    auctionState?.auctionStatus ??
      auctionState?.auction_status ??
      auctionState?.status ??
      "waiting"
  ).toLowerCase();

  const timerRemaining = Number(
    auctionState?.bidTimeRemaining ??
      auctionState?.bid_time_remaining ??
      0
  );

  const soldOverlayOpen = Boolean(
    auctionState?.soldOverlayOpen ??
      auctionState?.sold_overlay_open ??
      false
  );

  const isLive =
    auctionStatus === "live" ||
    auctionStatus === "bidding" ||
    auctionStatus === "active";

  const isSold =
    auctionStatus === "sold" ||
    soldOverlayOpen;

  const statusLabel = isLive
    ? "LIVE AUCTION"
    : isSold
      ? "PLAYER SOLD"
      : auctionStatus === "paused"
        ? "AUCTION PAUSED"
        : "WAITING";

  const statusClass = isLive
    ? "live"
    : isSold
      ? "sold"
      : "waiting";

  const currentBidderIsUs =
    highestBidder.toLowerCase() ===
    teamId.toLowerCase();

  const playerBasePrice =
    getPlayerBasePrice(currentPlayer);

  const playerImage =
    getPlayerImage(currentPlayer);

  const displayPlayerId =
    currentPlayer?.playerNumber ??
    getPlayerId(currentPlayer);

  const displayPlayerName =
    currentPlayer?.playerName ??
    getPlayerName(currentPlayer);

  const displayPlayerRole =
    currentPlayer?.category ??
    getPlayerRole(currentPlayer);

  const handleLogout = async () => {
    if (onLogout) {
      await onLogout();
    }
  };

  if (loading) {
    return (
      <div className="team-owner-page">
        <div className="team-owner-loading">
          <img
            src="/assets/logo/dpl-logo.png"
            alt="DPL"
          />

          <div className="team-owner-loading-pulse">
            <Radio size={18} />
            CONNECTING TO LIVE AUCTION
          </div>

          <span>
            Establishing secure live connection...
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="team-owner-page">
      <header className="team-owner-header">
        <div className="team-owner-brand">
          <img
            src="/assets/logo/dpl-logo.png"
            alt="DPL"
            className="team-owner-dpl-logo"
          />

          <div className="team-owner-brand-copy">
            <span>DPL AUCTION</span>
            <strong>TEAM OWNER PORTAL</strong>
          </div>
        </div>

        <div className="team-owner-header-right">
          <div
            className={`team-owner-live-pill ${statusClass}`}
          >
            <span className="team-owner-live-dot" />
            {statusLabel}
          </div>

          <div className="team-owner-account">
            <div className="team-owner-account-text">
              <strong>
                {currentUser?.display_name ||
                  teamName}
              </strong>

              <span>
                {currentUser?.display_name
                  ? teamName
                  : "AUTHORIZED TEAM ACCOUNT"}
              </span>
            </div>

            <button
              type="button"
              className="team-owner-logout"
              onClick={handleLogout}
              title="Sign out"
            >
              <LogOut size={17} />
            </button>
          </div>
        </div>
      </header>

      {(authError ||
        connectionError) && (
        <div className="team-owner-alert">
          <X size={17} />

          <span>
            {connectionError ||
              authError}
          </span>
        </div>
      )}

      <main className="team-owner-main">
        <section className="team-owner-hero">
          <div className="team-owner-hero-team">
            <div className="team-owner-logo-wrap">
              {teamLogo ? (
                <img
                  src={teamLogo}
                  alt={teamName}
                  className="team-owner-team-logo"
                />
              ) : (
                <div className="team-owner-logo-fallback">
                  {teamName
                    .replace(
                      /TEAM\s*/i,
                      ""
                    )
                    .padStart(2, "0")}
                </div>
              )}
            </div>

            <div>
              <span className="team-owner-eyebrow">
                YOUR FRANCHISE
              </span>

              <h1>{teamName}</h1>

              <p>
                Live team command center
              </p>
            </div>
          </div>

          <div className="team-owner-secure-badge">
            <ShieldCheck size={19} />

            <div>
              <strong>
                VIEW ONLY ACCESS
              </strong>

              <span>
                Auction controls are managed
                by the operator
              </span>
            </div>
          </div>
        </section>

        <section className="team-owner-stats">
          <div className="team-owner-stat-card purse">
            <div className="team-owner-stat-icon">
              <Wallet size={21} />
            </div>

            <div>
              <span>REMAINING PURSE</span>

              <strong>
                {formatCurrency(purse)}
              </strong>
            </div>
          </div>

          <div className="team-owner-stat-card">
            <div className="team-owner-stat-icon">
              <CircleDollarSign size={21} />
            </div>

            <div>
              <span>TOTAL SPENT</span>

              <strong>
                {formatCurrency(spent)}
              </strong>
            </div>
          </div>

          <div className="team-owner-stat-card">
            <div className="team-owner-stat-icon">
              <Users size={21} />
            </div>

            <div>
              <span>SQUAD SIZE</span>

              <strong>
                {squadCount}
                <small>
                  /{MAX_SQUAD_SIZE}
                </small>
              </strong>
            </div>
          </div>

          <div className="team-owner-stat-card">
            <div className="team-owner-stat-icon">
              <Zap size={21} />
            </div>

            <div>
              <span>SLOTS REMAINING</span>

              <strong>
                {slotsRemaining}
              </strong>
            </div>
          </div>
        </section>

        <section className="team-owner-content">
          <div className="team-owner-auction-column">
            <div className="team-owner-section-heading">
              <div>
                <span>
                  LIVE AUCTION FLOOR
                </span>

                <h2>
                  Current Player
                </h2>
              </div>

              <div
                className={`team-owner-status-badge ${statusClass}`}
              >
                <span />
                {statusLabel}
              </div>
            </div>

            <div className="team-owner-current-player">
              <div className="team-owner-player-visual">
                {playerImage ? (
                  <img
                    src={playerImage}
                    alt={displayPlayerName}
                  />
                ) : (
                  <div className="team-owner-player-placeholder">
                    <Users size={64} />

                    <span>
                      PLAYER PHOTO
                    </span>
                  </div>
                )}

                {displayPlayerId && (
                  <div className="team-owner-player-number">
                    {String(
                      displayPlayerId
                    ).startsWith("#")
                      ? displayPlayerId
                      : `#${displayPlayerId}`}
                  </div>
                )}
              </div>

              <div className="team-owner-player-details">
                <span className="team-owner-player-kicker">
                  CURRENT LOT
                </span>

                <h3>
                  {displayPlayerName}
                </h3>

                <div className="team-owner-player-meta">
                  <span>
                    {displayPlayerRole}
                  </span>

                  {currentPlayer?.department && (
                    <span>
                      {
                        currentPlayer.department
                      }
                    </span>
                  )}

                  {currentPlayer?.age && (
                    <span>
                      AGE{" "}
                      {currentPlayer.age}
                    </span>
                  )}

                  {currentPlayer?.year && (
                    <span>
                      YEAR{" "}
                      {currentPlayer.year}
                    </span>
                  )}
                </div>

                <div className="team-owner-base-price">
                  <span>
                    BASE PRICE
                  </span>

                  <strong>
                    {formatCurrency(
                      playerBasePrice
                    )}
                  </strong>
                </div>
              </div>
            </div>

            <div className="team-owner-bid-panel">
              <div className="team-owner-bid-main">
                <span>
                  CURRENT BID
                </span>

                <strong>
                  {formatCurrency(
                    currentBid
                  )}
                </strong>
              </div>

              <div className="team-owner-bid-divider" />

              <div className="team-owner-bidder">
                <span>
                  HIGHEST BIDDER
                </span>

                <strong
                  className={
                    currentBidderIsUs
                      ? "mine"
                      : ""
                  }
                >
                  {highestBidder ||
                    "WAITING FOR BID"}
                </strong>

                {currentBidderIsUs && (
                  <small>
                    YOUR TEAM IS CURRENTLY
                    LEADING
                  </small>
                )}
              </div>

              {timerRemaining > 0 && (
                <>
                  <div className="team-owner-bid-divider" />

                  <div className="team-owner-timer">
                    <Clock3 size={17} />

                    <div>
                      <span>
                        BID TIMER
                      </span>

                      <strong>
                        {timerRemaining}s
                      </strong>
                    </div>
                  </div>
                </>
              )}
            </div>

            <div className="team-owner-notice">
              <Radio size={17} />

              <span>
                This screen updates automatically
                when the auction operator changes
                the live auction state.
              </span>
            </div>
          </div>

          <aside className="team-owner-squad-column">
            <div className="team-owner-section-heading">
              <div>
                <span>
                  YOUR FRANCHISE
                </span>

                <h2>
                  Squad
                </h2>
              </div>

              <div className="team-owner-squad-count">
                {squadCount}/{MAX_SQUAD_SIZE}
              </div>
            </div>

            <div className="team-owner-squad-card">
              {squadPlayers.length === 0 ? (
                <div className="team-owner-empty-squad">
                  <Users size={34} />

                  <strong>
                    No players acquired yet
                  </strong>

                  <span>
                    Your purchased players will
                    appear here automatically.
                  </span>
                </div>
              ) : (
                <div className="team-owner-squad-list">
                  {squadPlayers.map(
                    (player, index) => (
                      <div
                        className="team-owner-squad-player"
                        key={
                          getPlayerId(
                            player
                          ) ||
                          `${getPlayerName(
                            player
                          )}-${index}`
                        }
                      >
                        <div className="team-owner-squad-avatar">
                          {getPlayerImage(
                            player
                          ) ? (
                            <img
                              src={getPlayerImage(
                                player
                              )}
                              alt={getPlayerName(
                                player
                              )}
                            />
                          ) : (
                            <Users size={19} />
                          )}
                        </div>

                        <div className="team-owner-squad-player-info">
                          <strong>
                            {getPlayerName(
                              player
                            )}
                          </strong>

                          <span>
                            {getPlayerRole(
                              player
                            )}
                          </span>
                        </div>

                        <div className="team-owner-squad-price">
                          <span>
                            SOLD
                          </span>

                          <strong>
                            {formatCurrency(
                              getSoldPrice(
                                player
                              )
                            )}
                          </strong>
                        </div>
                      </div>
                    )
                  )}
                </div>
              )}

              {squadCount <
                MAX_SQUAD_SIZE && (
                <div className="team-owner-open-slots">
                  <span>
                    OPEN SLOTS
                  </span>

                  <strong>
                    {slotsRemaining}
                  </strong>
                </div>
              )}
            </div>

            <div className="team-owner-budget-card">
              <div className="team-owner-budget-heading">
                <span>
                  PURSE UTILIZATION
                </span>

                <strong>
                  {STARTING_PURSE > 0
                    ? Math.min(
                        100,
                        Math.round(
                          (spent /
                            STARTING_PURSE) *
                            100
                        )
                      )
                    : 0}
                  %
                </strong>
              </div>

              <div className="team-owner-budget-track">
                <div
                  className="team-owner-budget-fill"
                  style={{
                    width: `${Math.min(
                      100,
                      Math.max(
                        0,
                        (spent /
                          STARTING_PURSE) *
                          100
                      )
                    )}%`,
                  }}
                />
              </div>

              <div className="team-owner-budget-values">
                <span>
                  Spent{" "}
                  {formatCurrency(spent)}
                </span>

                <span>
                  Budget{" "}
                  {formatCurrency(
                    STARTING_PURSE
                  )}
                </span>
              </div>
            </div>
          </aside>
        </section>
      </main>

      <footer className="team-owner-footer">
        <div>
          <span className="team-owner-footer-live-dot" />
          LIVE SYNC ACTIVE
        </div>

        <span>
          DPL AUCTION • TEAM OWNER PORTAL
        </span>
      </footer>
    </div>
  );
}

export default TeamOwnerDashboard;