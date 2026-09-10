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
  Search,
  ShieldCheck,
  Users,
  Wallet,
  X,
  Zap,
} from "lucide-react";

import { supabase } from "../../lib/supabase";
import "./TeamOwnerDashboard.css";
import players from "../../data/players";
import { getResumeUrl } from "../../data/resumes";

const MAX_SQUAD_SIZE = 5;
const STARTING_PURSE = 10000;
const BID_DURATION_SECONDS = 60;

/* =========================================================
   PLAYER QUEUE — SINGLE SOURCE OF TRUTH

   Both the operator and team-owner portals use players.js.
   This prevents old hard-coded names/prices from appearing
   in the owner portal after players.js is updated.
========================================================= */

const AUCTION_PLAYERS = players.map((player, index) => ({
  ...player,
  playerNumber: `#${String(index + 1).padStart(2, "0")}`,
  playerName: player.name,
  country: "INDIA",
  basePrice: Number(player.basePrice ?? 0),
  set:
    player.category === "Club Member"
      ? "CLUB MEMBERS"
      : "OUTSIDE PARTICIPANTS",
}));

/* =========================================================
   FALLBACK TEAMS
========================================================= */

const FALLBACK_TEAMS = [
  {
    id: "TEAM 01",
    name: "MELBOURNE TECH STARS",
    logo: "/assets/teams/team-01.png",
    owner: "/assets/owners/team-01.webp",
    amount: STARTING_PURSE,
    shortName: "STARS",
  },
  {
    id: "TEAM 02",
    name: "CANBERRA CODE COMETS",
    logo: "/assets/teams/team-02.png",
    owner: "/assets/owners/team-02.webp",
    amount: STARTING_PURSE,
    shortName: "COMETS",
  },
  {
    id: "TEAM 03",
    name: "TOWNSVILLE TECH TITANS",
    logo: "/assets/teams/team-03.png",
    owner: "/assets/owners/team-03.webp",
    amount: STARTING_PURSE,
    shortName: "TITANS",
  },
  {
    id: "TEAM 04",
    name: "SYDNEY CLOUD THUNDER",
    logo: "/assets/teams/team-04.png",
    owner: "/assets/owners/team-04.webp",
    amount: STARTING_PURSE,
    shortName: "THUNDER",
  },
  {
    id: "TEAM 05",
    name: "DARWIN DATA CYCLONES",
    logo: "/assets/teams/team-05.png",
    owner: "/assets/owners/team-05.webp",
    amount: STARTING_PURSE,
    shortName: "CYCLONES",
  },
  {
    id: "TEAM 06",
    name: "SYDNEY SILICON SIXERS",
    logo: "/assets/teams/team-06.png",
    owner: "/assets/owners/team-06.webp",
    amount: STARTING_PURSE,
    shortName: "SIXERS",
  },
  {
    id: "TEAM 07",
    name: "GEELONG GENGARS",
    logo: "/assets/teams/team-07.png",
    owner: "/assets/owners/team-07.webp",
    amount: STARTING_PURSE,
    shortName: "GENGARS",
  },
  {
    id: "TEAM 08",
    name: "BRISBANE BYTE HEAT",
    logo: "/assets/teams/team-08.png",
    owner: "/assets/owners/team-08.webp",
    amount: STARTING_PURSE,
    shortName: "BYTE HEAT",
  },
  {
    id: "TEAM 09",
    name: "PERTH PIXEL SCORCHERS",
    logo: "/assets/teams/team-09.png",
    owner: "/assets/owners/team-09.webp",
    amount: STARTING_PURSE,
    shortName: "SCORCHERS",
  },
  {
    id: "TEAM 10",
    name: "NEWCASTLE NETWORK BLAZERS",
    logo: "/assets/teams/team-10.png",
    owner: "/assets/owners/team-10.webp",
    amount: STARTING_PURSE,
    shortName: "BLAZERS",
  },
];

/* =========================================================
   HELPERS
========================================================= */

const formatCurrency = (value) => {
  const numericValue = Number(value ?? 0);
  return `₹${numericValue.toLocaleString("en-IN")}`;
};

const getTeamId = (team) => {
  if (!team) return "";

  return String(
    team.id ??
      team.team_id ??
      team.teamId ??
      team.code ??
      ""
  ).trim();
};

const getTeamName = (team) => {
  if (!team) return "TEAM";

  return (
    team.name ??
    team.team_name ??
    team.teamName ??
    team.id ??
    "TEAM"
  );
};

const getTeamLogo = (team) => {
  if (!team) return null;

  return (
    team.logo ??
    team.logo_url ??
    team.logoUrl ??
    null
  );
};

const getSquadPlayers = (team) => {
  if (!team) return [];

  const squad =
    team.players ??
    team.squad ??
    team.squadPlayers ??
    team.squad_players ??
    [];

  return Array.isArray(squad) ? squad : [];
};

const getPlayerId = (player) => {
  if (!player) return "";

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
  if (!player) return "No player";

  return (
    player.name ??
    player.player_name ??
    player.playerName ??
    "Unknown Player"
  );
};

const getPlayerRole = (player) => {
  if (!player) return "PLAYER";

  return (
    player.role ??
    player.player_role ??
    player.category ??
    "PLAYER"
  );
};

const getPlayerBasePrice = (player) => {
  if (!player) return 0;

  return Number(
    player.basePrice ??
      player.base_price ??
      player.baseBid ??
      player.base_bid ??
      0
  );
};

const getPlayerImage = (player) => {
  if (!player) return null;

  return (
    player.image ??
    player.image_url ??
    player.imageUrl ??
    null
  );
};

const getSoldPrice = (player) => {
  if (!player) return 0;

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
  if (!player) return "";

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
  if (!rawState) return {};

  if (
    typeof rawState === "object" &&
    rawState.state &&
    typeof rawState.state === "object"
  ) {
    return rawState.state;
  }

  return rawState;
};

const getCanonicalPlayer = (rawPlayer) => {
  if (!rawPlayer) return null;

  const rawId = String(
    rawPlayer.id ??
      rawPlayer.player_id ??
      rawPlayer.playerId ??
      ""
  ).trim();

  if (rawId) {
    const byId = AUCTION_PLAYERS.find(
      (player) => String(player.id) === rawId
    );

    if (byId) return byId;
  }

  const rawName = String(
    rawPlayer.name ??
      rawPlayer.player_name ??
      rawPlayer.playerName ??
      ""
  )
    .trim()
    .toLowerCase();

  if (rawName) {
    const byName = AUCTION_PLAYERS.find(
      (player) =>
        String(player.name ?? "")
          .trim()
          .toLowerCase() === rawName
    );

    if (byName) return byName;
  }

  return null;
};

/* =========================================================
   COMPONENT
========================================================= */

function TeamOwnerDashboard({
  currentUser,
  onLogout,
  authError,
}) {
  const [auctionState, setAuctionState] = useState(null);
  const [loading, setLoading] = useState(true);
  const [connectionError, setConnectionError] = useState("");

  const [playerListOpen, setPlayerListOpen] =
    useState(false);
  const [playerListSearch, setPlayerListSearch] =
    useState("");
  const [playerListFilter, setPlayerListFilter] =
    useState("ALL");

  /* =======================================================
     LOAD LIVE AUCTION STATE
  ======================================================= */

  const loadAuctionState = useCallback(async () => {
    try {
      setConnectionError("");

      const { data, error } = await supabase
        .from("auction_state")
        .select("state, updated_at")
        .eq("id", 1)
        .maybeSingle();

      if (error) throw error;

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
  }, []);

  /* =======================================================
     REALTIME SYNC
  ======================================================= */

  useEffect(() => {
    let mounted = true;

    const initialize = async () => {
      await loadAuctionState();
    };

    void initialize();

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
          if (!mounted || !payload.new?.state) {
            return;
          }

          setAuctionState(
            normalizeAuctionState(payload.new.state)
          );
          setConnectionError("");
          setLoading(false);
        }
      )
      .subscribe((status) => {
        if (!mounted) return;

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

  /* =======================================================
     TEAMS
  ======================================================= */

  const teams = useMemo(() => {
    const stateTeams = auctionState?.teams;

    if (!Array.isArray(stateTeams)) {
      return FALLBACK_TEAMS;
    }

    return stateTeams.map((team) => {
      const teamAssetId = String(
        team.id ?? ""
      )
        .trim()
        .replace(/^TEAM\s+/i, "team-")
        .toLowerCase();

      return {
        ...team,
        logo:
          team.logo ||
          `/assets/teams/${teamAssetId}.png`,
        owner:
          team.owner ||
          `/assets/owners/${teamAssetId}.webp`,
      };
    });
  }, [auctionState]);

  /* =======================================================
     CURRENT TEAM
  ======================================================= */

  const teamId = useMemo(
    () => String(currentUser?.team_id ?? "").trim(),
    [currentUser]
  );

  const myTeam = useMemo(() => {
    if (!teamId) return null;

    return (
      teams.find(
        (team) =>
          getTeamId(team).toLowerCase() ===
          teamId.toLowerCase()
      ) ?? null
    );
  }, [teamId, teams]);

  const fallbackTeam = useMemo(() => {
    if (!teamId) return null;

    return (
      FALLBACK_TEAMS.find(
        (team) =>
          getTeamId(team).toLowerCase() ===
          teamId.toLowerCase()
      ) ?? null
    );
  }, [teamId]);

  const displayTeam = myTeam ?? fallbackTeam;
  const teamName = getTeamName(displayTeam);
  const teamLogo = getTeamLogo(displayTeam);

  /* =======================================================
     SQUAD
  ======================================================= */

  const squadPlayers = useMemo(() => {
    const playersFromTeam = getSquadPlayers(myTeam);

    if (playersFromTeam.length > 0) {
      return playersFromTeam;
    }

    const soldPlayers = auctionState?.soldPlayers;

    if (!Array.isArray(soldPlayers)) {
      return [];
    }

    return soldPlayers.filter(
      (player) =>
        getSoldTeam(player).toLowerCase() ===
        teamId.toLowerCase()
    );
  }, [myTeam, auctionState, teamId]);

  const squadCount = squadPlayers.length;

  /* =======================================================
     PURSE
  ======================================================= */

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
        return Math.max(0, Number(possiblePurse));
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

  const spent = Math.max(0, STARTING_PURSE - purse);
  const slotsRemaining = Math.max(
    0,
    MAX_SQUAD_SIZE - squadCount
  );

  /* =======================================================
     CURRENT PLAYER

     IMPORTANT: currentPlayerIndex comes from Supabase, but
     player details always come from players.js.
  ======================================================= */

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

    const remotePlayer =
      auctionState?.currentPlayer;

    const canonicalPlayer =
      getCanonicalPlayer(remotePlayer);

    if (canonicalPlayer) {
      return canonicalPlayer;
    }

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
          const canonicalFromTicker =
            AUCTION_PLAYERS.find(
              (player) =>
                player.playerName
                  .toLowerCase() ===
                playerName.toLowerCase()
            );

          if (canonicalFromTicker) {
            return canonicalFromTicker;
          }
        }
      }
    }

    return null;
  }, [auctionState]);

  /* =======================================================
     LIVE AUCTION VALUES
  ======================================================= */

  const highestBidder = String(
    auctionState?.highestBidder ??
      auctionState?.highest_bidder ??
      auctionState?.highestBidderName ??
      auctionState?.highest_bidder_name ??
      ""
  );

  const storedCurrentBid = Number(
    auctionState?.currentBid ??
      auctionState?.current_bid ??
      getPlayerBasePrice(currentPlayer)
  );

  /*
   * If nobody has bid on the current player yet, the current
   * bid must always equal the canonical base price from
   * players.js. This also fixes older Supabase state that may
   * still contain a previous base price such as ₹500.
   */
  const currentBid =
    !highestBidder && currentPlayer
      ? getPlayerBasePrice(currentPlayer)
      : storedCurrentBid;

  const auctionStatus = String(
    auctionState?.auctionStatus ??
      auctionState?.auction_status ??
      auctionState?.status ??
      "waiting"
  ).toLowerCase();

  const timerStartedAt = Number(
    auctionState?.timerStartedAt ??
      auctionState?.timer_started_at ??
      0
  );

  const persistedTimerRemaining = Number(
    auctionState?.bidTimeRemaining ??
      auctionState?.bid_time_remaining ??
      0
  );

  const [liveTimerRemaining, setLiveTimerRemaining] =
    useState(persistedTimerRemaining);

  useEffect(() => {
    const calculateRemaining = () => {
      const isAuctionLive =
        auctionStatus === "live" ||
        auctionStatus === "bidding" ||
        auctionStatus === "active";

      if (!isAuctionLive || !timerStartedAt) {
        setLiveTimerRemaining(
          persistedTimerRemaining
        );
        return;
      }

      const remaining = Math.max(
        0,
        BID_DURATION_SECONDS -
          Math.floor(
            (Date.now() - timerStartedAt) /
              1000
          )
      );

      setLiveTimerRemaining(remaining);
    };

    calculateRemaining();

    const interval = setInterval(
      calculateRemaining,
      1000
    );

    return () => clearInterval(interval);
  }, [
    auctionStatus,
    timerStartedAt,
    persistedTimerRemaining,
  ]);

  const timerRemaining = liveTimerRemaining;

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
        : auctionStatus === "ended"
          ? "AUCTION ENDED"
          : "WAITING";

  const statusClass = isLive
    ? "live"
    : isSold
      ? "sold"
      : "waiting";

  const currentBidderIsUs =
    highestBidder.toLowerCase() ===
    teamId.toLowerCase();

  /* =======================================================
     PLAYER LIST

     The owner portal gets the complete player list directly
     from players.js. Auction state is used only to show the
     live status / sold information.
  ======================================================= */

  const playerListRows = useMemo(() => {
    const soldPlayers = Array.isArray(
      auctionState?.soldPlayers
    )
      ? auctionState.soldPlayers
      : [];

    const currentIndex = Number(
      auctionState?.currentPlayerIndex
    );

    const search = playerListSearch
      .trim()
      .toLowerCase();

    return AUCTION_PLAYERS.map((player, index) => {
      const soldRecord = soldPlayers.find((sold) => {
        const soldId = getPlayerId(sold);
        const soldNumber = String(
          sold?.playerNumber ??
            sold?.player_number ??
            ""
        );
        const soldName = getPlayerName(sold)
          .trim()
          .toLowerCase();

        return (
          (soldId && soldId === String(player.id)) ||
          (soldNumber &&
            soldNumber === String(player.playerNumber)) ||
          (soldName &&
            soldName ===
              String(player.name)
                .trim()
                .toLowerCase())
        );
      });

      let status = "UPCOMING";

      if (soldRecord) {
        status = "SOLD";
      } else if (
        Number.isInteger(currentIndex) &&
        index === currentIndex
      ) {
        status = "LIVE";
      } else if (
        Number.isInteger(currentIndex) &&
        index < currentIndex
      ) {
        status = "UNSOLD";
      }

      return {
        ...player,
        status,
        soldRecord,
      };
    }).filter((player) => {
      const matchesSearch =
        !search ||
        String(player.name)
          .toLowerCase()
          .includes(search) ||
        String(player.department ?? "")
          .toLowerCase()
          .includes(search) ||
        String(player.year ?? "")
          .toLowerCase()
          .includes(search);

      const matchesFilter =
        playerListFilter === "ALL" ||
        player.status === playerListFilter;

      return matchesSearch && matchesFilter;
    });
  }, [
    auctionState,
    playerListFilter,
    playerListSearch,
  ]);

  const playerListCounts = useMemo(() => {
    const soldPlayers = Array.isArray(
      auctionState?.soldPlayers
    )
      ? auctionState.soldPlayers
      : [];

    const currentIndex = Number(
      auctionState?.currentPlayerIndex
    );

    let sold = 0;
    let live = 0;
    let unsold = 0;
    let upcoming = 0;

    AUCTION_PLAYERS.forEach((player, index) => {
      const soldRecord = soldPlayers.find((soldPlayer) => {
        const soldId = getPlayerId(soldPlayer);
        const soldNumber = String(
          soldPlayer?.playerNumber ??
            soldPlayer?.player_number ??
            ""
        );
        const soldName = getPlayerName(soldPlayer)
          .trim()
          .toLowerCase();

        return (
          (soldId && soldId === String(player.id)) ||
          (soldNumber &&
            soldNumber === String(player.playerNumber)) ||
          (soldName &&
            soldName ===
              String(player.name)
                .trim()
                .toLowerCase())
        );
      });

      if (soldRecord) {
        sold += 1;
      } else if (
        Number.isInteger(currentIndex) &&
        index === currentIndex
      ) {
        live += 1;
      } else if (
        Number.isInteger(currentIndex) &&
        index < currentIndex
      ) {
        unsold += 1;
      } else {
        upcoming += 1;
      }
    });

    return {
      all: AUCTION_PLAYERS.length,
      sold,
      live,
      unsold,
      upcoming,
    };
  }, [auctionState]);

  /* =======================================================
     DISPLAY VALUES
  ======================================================= */

  const playerBasePrice =
    getPlayerBasePrice(currentPlayer);

  const playerImage =
    getPlayerImage(currentPlayer);

  const playerResumeUrl =
    getResumeUrl(currentPlayer);

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

  /* =======================================================
     LOADING
  ======================================================= */

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

  /* =======================================================
     RENDER
  ======================================================= */

  return (
    <div className="team-owner-page">

      <style>{`
        .team-owner-player-list-button {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          height: 40px;
          padding: 0 13px;
          border: 1px solid rgba(255,255,255,0.10);
          background: rgba(255,255,255,0.025);
          color: #f2f4f7;
          border-radius: 7px;
          font: inherit;
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 0.06em;
          cursor: pointer;
          transition: 0.2s ease;
        }
        .team-owner-player-list-button:hover {
          border-color: rgba(0,230,118,0.35);
          background: rgba(0,230,118,0.07);
          color: #00e676;
        }
        .team-owner-player-list-button strong {
          min-width: 22px;
          height: 22px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
          background: rgba(255,255,255,0.08);
          font-size: 10px;
        }
        .team-owner-player-list-overlay {
          position: fixed;
          inset: 0;
          z-index: 9999;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 24px;
          background: rgba(0,0,0,0.78);
          backdrop-filter: blur(8px);
        }
        .team-owner-player-list-modal {
          width: min(1180px, 100%);
          max-height: min(88vh, 900px);
          display: flex;
          flex-direction: column;
          overflow: hidden;
          border: 1px solid rgba(255,255,255,0.10);
          border-radius: 12px;
          background: #0b0e12;
          box-shadow: 0 30px 100px rgba(0,0,0,0.55);
        }
        .team-owner-player-list-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 20px;
          padding: 24px 26px 20px;
          border-bottom: 1px solid rgba(255,255,255,0.08);
        }
        .team-owner-player-list-header span {
          color: #727b88;
          font-size: 10px;
          font-weight: 900;
          letter-spacing: 0.16em;
        }
        .team-owner-player-list-header h2 {
          margin: 5px 0 4px;
          color: #f5f7fa;
          font-size: 27px;
          line-height: 1.1;
        }
        .team-owner-player-list-header p {
          margin: 0;
          color: #747d89;
          font-size: 12px;
        }
        .team-owner-player-list-close {
          width: 38px;
          height: 38px;
          flex: 0 0 auto;
          display: grid;
          place-items: center;
          border: 1px solid rgba(255,255,255,0.09);
          border-radius: 7px;
          background: rgba(255,255,255,0.025);
          color: #aab1bb;
          cursor: pointer;
        }
        .team-owner-player-list-close:hover {
          color: #fff;
          background: rgba(255,255,255,0.07);
        }
        .team-owner-player-list-summary {
          display: flex;
          gap: 8px;
          padding: 14px 26px;
          border-bottom: 1px solid rgba(255,255,255,0.07);
          overflow-x: auto;
        }
        .team-owner-player-list-summary button {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          white-space: nowrap;
          padding: 8px 11px;
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 6px;
          background: transparent;
          color: #818a96;
          font: inherit;
          font-size: 10px;
          font-weight: 900;
          letter-spacing: 0.08em;
          cursor: pointer;
        }
        .team-owner-player-list-summary button strong {
          color: #dce1e7;
        }
        .team-owner-player-list-summary button.active,
        .team-owner-player-list-summary button:hover {
          border-color: rgba(0,230,118,0.30);
          background: rgba(0,230,118,0.06);
          color: #00e676;
        }
        .team-owner-player-list-toolbar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 14px;
          padding: 14px 26px;
        }
        .team-owner-player-list-search {
          min-width: 260px;
          flex: 1;
          display: flex;
          align-items: center;
          gap: 9px;
          padding: 0 12px;
          height: 40px;
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 7px;
          background: rgba(255,255,255,0.025);
          color: #69727e;
        }
        .team-owner-player-list-search input {
          width: 100%;
          border: 0;
          outline: 0;
          background: transparent;
          color: #f2f4f7;
          font: inherit;
          font-size: 12px;
        }
        .team-owner-player-list-search input::placeholder {
          color: #59616c;
        }
        .team-owner-player-list-toolbar > span {
          color: #69727e;
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 0.08em;
          white-space: nowrap;
        }
        .team-owner-player-list-table-wrap {
          margin: 0 26px;
          overflow: hidden;
          border: 1px solid rgba(255,255,255,0.07);
          border-radius: 8px;
        }
        .team-owner-player-list-table-head,
        .team-owner-player-list-row {
          display: grid;
          grid-template-columns: minmax(250px, 1.7fr) minmax(180px, 1fr) 150px 110px;
          align-items: center;
          column-gap: 18px;
        }
        .team-owner-player-list-table-head {
          min-height: 38px;
          padding: 0 16px;
          background: rgba(255,255,255,0.025);
          color: #626b77;
          font-size: 9px;
          font-weight: 900;
          letter-spacing: 0.12em;
        }
        .team-owner-player-list-table-body {
          max-height: 48vh;
          overflow-y: auto;
        }
        .team-owner-player-list-row {
          min-height: 68px;
          padding: 9px 16px;
          border-top: 1px solid rgba(255,255,255,0.055);
        }
        .team-owner-player-list-row:hover {
          background: rgba(255,255,255,0.018);
        }
        .team-owner-player-list-player {
          display: flex;
          align-items: center;
          gap: 11px;
          min-width: 0;
        }
        .team-owner-player-list-avatar {
          width: 43px;
          height: 43px;
          min-width: 43px;
          overflow: hidden;
          display: grid;
          place-items: center;
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 50%;
          background: #151a20;
          color: #6f7884;
        }
        .team-owner-player-list-avatar img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }
        .team-owner-player-list-player > div:last-child {
          min-width: 0;
        }
        .team-owner-player-list-player strong,
        .team-owner-player-list-details strong,
        .team-owner-player-list-price strong {
          display: block;
          color: #e9edf2;
          font-size: 12px;
        }
        .team-owner-player-list-player span,
        .team-owner-player-list-details span,
        .team-owner-player-list-price span {
          display: block;
          margin-top: 3px;
          color: #626b77;
          font-size: 9px;
          line-height: 1.35;
        }
        .team-owner-player-list-details strong {
          color: #aeb6c0;
        }
        .team-owner-player-list-price strong {
          color: #00e676;
        }
        .team-owner-player-list-status span {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-width: 78px;
          padding: 6px 8px;
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 5px;
          color: #7c8591;
          font-size: 9px;
          font-weight: 900;
          letter-spacing: 0.07em;
        }
        .status-live .team-owner-player-list-status span {
          border-color: rgba(0,230,118,0.30);
          background: rgba(0,230,118,0.07);
          color: #00e676;
        }
        .status-sold .team-owner-player-list-status span {
          border-color: rgba(255,190,60,0.28);
          background: rgba(255,190,60,0.06);
          color: #ffc34d;
        }
        .status-unsold .team-owner-player-list-status span {
          color: #a0a8b2;
        }
        .status-upcoming .team-owner-player-list-status span {
          color: #68717d;
        }
        .team-owner-player-list-empty {
          padding: 50px 20px;
          text-align: center;
          color: #707985;
          font-size: 12px;
        }
        .team-owner-player-list-footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          padding: 16px 26px 20px;
        }
        .team-owner-player-list-footer span {
          color: #59616c;
          font-size: 10px;
        }
        .team-owner-player-list-footer button {
          min-width: 82px;
          padding: 9px 14px;
          border: 1px solid rgba(0,230,118,0.25);
          border-radius: 6px;
          background: rgba(0,230,118,0.07);
          color: #00e676;
          font: inherit;
          font-size: 10px;
          font-weight: 900;
          letter-spacing: 0.08em;
          cursor: pointer;
        }
        .team-owner-player-resume {
  margin-top: 16px;
}

.team-owner-player-resume-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 38px;
  padding: 0 15px;
  border: 1px solid rgba(0, 230, 118, 0.28);
  border-radius: 6px;
  background: rgba(0, 230, 118, 0.07);
  color: #00e676;
  text-decoration: none;
  font-size: 10px;
  font-weight: 900;
  letter-spacing: 0.09em;
  transition: 0.2s ease;
}

.team-owner-player-resume-button:hover {
  border-color: rgba(0, 230, 118, 0.55);
  background: rgba(0, 230, 118, 0.13);
}

.team-owner-player-resume-unavailable {
  display: inline-flex;
  align-items: center;
  min-height: 38px;
  padding: 0 15px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 6px;
  color: #646d78;
  font-size: 9px;
  font-weight: 900;
  letter-spacing: 0.08em;
}

        @media (max-width: 900px) {
          .team-owner-player-list-button span { display: none; }
          .team-owner-player-list-button { padding: 0 10px; }
          .team-owner-player-list-table-head,
          .team-owner-player-list-row {
            grid-template-columns: minmax(220px, 1.5fr) minmax(150px, 1fr) 120px 95px;
            column-gap: 10px;
          }
        }
        @media (max-width: 700px) {
          .team-owner-player-list-overlay { padding: 10px; }
          .team-owner-player-list-modal { max-height: 94vh; }
          .team-owner-player-list-header,
          .team-owner-player-list-summary,
          .team-owner-player-list-toolbar,
          .team-owner-player-list-footer { padding-left: 16px; padding-right: 16px; }
          .team-owner-player-list-toolbar { align-items: stretch; flex-direction: column; }
          .team-owner-player-list-table-wrap { margin: 0 16px; overflow-x: auto; }
          .team-owner-player-list-table-head,
          .team-owner-player-list-row { min-width: 700px; }
          .team-owner-player-list-table-body { max-height: 58vh; }
          .team-owner-player-list-footer { align-items: flex-start; flex-direction: column; }
        }
      `}</style>
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

          <button
            type="button"
            className="team-owner-player-list-button"
            onClick={() => {
              setPlayerListOpen(true);
              setPlayerListSearch("");
              setPlayerListFilter("ALL");
            }}
            title="View all players"
          >
            <Users size={17} />
            <span>PLAYER LIST</span>
            <strong>{AUCTION_PLAYERS.length}</strong>
          </button>

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

      {(authError || connectionError) && (
        <div className="team-owner-alert">
          <X size={17} />
          <span>
            {connectionError || authError}
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
                    .replace(/TEAM\s*/i, "")
                    .padStart(2, "0")}
                </div>
              )}
            </div>

            <div>
              <span className="team-owner-eyebrow">
                YOUR FRANCHISE
              </span>

              <h1>{teamName}</h1>
              <p>Live team command center</p>
            </div>
          </div>

          <div className="team-owner-secure-badge">
            <ShieldCheck size={19} />

            <div>
              <strong>VIEW ONLY ACCESS</strong>
              <span>
                Auction controls are managed by the
                operator
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
              <strong>{formatCurrency(purse)}</strong>
            </div>
          </div>

          <div className="team-owner-stat-card">
            <div className="team-owner-stat-icon">
              <CircleDollarSign size={21} />
            </div>
            <div>
              <span>TOTAL SPENT</span>
              <strong>{formatCurrency(spent)}</strong>
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
                <small>/{MAX_SQUAD_SIZE}</small>
              </strong>
            </div>
          </div>

          <div className="team-owner-stat-card">
            <div className="team-owner-stat-icon">
              <Zap size={21} />
            </div>
            <div>
              <span>SLOTS REMAINING</span>
              <strong>{slotsRemaining}</strong>
            </div>
          </div>
        </section>

        <section className="team-owner-content">
          <div className="team-owner-auction-column">
            <div className="team-owner-section-heading">
              <div>
                <span>LIVE AUCTION FLOOR</span>
                <h2>Current Player</h2>
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
                    <span>PLAYER PHOTO</span>
                  </div>
                )}

                {displayPlayerId && (
                  <div className="team-owner-player-number">
                    {String(displayPlayerId).startsWith(
                      "#"
                    )
                      ? displayPlayerId
                      : `#${displayPlayerId}`}
                  </div>
                )}
              </div>

              <div className="team-owner-player-details">
                <span className="team-owner-player-kicker">
                  CURRENT LOT
                </span>

                <h3>{displayPlayerName}</h3>

                <div className="team-owner-player-meta">
                  <span>{displayPlayerRole}</span>

                  {currentPlayer?.department && (
                    <span>
                      {currentPlayer.department}
                    </span>
                  )}

                  {currentPlayer?.year && (
                    <span>
                      YEAR {currentPlayer.year}
                    </span>
                  )}
                </div>

                <div className="team-owner-base-price">
  <span>BASE PRICE</span>
  <strong>
    {formatCurrency(playerBasePrice)}
  </strong>
</div>

<div className="team-owner-player-resume">
  {playerResumeUrl ? (
    <a
      href={playerResumeUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="team-owner-player-resume-button"
    >
      VIEW RESUME
    </a>
  ) : (
    <span className="team-owner-player-resume-unavailable">
      RESUME NOT AVAILABLE
    </span>
  )}
</div>
              </div>
            </div>

            <div className="team-owner-bid-panel">
              <div className="team-owner-bid-main">
                <span>CURRENT BID</span>
                <strong>
                  {formatCurrency(currentBid)}
                </strong>
              </div>

              <div className="team-owner-bid-divider" />

              <div className="team-owner-bidder">
                <span>HIGHEST BIDDER</span>

                <strong
                  className={
                    currentBidderIsUs ? "mine" : ""
                  }
                >
                  {highestBidder ||
                    "WAITING FOR BID"}
                </strong>

                {currentBidderIsUs && (
                  <small>
                    YOUR TEAM IS CURRENTLY LEADING
                  </small>
                )}
              </div>

              <div className="team-owner-bid-divider" />

              <div className="team-owner-timer">
                <Clock3 size={17} />
                <div>
                  <span>BID TIMER</span>
                  <strong>{timerRemaining}s</strong>
                </div>
              </div>
            </div>

            <div className="team-owner-notice">
              <Radio size={17} />
              <span>
                This screen updates automatically when
                the auction operator changes the live
                auction state.
              </span>
            </div>
          </div>

          <aside className="team-owner-squad-column">
            <div className="team-owner-section-heading">
              <div>
                <span>YOUR FRANCHISE</span>
                <h2>Squad</h2>
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
                    Your purchased players will appear
                    here automatically.
                  </span>
                </div>
              ) : (
                <div className="team-owner-squad-list">
                  {squadPlayers.map((player, index) => {
                    const canonicalPlayer =
                      getCanonicalPlayer(player);
                    const squadPlayerImage =
                      getPlayerImage(canonicalPlayer) ||
                      getPlayerImage(player);

                    return (
                      <div
                        className="team-owner-squad-player"
                        key={
                          getPlayerId(player) ||
                          `${getPlayerName(player)}-${index}`
                        }
                      >
                        <div className="team-owner-squad-avatar">
                          {squadPlayerImage ? (
                            <img
                              src={squadPlayerImage}
                              alt={getPlayerName(player)}
                            />
                          ) : (
                            <Users size={19} />
                          )}
                        </div>

                        <div className="team-owner-squad-player-info">
                          <strong>
                            {getPlayerName(player)}
                          </strong>
                          <span>
                            {getPlayerRole(
                              canonicalPlayer || player
                            )}
                          </span>
                        </div>

                        <div className="team-owner-squad-price">
                          <span>SOLD</span>
                          <strong>
                            {formatCurrency(
                              getSoldPrice(player)
                            )}
                          </strong>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {squadCount < MAX_SQUAD_SIZE && (
                <div className="team-owner-open-slots">
                  <span>OPEN SLOTS</span>
                  <strong>{slotsRemaining}</strong>
                </div>
              )}
            </div>

            <div className="team-owner-budget-card">
              <div className="team-owner-budget-heading">
                <span>PURSE UTILIZATION</span>
                <strong>
                  {STARTING_PURSE > 0
                    ? Math.min(
                        100,
                        Math.round(
                          (spent / STARTING_PURSE) *
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
                        (spent / STARTING_PURSE) *
                          100
                      )
                    )}%`,
                  }}
                />
              </div>

              <div className="team-owner-budget-values">
                <span>
                  Spent {formatCurrency(spent)}
                </span>
                <span>
                  Budget {formatCurrency(STARTING_PURSE)}
                </span>
              </div>
            </div>
          </aside>
        </section>
      </main>

      {playerListOpen && (
        <div
          className="team-owner-player-list-overlay"
          onClick={() => setPlayerListOpen(false)}
        >
          <div
            className="team-owner-player-list-modal"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="team-owner-player-list-header">
              <div>
                <span>PLAYER MANAGEMENT</span>
                <h2>PLAYER LIST</h2>
                <p>
                  Complete DPL auction pool with live player status.
                </p>
              </div>

              <button
                type="button"
                className="team-owner-player-list-close"
                onClick={() => setPlayerListOpen(false)}
                aria-label="Close player list"
              >
                <X size={20} />
              </button>
            </div>

            <div className="team-owner-player-list-summary">
              <button
                type="button"
                className={
                  playerListFilter === "ALL"
                    ? "active"
                    : ""
                }
                onClick={() => setPlayerListFilter("ALL")}
              >
                ALL <strong>{playerListCounts.all}</strong>
              </button>
              <button
                type="button"
                className={
                  playerListFilter === "LIVE"
                    ? "active"
                    : ""
                }
                onClick={() => setPlayerListFilter("LIVE")}
              >
                LIVE <strong>{playerListCounts.live}</strong>
              </button>
              <button
                type="button"
                className={
                  playerListFilter === "SOLD"
                    ? "active"
                    : ""
                }
                onClick={() => setPlayerListFilter("SOLD")}
              >
                SOLD <strong>{playerListCounts.sold}</strong>
              </button>
              <button
                type="button"
                className={
                  playerListFilter === "UNSOLD"
                    ? "active"
                    : ""
                }
                onClick={() => setPlayerListFilter("UNSOLD")}
              >
                UNSOLD <strong>{playerListCounts.unsold}</strong>
              </button>
              <button
                type="button"
                className={
                  playerListFilter === "UPCOMING"
                    ? "active"
                    : ""
                }
                onClick={() => setPlayerListFilter("UPCOMING")}
              >
                UPCOMING <strong>{playerListCounts.upcoming}</strong>
              </button>
            </div>

            <div className="team-owner-player-list-toolbar">
              <div className="team-owner-player-list-search">
                <Search size={17} />
                <input
                  type="text"
                  placeholder="Search player, department or year..."
                  value={playerListSearch}
                  onChange={(event) =>
                    setPlayerListSearch(event.target.value)
                  }
                />
              </div>

              <span>
                SHOWING {playerListRows.length} / {AUCTION_PLAYERS.length}
              </span>
            </div>

            <div className="team-owner-player-list-table-wrap">
              <div className="team-owner-player-list-table-head">
                <span>PLAYER</span>
                <span>DETAILS</span>
                <span>BASE PRICE</span>
                <span>STATUS</span>
              </div>

              <div className="team-owner-player-list-table-body">
                {playerListRows.length === 0 ? (
                  <div className="team-owner-player-list-empty">
                    No players match your search.
                  </div>
                ) : (
                  playerListRows.map((player) => {
                    const image = getPlayerImage(player);
                    const soldPrice = player.soldRecord
                      ? getSoldPrice(player.soldRecord)
                      : 0;
                    const soldTeam = player.soldRecord
                      ? getSoldTeam(player.soldRecord)
                      : "";

                    return (
                      <div
                        className={`team-owner-player-list-row status-${player.status.toLowerCase()}`}
                        key={player.id}
                      >
                        <div className="team-owner-player-list-player">
                          <div className="team-owner-player-list-avatar">
                            {image ? (
                              <img
                                src={image}
                                alt={player.name}
                              />
                            ) : (
                              <Users size={18} />
                            )}
                          </div>

                          <div>
                            <strong>{player.name}</strong>
                            <span>{player.playerNumber}</span>
                          </div>
                        </div>

                        <div className="team-owner-player-list-details">
                          <strong>
                            {player.department || "—"}
                          </strong>
                          <span>
                            {player.year || "—"} • {player.set}
                          </span>
                        </div>

                        <div className="team-owner-player-list-price">
                          <strong>
                            {formatCurrency(player.basePrice)}
                          </strong>
                          {player.status === "SOLD" && (
                            <span>
                              SOLD {formatCurrency(soldPrice)}
                              {soldTeam ? ` • ${soldTeam}` : ""}
                            </span>
                          )}
                        </div>

                        <div className="team-owner-player-list-status">
                          <span>{player.status}</span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            <div className="team-owner-player-list-footer">
              <span>
                Player prices are sourced directly from the official player data.
              </span>
              <button
                type="button"
                onClick={() => setPlayerListOpen(false)}
              >
                DONE
              </button>
            </div>
          </div>
        </div>
      )}

      <footer className="team-owner-footer">
        <div>
          <span className="team-owner-footer-live-dot" />
          LIVE SYNC ACTIVE
        </div>

        <span>DPL AUCTION • TEAM OWNER PORTAL</span>
      </footer>
    </div>
  );
}

export default TeamOwnerDashboard;
