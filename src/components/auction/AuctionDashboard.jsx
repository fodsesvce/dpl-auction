import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { supabase } from "../../lib/supabase";
import "./AuctionDashboard.css";
import SoldOverlay from "../SoldOverlay";
import players, {
  clubMembers as clubMemberPlayers,
  outsideParticipants as outsideParticipantPlayers,
} from "../../data/players";

/* =========================================================
   PARTICIPANT IMAGE MAP

   All participant images are stored in:

   public/assets/players/

   The paths below are browser paths, so they start with
   /assets/players/

   IDs are used instead of names wherever possible so small
   differences between participant names and filenames do
   not break the image.
========================================================= */

const PLAYER_IMAGE_MAP = {
  /* =======================================================
     CLUB MEMBERS
  ======================================================= */

  "CLUB-01":
    "/assets/players/GokulJayandan%20R%20S.png",

  "CLUB-02":
    "/assets/players/KIRAN%20RAJ%20M.jpg",

  "CLUB-03":
    "/assets/players/Nithya%20Shiva%20Thirumalaivarathan.jpeg",

  "CLUB-04":
    "/assets/players/Hasini%20J.jpg",

  "CLUB-05":
    "/assets/players/Adhithya%20P.png",

  "CLUB-06":
    "/assets/players/Akshita%20Sriraman.jpeg",

  /* =======================================================
     OUTSIDE PARTICIPANTS
  ======================================================= */

  "OUT-01":
    "/assets/players/Ajith%20Kumar%20G.jpeg",

  "OUT-02":
    "/assets/players/Prakash%20M.png",

  "OUT-03":
    "/assets/players/Kausik%20T.jpg",

  "OUT-04":
    "/assets/players/Priyanka.A.jpeg",

  "OUT-05":
    "/assets/players/Sanjay%20Joshua%20Swaminathan.jpg",

  "OUT-06":
    "/assets/players/Gokul%20M.jpeg",

  "OUT-07":
    "/assets/players/Dawan%20Babu%20K.jpg",

  "OUT-08":
    "/assets/players/Periathai.jpg",

  "OUT-09":
    "/assets/players/BHUVANESHWARAN%20B.jpeg",

  "OUT-10":
    "/assets/players/BALAKRISHNAN%20R.png",

  "OUT-11":
    "/assets/players/RAJESHWARI%20B%20C.jpeg",

  "OUT-12":
    "/assets/players/ASWIN%20KUMAR%20V.jpg",

  "OUT-13":
    "/assets/players/HARI%20PRASATH%20Y.jpg",

  "OUT-14":
    "/assets/players/Jai%20Krishna%20Prasath%20D.jpg",

  "OUT-15":
    "/assets/players/ALAGU%20MANIKANDAN%20S%20.jpeg",

  "OUT-16":
    "/assets/players/BHARATH%20P.jpg",

  "OUT-17":
    "/assets/players/S%20SHUBHAM.jpg",

  "OUT-18":
    "/assets/players/S.Siva%20Sai%20Ram.jpeg",

  "OUT-19":
    "/assets/players/SANTHOSH%20AG.jpeg",

  "OUT-20":
    "/assets/players/SRIVIKASINI.V.jpeg",

  "OUT-21":
    "/assets/players/MUKILASH%20VK.webp",

  "OUT-22":
    "/assets/players/Dinesh%20G.jpeg",

  "OUT-23":
    "/assets/players/ROHITH%20SOUNDAR.png",

  "OUT-24":
    "/assets/players/DHARMA%20DHARSHAN%20G.jpeg",

  "OUT-25":
    "/assets/players/Rohit%20Ram%20JV.jpg",

  "OUT-26":
    "/assets/players/Raghavendhar%20R.webp",

  "OUT-27":
    "/assets/players/Balaji%20B.png",

  "OUT-28":
    "/assets/players/LAKSHMI%20NARAYANAN%20K.jpg",

  "OUT-29":
    "/assets/players/VISHAL%20D.jpg",

  "OUT-30":
    "/assets/players/BIVIN%20KANTH%20V.jpg",

  "OUT-31":
    "/assets/players/RITHIC%20HITESH%20B.jpg",

  "OUT-32":
    "/assets/players/ASHWIN%20M.png",

  "OUT-33":
    "/assets/players/ALLEN%20JONES%20T%20.jpg",

  "OUT-34":
    "/assets/players/NITHIYANANDAM%20S.jpeg",

  "OUT-35":
    "/assets/players/TEEJAS%20K.jpeg",

  "OUT-36":
    "/assets/players/SITHARTH%20A%20.jpg",

  "OUT-37":
    "/assets/players/YESHWANTH%20V%20.jpg",

  "OUT-38":
    "/assets/players/HARISH%20MANI%20E.jpg",

  "OUT-39":
    "/assets/players/K%20BUVANESWARAN.jpg",

  "OUT-40":
    "/assets/players/SIVAKARTHICK.jpeg",

  "OUT-41":
    "/assets/players/RITVIK%20HARIGOVIND%20B.jpg",

  "OUT-42":
    "/assets/players/UTKARSH%20SAI%20SIDHARDH%20K.jpg",

  "OUT-43":
    "/assets/players/ARAVINDRAJAN%20A.jpeg",

  "OUT-44":
    "/assets/players/AKASH%20V.jpeg",

  "OUT-45":
    "/assets/players/CHANDRU%20A.jpeg",
};

/* =========================================================
   PLAYER IMAGE HELPER

   players.js currently contains image: null.

   This helper injects the correct image path without
   changing players.js.
========================================================= */

const withPlayerImage = (player) => ({
  ...player,
  image:
    player.image ||
    PLAYER_IMAGE_MAP[player.id] ||
    null,
});

/* =========================================================
   TEAM OWNER NAME MAP
========================================================= */

const TEAM_OWNER_NAME_BY_ID = {
  "TEAM 01": "Sharan",
  "TEAM 02": "Dharshika",
  "TEAM 03": "Yeseswini",
  "TEAM 04": "Kaviya",
  "TEAM 05": "Kanisha",
  "TEAM 06": "Priyadharshini",
  "TEAM 07": "Sandhoshivany G N",
  "TEAM 08": "Harish",
  "TEAM 09": "Jai Ganesh",
  "TEAM 10": "Tejashree",
};

const getTeamOwnerName = (team) => {
  return (
    team.ownerName ||
    TEAM_OWNER_NAME_BY_ID[team.id] ||
    "OWNER"
  );
};


function AuctionDashboard({
  readOnly = false,
  currentUser = null,
  onLogout,
}) {
  /* =========================================================
     CONSTANTS
  ========================================================= */

  const BID_INCREMENT = 500;
  const STARTING_PURSE = 10000;
  const MAX_SQUAD_SIZE = 5;

  const SOLD_SCREEN_DURATION = 20000;

  /* =========================================================
     AUCTION STATE
  ========================================================= */

  const [auctionStatus, setAuctionStatus] =
    useState("LIVE");

  const [currentBid, setCurrentBid] =
    useState(500);

  const [highestBidder, setHighestBidder] =
    useState(null);

  const [bidFlash, setBidFlash] =
    useState(false);

  const [bidTimeRemaining, setBidTimeRemaining] =
  useState(60);

  const [timerStartedAt, setTimerStartedAt] =
    useState(null);

  const [syncReady, setSyncReady] =
    useState(false);

  const [soldTeam, setSoldTeam] =
    useState(null);

  const [soldOverlayOpen, setSoldOverlayOpen] =
    useState(false);

  const [soldPlayers, setSoldPlayers] =
    useState([]);

  /* =========================================================
     REALTIME SYNC REFS
  ========================================================= */

  const persistTimerRef =
    useRef(null);

  const pendingPersistRef =
    useRef(null);

  const persistInFlightRef =
    useRef(false);

  const lastPersistedSnapshotRef =
    useRef(null);

  const lastRemoteSnapshotRef =
    useRef(null);

  const lastLocalUpdatedAtMsRef =
    useRef(0);

  const lastLocalSnapshotRef =
    useRef(null);

  const realtimeChannelRef =
    useRef(null);

  /* =========================================================
     MANUAL BID STATE
  ========================================================= */

  const [manualBidOpen, setManualBidOpen] =
    useState(false);

  const [manualTeam, setManualTeam] =
    useState("");

  const [manualBidAmount, setManualBidAmount] =
    useState("");

  const [manualError, setManualError] =
    useState("");

  /* =========================================================
     TEAM DATA
  ========================================================= */

  const [teams, setTeams] =
    useState([
      {
        id: "TEAM 01",
        shortName: "STARS",
        name: "MELBOURNE TECH STARS",
        logo: "/assets/teams/team-01.png",
        owner: "/assets/owners/team-01.webp",
        amount: STARTING_PURSE,
      },
      {
        id: "TEAM 02",
        shortName: "COMETS",
        name: "CANBERRA CODE COMETS",
        logo: "/assets/teams/team-02.png",
        owner: "/assets/owners/team-02.webp",
        amount: STARTING_PURSE,
      },
      {
        id: "TEAM 03",
        shortName: "TITANS",
        name: "TOWNSVILLE TECH TITANS",
        logo: "/assets/teams/team-03.png",
        owner: "/assets/owners/team-03.webp",
        amount: STARTING_PURSE,
      },
      {
        id: "TEAM 04",
        shortName: "THUNDER",
        name: "SYDNEY CLOUD THUNDER",
        logo: "/assets/teams/team-04.png",
        owner: "/assets/owners/team-04.webp",
        amount: STARTING_PURSE,
      },
      {
        id: "TEAM 05",
        shortName: "CYCLONES",
        name: "DARWIN DATA CYCLONES",
        logo: "/assets/teams/team-05.png",
        owner: "/assets/owners/team-05.webp",
        amount: STARTING_PURSE,
      },
      {
        id: "TEAM 06",
        shortName: "SIXERS",
        name: "SYDNEY SILICON SIXERS",
        logo: "/assets/teams/team-06.png",
        owner: "/assets/owners/team-06.webp",
        amount: STARTING_PURSE,
      },
      {
        id: "TEAM 07",
        shortName: "GENGARS",
        name: "GEELONG GENGARS",
        logo: "/assets/teams/team-07.png",
        owner: "/assets/owners/team-07.webp",
        amount: STARTING_PURSE,
      },
      {
        id: "TEAM 08",
        shortName: "BYTE HEAT",
        name: "BRISBANE BYTE HEAT",
        logo: "/assets/teams/team-08.png",
        owner: "/assets/owners/team-08.webp",
        amount: STARTING_PURSE,
      },
      {
        id: "TEAM 09",
        shortName: "SCORCHERS",
        name: "PERTH PIXEL SCORCHERS",
        logo: "/assets/teams/team-09.png",
        owner: "/assets/owners/team-09.webp",
        amount: STARTING_PURSE,
      },
      {
        id: "TEAM 10",
        shortName: "BLAZERS",
        name: "NEWCASTLE NETWORK BLAZERS",
        logo: "/assets/teams/team-10.png",
        owner: "/assets/owners/team-10.webp",
        amount: STARTING_PURSE,
      },
    ]);

  /* =========================================================
     PLAYER QUEUE

     Image is injected from PLAYER_IMAGE_MAP.
  ========================================================= */

  const playerQueue = players.map(
    (player, index) => {
      const playerWithImage =
        withPlayerImage(player);

      return {
        ...playerWithImage,

        number:
          `#${String(index + 1).padStart(
            2,
            "0"
          )}`,

        country: "INDIA",

        set:
          player.category ===
          "Club Member"
            ? "CLUB MEMBERS"
            : "OUTSIDE PARTICIPANTS",
      };
    }
  );

  const [currentPlayerIndex, setCurrentPlayerIndex] =
    useState(0);

  const currentPlayer =
    playerQueue[currentPlayerIndex];

  /* =========================================================
     KEPT PLAYERS
  ========================================================= */

  const [keptPlayersOpen, setKeptPlayersOpen] =
    useState(false);

  const [selectedKeptPlayer, setSelectedKeptPlayer] =
    useState(null);

  const [playerSearch, setPlayerSearch] =
    useState("");

  const clubMembers =
    clubMemberPlayers.map(
      (player, index) => ({
        ...withPlayerImage(player),

        playerNumber:
          String(index + 1).padStart(
            2,
            "0"
          ),

        country: "INDIA",
      })
    );

  const outsideParticipants =
    outsideParticipantPlayers.map(
      (player, index) => ({
        ...withPlayerImage(player),

        playerNumber:
          String(index + 1).padStart(
            2,
            "0"
          ),

        country: "INDIA",
      })
    );

  /* =========================================================
     BID HISTORY
  ========================================================= */

  const [bidHistory, setBidHistory] =
    useState([]);

  /* =========================================================
     LIVE NEWS TICKER
  ========================================================= */

  const [tickerMessages, setTickerMessages] =
    useState([
      {
        id: 1,
        type: "start",
        text:
          "AUCTION BEGINS • ROUND 01 • PLAYER AUCTION 2026",
      },
    ]);

  const addTickerMessage = (
    message,
    type = "bid"
  ) => {
    setTickerMessages(
      (previousMessages) =>
        [
          {
            id:
              Date.now() +
              Math.random(),
            type,
            text: message,
          },
          ...previousMessages,
        ].slice(0, 12)
    );
  };

  /* =========================================================
     AUCTION SNAPSHOT
  ========================================================= */

  const auctionSnapshot = useMemo(
    () => ({
      auctionStatus,
      currentBid,
      highestBidder,
      soldTeam,
      soldOverlayOpen,
      soldPlayers,
      teams,
      currentPlayerIndex,
      bidHistory,
      tickerMessages,
      timerStartedAt,
      bidTimeRemaining,
    }),
    [
      auctionStatus,
      currentBid,
      highestBidder,
      soldTeam,
      soldOverlayOpen,
      soldPlayers,
      teams,
      currentPlayerIndex,
      bidHistory,
      tickerMessages,
      timerStartedAt,
      bidTimeRemaining,
    ]
  );

  /* =========================================================
     SNAPSHOT SERIALIZER
  ========================================================= */

  const serializeSnapshot = (
    snapshot
  ) =>
    JSON.stringify(snapshot);

  /* =========================================================
     HYDRATE FROM REMOTE

     IMPORTANT:
     Remote hydration does not write back to Supabase.
  ========================================================= */

  const hydrateFromRemote = (
    remoteState
  ) => {
    if (!remoteState) {
      return;
    }

    lastRemoteSnapshotRef.current =
      serializeSnapshot(
        remoteState
      );

    const remotePlayerIndex = Number(
      remoteState.currentPlayerIndex
    );

    const canonicalRemotePlayer =
      Number.isInteger(remotePlayerIndex) &&
      remotePlayerIndex >= 0 &&
      remotePlayerIndex < playerQueue.length
        ? playerQueue[remotePlayerIndex]
        : null;

    const remoteHighestBidder =
      remoteState.highestBidder ??
      remoteState.highest_bidder ??
      null;

    const remoteCurrentBid = Number(
      remoteState.currentBid ??
        remoteState.current_bid ??
        canonicalRemotePlayer?.basePrice ??
        500
    );

    const effectiveCurrentBid =
      !remoteHighestBidder &&
      canonicalRemotePlayer
        ? canonicalRemotePlayer.basePrice
        : remoteCurrentBid;

    setAuctionStatus(
      remoteState.auctionStatus ??
        remoteState.auction_status ??
        "LIVE"
    );

    setCurrentBid(effectiveCurrentBid);

    setHighestBidder(remoteHighestBidder);

    setSoldTeam(
      remoteState.soldTeam ??
        null
    );

    setSoldOverlayOpen(
      Boolean(
        remoteState.soldOverlayOpen
      )
    );

    setSoldPlayers(
      Array.isArray(
        remoteState.soldPlayers
      )
        ? remoteState.soldPlayers.map(
            (player) => ({
              ...player,

              image:
                player.image ||
                PLAYER_IMAGE_MAP[
                  player.id
                ] ||
                null,
            })
          )
        : []
    );

    setTeams(
      Array.isArray(
        remoteState.teams
      )
        ? remoteState.teams.map(
            (team) => {
              const teamAssetId =
                String(
                  team.id ?? ""
                )
                  .trim()
                  .replace(
                    /^TEAM\s+/i,
                    "team-"
                  )
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
            }
          )
        : []
    );

    setCurrentPlayerIndex(
      Number.isInteger(remotePlayerIndex) &&
        remotePlayerIndex >= 0 &&
        remotePlayerIndex < playerQueue.length
        ? remotePlayerIndex
        : 0
    );

    setBidHistory(
      Array.isArray(
        remoteState.bidHistory
      )
        ? remoteState.bidHistory
        : []
    );

    setTickerMessages(
      Array.isArray(
        remoteState.tickerMessages
      ) &&
        remoteState.tickerMessages
          .length
        ? remoteState.tickerMessages
        : [
            {
              id: 1,
              type: "start",
              text:
                "AUCTION BEGINS • ROUND 01 • PLAYER AUCTION 2026",
            },
          ]
    );

    const remoteTimerStartedAt =
      remoteState.timerStartedAt ??
      null;

    setTimerStartedAt(
      remoteTimerStartedAt
    );

    if (
      remoteState.auctionStatus ===
        "LIVE" &&
      remoteTimerStartedAt
    ) {
      setBidTimeRemaining(
        Math.max(
          0,
          60 -
  Math.floor(
    (Date.now() -
      remoteTimerStartedAt) /
      1000
  )
        )
      );
    } else {
      setBidTimeRemaining(
        Number(
          remoteState.bidTimeRemaining ??
  60
        )
      );
    }
  };

  /* =========================================================
     INITIALIZE REALTIME
  ========================================================= */

  useEffect(() => {
    let mounted = true;

    const applyRealtimeState = (
      payload
    ) => {
      if (
        !mounted ||
        !payload.new?.state
      ) {
        return;
      }

      const remoteState =
        payload.new.state;

      const remoteSnapshot =
        serializeSnapshot(
          remoteState
        );

      const remoteUpdatedAt =
        payload.new.updated_at ??
        null;

      const remoteUpdatedAtMs =
        remoteUpdatedAt
          ? Date.parse(
              remoteUpdatedAt
            )
          : 0;

      /*
       * Ignore our own realtime echo.
       */
      if (
        remoteSnapshot ===
        lastLocalSnapshotRef.current
      ) {
        lastRemoteSnapshotRef.current =
          remoteSnapshot;

        return;
      }

      /*
       * Ignore older/equal remote updates.
       */
      if (
        remoteUpdatedAtMs > 0 &&
        remoteUpdatedAtMs <=
          lastLocalUpdatedAtMsRef.current
      ) {
        return;
      }

      lastRemoteSnapshotRef.current =
        remoteSnapshot;

      hydrateFromRemote(
        remoteState
      );

      setSyncReady(true);
    };

    const initializeRealtime =
      async () => {
        const { data, error } =
          await supabase
            .from("auction_state")
            .select(
              "state, updated_at"
            )
            .eq("id", 1)
            .maybeSingle();

        if (!mounted) {
          return;
        }

        if (error) {
          console.error(
            "DPL auction state load failed:",
            error
          );

          return;
        }

        if (data?.state) {
          const remoteSnapshot =
            serializeSnapshot(
              data.state
            );

          lastRemoteSnapshotRef.current =
            remoteSnapshot;

          lastPersistedSnapshotRef.current =
            remoteSnapshot;

          const remoteUpdatedAtMs =
            data.updated_at
              ? Date.parse(
                  data.updated_at
                )
              : 0;

          if (
            remoteUpdatedAtMs > 0
          ) {
            lastLocalUpdatedAtMsRef.current =
              remoteUpdatedAtMs;
          }

          hydrateFromRemote(
            data.state
          );

          setSyncReady(true);
        } else if (!readOnly) {
          const initialTimerStartedAt =
            Date.now();

          const initialUpdatedAt =
            new Date().toISOString();

          const initialState = {
            auctionStatus: "LIVE",

            currentBid: playerQueue[0]?.basePrice ?? 500,

            highestBidder: null,

            soldTeam: null,

            soldOverlayOpen:
              false,

            soldPlayers: [],

            teams,

            currentPlayerIndex: 0,

            bidHistory: [],

            tickerMessages,

            timerStartedAt:
              initialTimerStartedAt,

            bidTimeRemaining: 60,
          };

          const initialSnapshot =
            serializeSnapshot(
              initialState
            );

          lastPersistedSnapshotRef.current =
            initialSnapshot;

          lastRemoteSnapshotRef.current =
            initialSnapshot;

          lastLocalSnapshotRef.current =
            initialSnapshot;

          lastLocalUpdatedAtMsRef.current =
            Date.parse(
              initialUpdatedAt
            );

          setTimerStartedAt(
            initialTimerStartedAt
          );

          const {
            error: insertError,
          } = await supabase
            .from("auction_state")
            .insert({
              id: 1,
              state: initialState,
              updated_at:
                initialUpdatedAt,
            });

          if (
            insertError &&
            insertError.code !==
              "23505"
          ) {
            console.error(
              "DPL auction state initialization failed:",
              insertError
            );

            lastLocalSnapshotRef.current =
              null;

            lastLocalUpdatedAtMsRef.current =
              0;

            return;
          }

          if (
            insertError?.code ===
            "23505"
          ) {
            lastLocalSnapshotRef.current =
              null;

            lastLocalUpdatedAtMsRef.current =
              0;
          }

          setSyncReady(true);
        } else {
          setSyncReady(true);
        }
      };

    initializeRealtime();

    const channel =
      supabase
        .channel(
          "dpl-auction-state"
        )
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "auction_state",
            filter: "id=eq.1",
          },
          applyRealtimeState
        )
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "auction_state",
            filter: "id=eq.1",
          },
          applyRealtimeState
        )
        .subscribe();

    realtimeChannelRef.current =
      channel;

    return () => {
      mounted = false;

      if (
        persistTimerRef.current
      ) {
        clearTimeout(
          persistTimerRef.current
        );

        persistTimerRef.current =
          null;
      }

      pendingPersistRef.current =
        null;

      if (
        realtimeChannelRef.current
      ) {
        supabase.removeChannel(
          realtimeChannelRef.current
        );
      }

      realtimeChannelRef.current =
        null;
    };
  }, [readOnly]);

  /* =========================================================
     PERSIST AUCTION STATE
  ========================================================= */

  const flushPendingPersist =
    async () => {
      if (
        readOnly ||
        persistInFlightRef.current
      ) {
        return;
      }

      const snapshot =
        pendingPersistRef.current;

      if (!snapshot) {
        return;
      }

      pendingPersistRef.current =
        null;

      persistInFlightRef.current =
        true;

      const snapshotString =
        serializeSnapshot(
          snapshot
        );

      const updatedAt =
        new Date().toISOString();

      const updatedAtMs =
        Date.parse(updatedAt);

      lastPersistedSnapshotRef.current =
        snapshotString;

      lastLocalSnapshotRef.current =
        snapshotString;

      lastLocalUpdatedAtMsRef.current =
        updatedAtMs;

      const { error } =
        await supabase
          .from("auction_state")
          .update({
            state: snapshot,
            updated_at: updatedAt,
          })
          .eq("id", 1);

      persistInFlightRef.current =
        false;

      if (error) {
        console.error(
          "DPL auction state save failed:",
          error
        );

        lastPersistedSnapshotRef.current =
          lastRemoteSnapshotRef.current;

        lastLocalSnapshotRef.current =
          null;

        lastLocalUpdatedAtMsRef.current =
          0;
      } else {
        lastRemoteSnapshotRef.current =
          snapshotString;
      }

      if (
        pendingPersistRef.current
      ) {
        void flushPendingPersist();
      }
    };

  const queueAuctionPersist = (
    snapshot
  ) => {
    if (readOnly) {
      return;
    }

    pendingPersistRef.current =
      snapshot;

    if (
      persistInFlightRef.current
    ) {
      return;
    }

    if (
      persistTimerRef.current
    ) {
      clearTimeout(
        persistTimerRef.current
      );
    }

    persistTimerRef.current =
      setTimeout(() => {
        persistTimerRef.current =
          null;

        void flushPendingPersist();
      }, 100);
  };

  useEffect(() => {
    if (
      readOnly ||
      !syncReady
    ) {
      return;
    }

    const snapshotString =
      serializeSnapshot(
        auctionSnapshot
      );

    if (
      snapshotString ===
      lastPersistedSnapshotRef.current
    ) {
      return;
    }

    if (
      snapshotString ===
      lastRemoteSnapshotRef.current
    ) {
      lastPersistedSnapshotRef.current =
        snapshotString;

      return;
    }

    queueAuctionPersist(
      auctionSnapshot
    );

    return () => {
      if (
        persistTimerRef.current &&
        !persistInFlightRef.current
      ) {
        clearTimeout(
          persistTimerRef.current
        );

        persistTimerRef.current =
          null;
      }
    };
  }, [
    readOnly,
    syncReady,
    auctionStatus,
    currentBid,
    highestBidder,
    soldTeam,
    soldOverlayOpen,
    soldPlayers,
    teams,
    currentPlayerIndex,
    bidHistory,
    tickerMessages,
    timerStartedAt,
  ]);

  /* =========================================================
     1-MINUTE BIDDING TIMER
  ========================================================= */

  useEffect(() => {
    if (
      auctionStatus !== "LIVE" ||
      !timerStartedAt
    ) {
      return;
    }

    const tick = () => {
      const remaining =
        Math.max(
          0,
          60 -
  Math.floor(
    (Date.now() -
      timerStartedAt) /
      1000
  )
        );

      setBidTimeRemaining(
        remaining
      );
    };

    tick();

    const interval =
      setInterval(
        tick,
        1000
      );

    return () =>
      clearInterval(
        interval
      );
  }, [
    auctionStatus,
    currentPlayerIndex,
    timerStartedAt,
  ]);

  /* =========================================================
     TRIGGER BID FLASH
  ========================================================= */

  const triggerBidFlash = () => {
    setBidFlash(true);

    setTimeout(() => {
      setBidFlash(false);
    }, 350);
  };

  /* =========================================================
     APPLY NEW BID
  ========================================================= */

  const applyBid = (
    teamId,
    newBid,
    bidType
  ) => {
    if (readOnly) {
      return false;
    }

    const selectedTeam =
      teams.find(
        (team) =>
          team.id === teamId
      );

    if (!selectedTeam) {
      return false;
    }

    if (
      teamId === highestBidder
    ) {
      return false;
    }

    if (
      selectedTeam.amount <
      newBid
    ) {
      return false;
    }

    const previousHighestTeam =
      teams.find(
        (team) =>
          team.id ===
          highestBidder
      );

    setTeams(
      (previousTeams) =>
        previousTeams.map(
          (team) => {
            if (
              team.id === teamId
            ) {
              return {
                ...team,
                amount:
                  team.amount -
                  newBid,
              };
            }

            if (
              previousHighestTeam &&
              team.id ===
                previousHighestTeam.id
            ) {
              return {
                ...team,
                amount:
                  team.amount +
                  currentBid,
              };
            }

            return team;
          }
        )
    );

    setCurrentBid(
      newBid
    );

    setHighestBidder(
      teamId
    );

    setTimerStartedAt(
      Date.now()
    );

    setBidTimeRemaining(
  60
);

    setBidHistory(
      (previousHistory) =>
        [
          {
            id: Date.now(),
            team: teamId,
            teamName:
              selectedTeam.name,
            amount: newBid,
            timestamp:
              Date.now(),
            type: bidType,
          },
          ...previousHistory,
        ].slice(0, 10)
    );

    addTickerMessage(
      `${teamId} BID ₹${newBid.toLocaleString(
        "en-IN"
      )} • ${currentPlayer.name}`,
      bidType === "MANUAL"
        ? "manual"
        : "bid"
    );

    triggerBidFlash();

    return true;
  };

  /* =========================================================
     QUICK BID
  ========================================================= */

  const placeBid = (
    teamId
  ) => {
    if (
      auctionStatus !== "LIVE"
    ) {
      return;
    }

    if (
      teamId === highestBidder
    ) {
      return;
    }

    const nextBid =
      highestBidder
        ? currentBid +
          BID_INCREMENT
        : currentPlayer.basePrice;

    applyBid(
      teamId,
      nextBid,
      "QUICK"
    );
  };

  /* =========================================================
     MANUAL BID
  ========================================================= */

  const openManualBid = () => {
    if (
      auctionStatus !== "LIVE"
    ) {
      return;
    }

    setManualError("");
    setManualTeam("");
    setManualBidAmount("");
    setManualBidOpen(true);
  };

  const closeManualBid = () => {
    setManualBidOpen(false);
    setManualError("");
    setManualTeam("");
    setManualBidAmount("");
  };

  const placeManualBid = () => {
    setManualError("");

    if (
      auctionStatus !== "LIVE"
    ) {
      setManualError(
        "Auction is not currently live."
      );

      return;
    }

    if (!manualTeam) {
      setManualError(
        "Please select a team."
      );

      return;
    }

    const numericBid =
      Number(manualBidAmount);

    if (
      !manualBidAmount ||
      Number.isNaN(numericBid)
    ) {
      setManualError(
        "Enter a valid bid amount."
      );

      return;
    }

    if (
      numericBid <= currentBid
    ) {
      setManualError(
        `Manual bid must be higher than ₹${currentBid.toLocaleString(
          "en-IN"
        )}.`
      );

      return;
    }

    const selectedTeam =
      teams.find(
        (team) =>
          team.id === manualTeam
      );

    if (!selectedTeam) {
      setManualError(
        "Selected team was not found."
      );

      return;
    }

    if (
      manualTeam === highestBidder
    ) {
      setManualError(
        "The current highest bidder cannot bid again."
      );

      return;
    }

    if (
      selectedTeam.amount <
      numericBid
    ) {
      setManualError(
        `Insufficient purse. Team has only ₹${selectedTeam.amount.toLocaleString(
          "en-IN"
        )} available.`
      );

      return;
    }

    const success =
      applyBid(
        manualTeam,
        numericBid,
        "MANUAL"
      );

    if (!success) {
      setManualError(
        "Unable to place this bid."
      );

      return;
    }

    closeManualBid();
  };

  /* =========================================================
     AUCTION CONTROLS
  ========================================================= */

  const handleStartResume = () => {
    if (readOnly) {
      return;
    }

    if (
      auctionStatus === "SOLD" ||
      auctionStatus === "ENDED"
    ) {
      return;
    }

    setTimerStartedAt(
      Date.now() -
        Math.max(
          0,
          60 -
            bidTimeRemaining
        ) *
          1000
    );

    setAuctionStatus(
      "LIVE"
    );

    setSoldTeam(null);

    setSoldOverlayOpen(
      false
    );

    addTickerMessage(
      `AUCTION LIVE • BIDDING RESUMED • ${currentPlayer.name}`,
      "start"
    );
  };

  const handlePause = () => {
    if (readOnly) {
      return;
    }

    if (
      auctionStatus !== "LIVE"
    ) {
      return;
    }

    setTimerStartedAt(null);

    setAuctionStatus(
      "PAUSED"
    );

    addTickerMessage(
      `AUCTION PAUSED • CURRENT PLAYER: ${currentPlayer.name} • BID ₹${currentBid.toLocaleString(
        "en-IN"
      )}`,
      "pause"
    );
  };

  /* =========================================================
     SELL PLAYER
  ========================================================= */

  const handleSold = () => {
    if (readOnly) {
      return;
    }

    if (
      auctionStatus !== "LIVE"
    ) {
      return;
    }

    if (!highestBidder) {
      return;
    }

    const winningTeam =
      teams.find(
        (team) =>
          team.id ===
          highestBidder
      );

    if (!winningTeam) {
      return;
    }

    const soldRecord = {
      id: Date.now(),

      playerNumber:
        currentPlayer.number,

      playerName:
        currentPlayer.name,

      category:
        currentPlayer.category,

      country:
        currentPlayer.country,

      registerNumber:
        currentPlayer.registerNumber,

      year:
        currentPlayer.year,

      department:
        currentPlayer.department,

      image:
        currentPlayer.image,

      set:
        currentPlayer.set,

      teamId:
        winningTeam.id,

      teamName:
        winningTeam.name,

      teamShortName:
        winningTeam.shortName,

      teamLogo:
        winningTeam.logo,

      finalPrice:
        currentBid,

      remainingPurse:
        winningTeam.amount,

      soldAt:
        Date.now(),
    };

    setSoldPlayers(
      (previousPlayers) => [
        ...previousPlayers,
        soldRecord,
      ]
    );

    setTimerStartedAt(
      null
    );

    setAuctionStatus(
      "SOLD"
    );

    setSoldTeam(
      highestBidder
    );

    setSoldOverlayOpen(
      true
    );

    setManualBidOpen(
      false
    );

    addTickerMessage(
      `PLAYER SOLD • ${currentPlayer.name} • ${winningTeam.id} • ₹${currentBid.toLocaleString(
        "en-IN"
      )}`,
      "sold"
    );
  };

  /* =========================================================
     MARK PLAYER UNSOLD
  ========================================================= */

  const handleUnsold = () => {
    if (readOnly) {
      return;
    }

    if (
      auctionStatus !== "LIVE"
    ) {
      return;
    }

    addTickerMessage(
      `PLAYER UNSOLD • ${currentPlayer.name} • NO TEAM INTEREST`,
      "unsold"
    );

    const nextIndex =
      currentPlayerIndex + 1;

    if (
      nextIndex >=
      playerQueue.length
    ) {
      setSoldOverlayOpen(
        false
      );

      setAuctionStatus(
        "ENDED"
      );

      setSoldTeam(null);

      setHighestBidder(
        null
      );

      setTimerStartedAt(
        null
      );

      setBidTimeRemaining(
        0
      );

      addTickerMessage(
        "AUCTION ENDED • ALL PLAYERS HAVE BEEN AUCTIONED",
        "end"
      );

      return;
    }

    setCurrentPlayerIndex(
      nextIndex
    );

    setCurrentBid(
      playerQueue[
        nextIndex
      ].basePrice
    );

    setHighestBidder(
      null
    );

    setTimerStartedAt(
      Date.now()
    );

    setBidTimeRemaining(
      60
    );

    setSoldTeam(null);

    setSoldOverlayOpen(
      false
    );

    setAuctionStatus(
      "LIVE"
    );

    setBidHistory([]);

    setManualBidOpen(
      false
    );

    addTickerMessage(
      `NEXT PLAYER • ${playerQueue[nextIndex].number} • ${playerQueue[nextIndex].name} • BASE PRICE ₹${playerQueue[
        nextIndex
      ].basePrice.toLocaleString(
        "en-IN"
      )}`,
      "start"
    );
  };

  /* =========================================================
     AUTOMATIC PLAYER CHANGE WHEN TIMER EXPIRES
  ========================================================= */

  useEffect(() => {
    if (
      readOnly ||
      auctionStatus !== "LIVE" ||
      bidTimeRemaining !== 0
    ) {
      return;
    }

    handleUnsold();
  }, [
    bidTimeRemaining,
    auctionStatus,
    readOnly,
  ]);

  /* =========================================================
     CONTINUE TO NEXT PLAYER
  ========================================================= */

  const handleNextPlayer = () => {
    if (readOnly) {
      return;
    }

    const nextIndex =
      currentPlayerIndex + 1;

    if (
      nextIndex >=
      playerQueue.length
    ) {
      setSoldOverlayOpen(
        false
      );

      setAuctionStatus(
        "ENDED"
      );

      setTimerStartedAt(
        null
      );

      setSoldTeam(null);

      addTickerMessage(
        "AUCTION ENDED • ALL PLAYERS HAVE BEEN AUCTIONED",
        "end"
      );

      return;
    }

    setCurrentPlayerIndex(
      nextIndex
    );

    setCurrentBid(
      playerQueue[
        nextIndex
      ].basePrice
    );

    setHighestBidder(
      null
    );

    setTimerStartedAt(
      Date.now()
    );

    setBidTimeRemaining(
      60
    );

    setSoldTeam(null);

    setSoldOverlayOpen(
      false
    );

    setAuctionStatus(
      "LIVE"
    );

    setBidHistory([]);

    setManualBidOpen(
      false
    );

    addTickerMessage(
      `NEXT PLAYER • ${playerQueue[nextIndex].number} • ${playerQueue[nextIndex].name} • BASE PRICE ₹${playerQueue[
        nextIndex
      ].basePrice.toLocaleString(
        "en-IN"
      )}`,
      "start"
    );
  };

  /* =========================================================
     AUTOMATIC SOLD SCREEN TIMER
  ========================================================= */

  const latestSoldPlayer =
    soldPlayers.length > 0
      ? soldPlayers[
          soldPlayers.length - 1
        ]
      : null;

  useEffect(() => {
    if (
      readOnly ||
      !soldOverlayOpen ||
      !latestSoldPlayer
    ) {
      return;
    }

    const timer =
      setTimeout(() => {
        handleNextPlayer();
      }, SOLD_SCREEN_DURATION);

    return () => {
      clearTimeout(timer);
    };
  }, [
    soldOverlayOpen,
    latestSoldPlayer,
    readOnly,
  ]);

  /* =========================================================
     END AUCTION
  ========================================================= */

  const handleEndAuction = () => {
    if (readOnly) {
      return;
    }

    setTimerStartedAt(
      null
    );

    setAuctionStatus(
      "ENDED"
    );

    setManualBidOpen(
      false
    );

    setSoldOverlayOpen(
      false
    );

    addTickerMessage(
      `AUCTION ENDED • ROUND 01 • FINAL BID ₹${currentBid.toLocaleString(
        "en-IN"
      )}`,
      "end"
    );
  };

  /* =========================================================
     KEPT PLAYER SEARCH
  ========================================================= */

  const filteredClubMembers =
    useMemo(() => {
      const query =
        playerSearch
          .toLowerCase()
          .trim();

      if (!query) {
        return clubMembers;
      }

      return clubMembers.filter(
        (player) =>
          player.name
            .toLowerCase()
            .includes(query) ||
          player.category
            .toLowerCase()
            .includes(query)
      );
    }, [
      playerSearch,
      clubMembers,
    ]);

  const filteredOutsideParticipants =
    useMemo(() => {
      const query =
        playerSearch
          .toLowerCase()
          .trim();

      if (!query) {
        return outsideParticipants;
      }

      return outsideParticipants.filter(
        (player) =>
          player.name
            .toLowerCase()
            .includes(query) ||
          player.category
            .toLowerCase()
            .includes(query)
      );
    }, [
      playerSearch,
      outsideParticipants,
    ]);

  const totalKeptPlayers =
    clubMembers.length +
    outsideParticipants.length;

  /* =========================================================
     SOLD SCREEN STATISTICS
  ========================================================= */

  const totalPlayersSold =
    soldPlayers.length;

  const winningTeamSquadSize =
    latestSoldPlayer
      ? soldPlayers.filter(
          (player) =>
            player.teamId ===
            latestSoldPlayer.teamId
        ).length
      : 0;

  const slotsRemaining =
    Math.max(
      0,
      MAX_SQUAD_SIZE -
        winningTeamSquadSize
    );

  /* =========================================================
     NEXT PLAYER
  ========================================================= */

  const nextPlayer =
    currentPlayerIndex + 1 <
    playerQueue.length
      ? playerQueue[
          currentPlayerIndex + 1
        ]
      : null;

  /* =========================================================
     TICKER DUPLICATION
  ========================================================= */

  const tickerItems =
    tickerMessages.length > 0
      ? [
          ...tickerMessages,
          ...tickerMessages,
        ]
      : [
          {
            id: 999,
            type: "start",
            text:
              "AUCTION BEGINS • ROUND 01 • PLAYER AUCTION 2026",
          },
        ];

  /* =========================================================
     RENDER
  ========================================================= */

  if (!syncReady) {
    return (
      <div className="auction-sync-loading">
        <img
          src="/assets/logo/dpl-logo.png"
          alt="DPL"
        />

        <strong>
          CONNECTING TO LIVE AUCTION
        </strong>

        <span>
          {readOnly
            ? "Waiting for the operator to initialize the auction..."
            : "Loading auction state..."}
        </span>
      </div>
    );
  }

  return (
    <div className="auction-dashboard">

      {/* =====================================================
          HEADER
      ===================================================== */}

      <header className="auction-header">

        <div className="auction-header-left">

          <img
            src="/assets/logo/dpl-logo.png"
            alt="DPL"
            className="auction-logo"
          />

          <div>
            <h1>DPL AUCTION</h1>

            <span>
              PLAYER AUCTION 2026
            </span>
          </div>

        </div>

        <div
          className={`live-status status-${auctionStatus.toLowerCase()}`}
        >
          <span className="live-dot"></span>

          {auctionStatus === "LIVE"
            ? "LIVE AUCTION"
            : auctionStatus ===
                "PAUSED"
              ? "AUCTION PAUSED"
              : auctionStatus ===
                  "SOLD"
                ? "PLAYER SOLD"
                : "AUCTION ENDED"}
        </div>

        <div className="header-right">

          <button
            className="kept-players-button"
            onClick={() =>
              setKeptPlayersOpen(
                true
              )
            }
          >
            <span className="kept-icon">
              ◈
            </span>

            <span>
              KEPT PLAYERS
            </span>

            <strong>
              {totalKeptPlayers}
            </strong>
          </button>

          <div
            className={`auction-session-badge ${
              readOnly
                ? "viewer"
                : "operator"
            }`}
          >
            {readOnly
              ? currentUser?.team_id ||
                "TEAM VIEWER"
              : "OPERATOR"}
          </div>

          <div className="auction-round">
            ROUND 01
          </div>

          {onLogout && (
            <button
              className="auction-logout-button"
              onClick={onLogout}
            >
              LOGOUT
            </button>
          )}

        </div>

      </header>

      {/* =====================================================
          MAIN
      ===================================================== */}

      <main className="auction-main">

        {/* ===================================================
            AUCTION CONTROL
        =================================================== */}

        <section className="auction-controls-section">

          <div className="section-label">
            AUCTION CONTROL
          </div>

          <div className="auction-controls">

            <div className="auction-status">

              <span>
                STATUS
              </span>

              <strong
                className={`status-${auctionStatus.toLowerCase()}`}
              >
                {auctionStatus}
              </strong>

              {soldTeam && (
                <small>
                  SOLD TO {soldTeam}
                </small>
              )}

            </div>

            <div className="auction-control-buttons">

              {readOnly ? (
                <div className="viewer-control-notice">
                  LIVE VIEW ONLY • BIDDING IS CONTROLLED BY THE OPERATOR
                </div>
              ) : (
                <>

                  <button
                    className="control-button start"
                    onClick={
                      handleStartResume
                    }
                    disabled={
                      auctionStatus ===
                        "LIVE" ||
                      auctionStatus ===
                        "SOLD" ||
                      auctionStatus ===
                        "ENDED"
                    }
                  >
                    START / RESUME
                  </button>

                  <button
                    className="control-button pause"
                    onClick={
                      handlePause
                    }
                    disabled={
                      auctionStatus !==
                      "LIVE"
                    }
                  >
                    PAUSE
                  </button>

                  <button
                    className="control-button sold"
                    onClick={
                      handleSold
                    }
                    disabled={
                      auctionStatus !==
                        "LIVE" ||
                      !highestBidder
                    }
                  >
                    SOLD
                  </button>

                  <button
                    className="control-button unsold"
                    onClick={
                      handleUnsold
                    }
                    disabled={
                      auctionStatus !==
                      "LIVE"
                    }
                  >
                    UNSOLD
                  </button>

                  <button
                    className="control-button end"
                    onClick={
                      handleEndAuction
                    }
                    disabled={
                      auctionStatus ===
                      "ENDED"
                    }
                  >
                    END AUCTION
                  </button>

                </>
              )}

            </div>

          </div>

        </section>

        {/* ===================================================
            CURRENT PLAYER + CURRENT BID
        =================================================== */}

        <div className="top-auction-grid">

          <section className="player-section">

            <div className="section-label">
              CURRENT PLAYER
            </div>

            <div className="player-content">

              <div className="player-image-container">

                <div className="player-number">
                  {currentPlayer.number}
                </div>

                {currentPlayer.image ? (
                  <img
                    src={
                      currentPlayer.image
                    }
                    alt={
                      currentPlayer.name
                    }
                    className="current-player-image"
                  />
                ) : (
                  <div className="player-image-placeholder">
                    <span>
                      PLAYER PHOTO
                    </span>

                    <small>
                      IMAGE COMING SOON
                    </small>
                  </div>
                )}

              </div>

              <div className="player-info">

                <span className="player-category">
                  {
                    currentPlayer.category
                  }
                </span>

                <h2>
                  {
                    currentPlayer.name
                  }
                </h2>

                <p className="player-country">
                  🇮🇳{" "}
                  {
                    currentPlayer.country
                  }
                </p>

                <div className="player-meta">

                  <div>
                    <span>
                      YEAR
                    </span>

                    <strong>
                      {
                        currentPlayer.year
                      }
                    </strong>
                  </div>

                  <div>
                    <span>
                      DEPARTMENT
                    </span>

                    <strong>
                      {
                        currentPlayer.department
                      }
                    </strong>
                  </div>

                </div>

                <div className="base-price">

                  <span>
                    BASE PRICE
                  </span>

                  <strong>
                    ₹
                    {currentPlayer.basePrice.toLocaleString(
                      "en-IN"
                    )}
                  </strong>

                </div>

              </div>

            </div>

          </section>

          {/* =================================================
              CURRENT BID
          ================================================= */}

          <section className="current-bid-section">

            <div className="bid-timer">

              <span className="bid-timer-label">
                TIME REMAINING
              </span>

              <strong>
                {String(
                  Math.floor(
                    bidTimeRemaining /
                      60
                  )
                ).padStart(
                  2,
                  "0"
                )}
                :
                {String(
                  bidTimeRemaining %
                    60
                ).padStart(
                  2,
                  "0"
                )}
              </strong>

            </div>

            <span className="current-bid-label">
              CURRENT BID
            </span>

            <h2
              className={
                bidFlash
                  ? "bid-flash"
                  : ""
              }
            >
              ₹
              {currentBid.toLocaleString(
                "en-IN"
              )}
            </h2>

            {soldTeam ? (
              <>
                <span className="sold-label">
                  SOLD TO
                </span>

                <strong className="sold-team-name">
                  {soldTeam}
                </strong>

                <span className="sold-price">
                  ₹
                  {currentBid.toLocaleString(
                    "en-IN"
                  )}
                </span>
              </>
            ) : highestBidder ? (
              <p>
                Highest bid by{" "}
                <strong>
                  {highestBidder}
                </strong>
              </p>
            ) : (
              <p>
                Starting at base price
              </p>
            )}

          </section>

        </div>

        {/* ===================================================
            BIDDING TOOLBAR
        =================================================== */}

        <section className="bidding-toolbar-section">

          <div>

            <span className="toolbar-title">
              BIDDING PANEL
            </span>

            <small>
              Quick bid or enter a custom amount
            </small>

          </div>

          <div className="bidding-toolbar-actions">

            {!readOnly && (
              <button
                className="manual-bid-button"
                onClick={
                  openManualBid
                }
                disabled={
                  auctionStatus !==
                  "LIVE"
                }
              >
                <span>
                  ＋
                </span>

                MANUAL BID
              </button>
            )}

            <div className="next-bid-display">

              NEXT QUICK BID

              <strong>
                ₹
                {(
                  highestBidder
                    ? currentBid +
                      BID_INCREMENT
                    : currentPlayer.basePrice
                ).toLocaleString(
                  "en-IN"
                )}
              </strong>

            </div>

          </div>

        </section>

        {/* ===================================================
            LIVE BIDDING
        =================================================== */}

        <section className="teams-section">

          <div className="section-heading-row">

            <div className="section-label">
              LIVE BIDDING
            </div>

            <span className="team-count">
              {teams.length} TEAMS
            </span>

          </div>

          <div className="teams-grid">

            {teams.map(
              (team) => {

                const isHighest =
                  highestBidder ===
                  team.id;

                const nextQuickBid =
                  highestBidder
                    ? currentBid +
                      BID_INCREMENT
                    : currentPlayer.basePrice;

                const canAffordQuickBid =
                  team.amount >=
                  nextQuickBid;

                return (
                  <div
                    key={team.id}
                    className={`team-card ${
                      isHighest
                        ? "highest"
                        : ""
                    } ${
                      !canAffordQuickBid
                        ? "insufficient"
                        : ""
                    }`}
                  >

                    <div className="team-card-header">

                      <div className="team-logo-wrapper">

                        <img
                          src={
                            team.logo
                          }
                          alt={
                            team.name
                          }
                          className="team-logo"
                        />

                      </div>

                      <div className="team-title">

                        <span>
                          {team.id}
                        </span>

                        <strong>
                          {
                            team.name
                          }
                        </strong>

                      </div>

                    </div>

                    <div className="team-owner">

                      <img
                        src={
                          team.owner
                        }
                        alt={`${team.id} owner`}
                        className="owner-image"
                      />

                      <div>

                        <span>
                          TEAM OWNER
                        </span>

                        <strong>
                          {getTeamOwnerName(team)}
                        </strong>

                      </div>

                    </div>

                    <div className="team-purse">

                      <span>
                        PURSE REMAINING
                      </span>

                      <strong>
                        ₹
                        {team.amount.toLocaleString(
                          "en-IN"
                        )}
                      </strong>

                    </div>

                    <div className="team-squad-summary">

                      <div className="team-squad-header">

                        <span>
                          SQUAD
                        </span>

                        <strong>
                          {
                            soldPlayers.filter(
                              (player) =>
                                player.teamId ===
                                team.id
                            ).length
                          }{" "}
                          /{" "}
                          {
                            MAX_SQUAD_SIZE
                          }
                        </strong>

                      </div>

                      <div className="team-squad-list">

                        {
                          soldPlayers.filter(
                            (player) =>
                              player.teamId ===
                              team.id
                          ).length >
                          0 ? (
                            soldPlayers
                              .filter(
                                (player) =>
                                  player.teamId ===
                                  team.id
                              )
                              .map(
                                (
                                  player
                                ) => (
                                  <span
                                    key={
                                      player.id
                                    }
                                  >
                                    {
                                      player.playerName
                                    }{" "}
                                    • ₹
                                    {player.finalPrice.toLocaleString(
                                      "en-IN"
                                    )}
                                  </span>
                                )
                              )
                          ) : (
                            <span className="team-squad-empty">
                              No players bought yet
                            </span>
                          )
                        }

                      </div>

                    </div>

                    {isHighest &&
                      !soldTeam && (
                        <div className="highest-bid-label">
                          HIGHEST BID
                        </div>
                      )}

                    {soldTeam ===
                      team.id && (
                      <div className="winner-label">
                        WINNER
                      </div>
                    )}

                    <button
                      className="bid-button"
                      onClick={() =>
                        placeBid(
                          team.id
                        )
                      }
                      disabled={
                        readOnly ||
                        auctionStatus !==
                          "LIVE" ||
                        isHighest ||
                        !canAffordQuickBid
                      }
                    >
                      {readOnly
                        ? "VIEW ONLY"
                        : isHighest
                          ? "LEADING"
                          : !canAffordQuickBid
                            ? "INSUFFICIENT PURSE"
                            : highestBidder
                              ? "BID +₹500"
                              : `BID ₹${currentPlayer.basePrice.toLocaleString(
                                  "en-IN"
                                )}`}
                    </button>

                  </div>
                );
              }
            )}

          </div>

        </section>

        {/* ===================================================
            UPCOMING PLAYER
        =================================================== */}

        {nextPlayer && (
          <section className="upcoming-player-section">

            <div className="section-label">
              NEXT PLAYER
            </div>

            <div className="upcoming-player-card">

              <div
                className="upcoming-player-number"
                style={{
                  overflow:
                    "hidden",
                  width: "64px",
                  height: "64px",
                  minWidth: "64px",
                  borderRadius:
                    "50%",
                }}
              >
                {nextPlayer.image ? (
                  <img
                    src={
                      nextPlayer.image
                    }
                    alt={
                      nextPlayer.name
                    }
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit:
                        "cover",
                      display:
                        "block",
                    }}
                  />
                ) : (
                  nextPlayer.number
                )}
              </div>

              <div className="upcoming-player-info">

                <span>
                  {
                    nextPlayer.department
                  }{" "}
                  •{" "}
                  {
                    nextPlayer.year
                  }
                </span>

                <strong>
                  {
                    nextPlayer.name
                  }
                </strong>

                <small>
                  BASE PRICE ₹
                  {nextPlayer.basePrice.toLocaleString(
                    "en-IN"
                  )}
                </small>

              </div>

              <div className="upcoming-player-set">
                {
                  nextPlayer.set
                }
              </div>

            </div>

          </section>
        )}

        {/* ===================================================
            AUCTION PLAYER LIST
        =================================================== */}

        <section className="auction-player-list-section">

          <div className="section-heading-row">

            <div className="section-label">
              AUCTION PLAYERS
            </div>

            <span className="team-count">
              {playerQueue.length} PLAYERS
            </span>

          </div>

          <div className="auction-player-list">

            {playerQueue.map(
              (player, index) => {

                const soldRecord =
                  soldPlayers.find(
                    (sold) =>
                      sold.playerNumber ===
                      player.number
                  );

                const isCurrent =
                  index ===
                  currentPlayerIndex;

                const status =
                  soldRecord
                    ? "SOLD"
                    : isCurrent
                      ? "LIVE"
                      : index <
                          currentPlayerIndex
                        ? "UNSOLD"
                        : "UPCOMING";

                return (
                  <div
                    key={
                      player.number
                    }
                    className={`auction-player-row player-${status.toLowerCase()}`}
                  >

                    <span className="auction-player-row-number">
                      {player.number}
                    </span>

                    {/* PARTICIPANT PHOTO */}

                    <div
                      style={{
                        width:
                          "42px",
                        height:
                          "42px",
                        minWidth:
                          "42px",
                        borderRadius:
                          "50%",
                        overflow:
                          "hidden",
                        background:
                          "#151a20",
                        border:
                          "1px solid rgba(255,255,255,0.08)",
                        display:
                          "flex",
                        alignItems:
                          "center",
                        justifyContent:
                          "center",
                        fontWeight:
                          800,
                        color:
                          "#00e676",
                        marginRight:
                          "12px",
                      }}
                    >
                      {player.image ? (
                        <img
                          src={
                            player.image
                          }
                          alt={
                            player.name
                          }
                          style={{
                            width:
                              "100%",
                            height:
                              "100%",
                            objectFit:
                              "cover",
                            display:
                              "block",
                          }}
                        />
                      ) : (
                        player.name
                          .charAt(
                            0
                          )
                          .toUpperCase()
                      )}
                    </div>

                    <div className="auction-player-row-info">

                      <strong>
                        {
                          player.name
                        }
                      </strong>

                      <span>
                        {
                          player.department
                        }{" "}
                        •{" "}
                        {
                          player.year
                        }
                      </span>

                    </div>

                    <span className="auction-player-row-price">
                      {soldRecord
                        ? `₹${soldRecord.finalPrice.toLocaleString(
                            "en-IN"
                          )}`
                        : `BASE ₹${player.basePrice.toLocaleString(
                            "en-IN"
                          )}`}
                    </span>

                    <span className="auction-player-row-status">
                      {status}
                    </span>

                  </div>
                );
              }
            )}

          </div>

        </section>

        {/* ===================================================
            CONTINUOUS NEWS TICKER
        =================================================== */}

        <section className="auction-news-ticker">

          <div className="auction-news-label">

            <span className="ticker-live-dot"></span>

            <strong>
              LIVE
            </strong>

          </div>

          <div className="auction-news-window">

            <div className="auction-news-track">

              {tickerItems.map(
                (
                  item,
                  index
                ) => (
                  <div
                    key={`${item.id}-${index}`}
                    className={`auction-news-item ticker-${item.type}`}
                  >

                    <span className="ticker-bullet">
                      ◆
                    </span>

                    <span className="ticker-text">
                      {item.text}
                    </span>

                    <span className="ticker-separator">
                      •
                    </span>

                  </div>
                )
              )}

            </div>

          </div>

        </section>

      </main>

      {/* =====================================================
          PLAYER SOLD OVERLAY
      ===================================================== */}

      {soldOverlayOpen &&
        latestSoldPlayer && (
          <SoldOverlay
            soldPlayer={
              latestSoldPlayer
            }
            totalPlayersSold={
              totalPlayersSold
            }
            winningTeamSquadSize={
              winningTeamSquadSize
            }
            maxSquadSize={
              MAX_SQUAD_SIZE
            }
            slotsRemaining={
              slotsRemaining
            }
            nextPlayer={
              nextPlayer
            }
            onNextPlayer={
              handleNextPlayer
            }
            readOnly={
              readOnly
            }
          />
        )}

      {/* =====================================================
          MANUAL BID MODAL
      ===================================================== */}

      {manualBidOpen && (
        <div
          className="modal-backdrop"
          onClick={
            closeManualBid
          }
        >

          <div
            className="manual-bid-modal"
            onClick={(event) =>
              event.stopPropagation()
            }
          >

            <div className="modal-header">

              <div>

                <span>
                  AUCTION CONTROL
                </span>

                <h2>
                  MANUAL BID
                </h2>

                <p>
                  Enter an exact bid amount
                  for the selected team.
                </p>

              </div>

              <button
                className="modal-close"
                onClick={
                  closeManualBid
                }
              >
                ×
              </button>

            </div>

            <div className="manual-current-bid">

              <span>
                CURRENT BID
              </span>

              <strong>
                ₹
                {currentBid.toLocaleString(
                  "en-IN"
                )}
              </strong>

              <small>
                Minimum manual bid: ₹
                {(
                  currentBid + 1
                ).toLocaleString(
                  "en-IN"
                )}
              </small>

            </div>

            <div className="manual-form-group">

              <label>
                SELECT TEAM
              </label>

              <select
                value={
                  manualTeam
                }
                onChange={(
                  event
                ) => {
                  setManualTeam(
                    event.target
                      .value
                  );

                  setManualError(
                    ""
                  );
                }}
              >

                <option value="">
                  Select a team
                </option>

                {teams
                  .filter(
                    (team) =>
                      team.id !==
                      highestBidder
                  )
                  .map(
                    (team) => (
                      <option
                        key={
                          team.id
                        }
                        value={
                          team.id
                        }
                      >
                        {
                          team.id
                        }{" "}
                        —{" "}
                        {
                          team.name
                        }{" "}
                        — Purse ₹
                        {team.amount.toLocaleString(
                          "en-IN"
                        )}
                      </option>
                    )
                  )}

              </select>

            </div>

            <div className="manual-form-group">

              <label>
                ENTER BID AMOUNT
              </label>

              <div className="manual-input-wrapper">

                <span>
                  ₹
                </span>

                <input
                  type="number"
                  min={
                    currentBid +
                    1
                  }
                  step="500"
                  placeholder={`${currentBid + 500}`}
                  value={
                    manualBidAmount
                  }
                  onChange={(
                    event
                  ) => {
                    setManualBidAmount(
                      event.target
                        .value
                    );

                    setManualError(
                      ""
                    );
                  }}
                  onKeyDown={(
                    event
                  ) => {
                    if (
                      event.key ===
                      "Enter"
                    ) {
                      placeManualBid();
                    }
                  }}
                />

              </div>

              <small>
                Example: ₹3,500,
                ₹4,000, ₹5,000...
              </small>

            </div>

            {manualError && (
              <div className="manual-error">
                {manualError}
              </div>
            )}

            {manualTeam &&
              manualBidAmount &&
              Number(
                manualBidAmount
              ) >
                currentBid && (
                <div className="manual-bid-preview">

                  <div>

                    <span>
                      TEAM
                    </span>

                    <strong>
                      {
                        manualTeam
                      }
                    </strong>

                  </div>

                  <div>

                    <span>
                      NEW BID
                    </span>

                    <strong>
                      ₹
                      {Number(
                        manualBidAmount
                      ).toLocaleString(
                        "en-IN"
                      )}
                    </strong>

                  </div>

                  <div>

                    <span>
                      PURSE USED
                    </span>

                    <strong>
                      ₹
                      {Number(
                        manualBidAmount
                      ).toLocaleString(
                        "en-IN"
                      )}
                    </strong>

                  </div>

                </div>
              )}

            <div className="manual-modal-actions">

              <button
                className="cancel-button"
                onClick={
                  closeManualBid
                }
              >
                CANCEL
              </button>

              <button
                className="place-manual-button"
                onClick={
                  placeManualBid
                }
              >
                PLACE MANUAL BID
              </button>

            </div>

          </div>

        </div>
      )}

      {/* =====================================================
          KEPT PLAYERS MODAL
      ===================================================== */}

      {keptPlayersOpen && (
        <div
          className="modal-backdrop kept-backdrop"
          onClick={() => {
            setKeptPlayersOpen(
              false
            );

            setSelectedKeptPlayer(
              null
            );
          }}
        >

          <div
            className="kept-players-modal"
            onClick={(event) =>
              event.stopPropagation()
            }
          >

            <div className="kept-modal-header">

              <div>

                <span>
                  PLAYER MANAGEMENT
                </span>

                <h2>
                  KEPT PLAYERS
                </h2>

                <p>
                  Players retained before
                  the main auction.
                </p>

              </div>

              <button
                className="modal-close"
                onClick={() => {
                  setKeptPlayersOpen(
                    false
                  );

                  setSelectedKeptPlayer(
                    null
                  );
                }}
              >
                ×
              </button>

            </div>

            <div className="player-search-wrapper">

              <span>
                ⌕
              </span>

              <input
                type="text"
                placeholder="Search players..."
                value={
                  playerSearch
                }
                onChange={(
                  event
                ) =>
                  setPlayerSearch(
                    event.target
                      .value
                  )
                }
              />

            </div>

            <div className="kept-player-sets">

              {/* =================================================
                  CLUB MEMBERS
              ================================================= */}

              <section className="kept-player-set">

                <div className="kept-set-header">

                  <div>

                    <span>
                      SET 01
                    </span>

                    <h3>
                      CLUB MEMBERS
                    </h3>

                  </div>

                  <strong>
                    {
                      clubMembers.length
                    }
                  </strong>

                </div>

                <div className="player-cards-grid">

                  {filteredClubMembers.length >
                  0 ? (
                    filteredClubMembers.map(
                      (
                        player
                      ) => (
                        <button
                          key={
                            player.id
                          }
                          className="kept-player-card"
                          onClick={() =>
                            setSelectedKeptPlayer(
                              player
                            )
                          }
                        >

                          <div className="kept-player-avatar">

                            {player.image ? (
                              <img
                                src={
                                  player.image
                                }
                                alt={
                                  player.name
                                }
                              />
                            ) : (
                              player.name
                                .charAt(
                                  0
                                )
                                .toUpperCase()
                            )}

                          </div>

                          <div className="kept-player-card-info">

                            <strong>
                              {
                                player.name
                              }
                            </strong>

                            <span>
                              {
                                player.department
                              }{" "}
                              •{" "}
                              {
                                player.year
                              }
                            </span>

                          </div>

                          <span className="player-arrow">
                            →
                          </span>

                        </button>
                      )
                    )
                  ) : (
                    <div className="no-players">
                      No club members
                      found.
                    </div>
                  )}

                </div>

              </section>

              {/* =================================================
                  OUTSIDE PARTICIPANTS
              ================================================= */}

              <section className="kept-player-set">

                <div className="kept-set-header">

                  <div>

                    <span>
                      SET 02
                    </span>

                    <h3>
                      OUTSIDE PARTICIPANTS
                    </h3>

                  </div>

                  <strong>
                    {
                      outsideParticipants.length
                    }
                  </strong>

                </div>

                <div className="player-cards-grid">

                  {filteredOutsideParticipants.length >
                  0 ? (
                    filteredOutsideParticipants.map(
                      (
                        player
                      ) => (
                        <button
                          key={
                            player.id
                          }
                          className="kept-player-card"
                          onClick={() =>
                            setSelectedKeptPlayer(
                              player
                            )
                          }
                        >

                          <div className="kept-player-avatar">

                            {player.image ? (
                              <img
                                src={
                                  player.image
                                }
                                alt={
                                  player.name
                                }
                              />
                            ) : (
                              player.name
                                .charAt(
                                  0
                                )
                                .toUpperCase()
                            )}

                          </div>

                          <div className="kept-player-card-info">

                            <strong>
                              {
                                player.name
                              }
                            </strong>

                            <span>
                              {
                                player.department
                              }{" "}
                              •{" "}
                              {
                                player.year
                              }
                            </span>

                          </div>

                          <span className="player-arrow">
                            →
                          </span>

                        </button>
                      )
                    )
                  ) : (
                    <div className="no-players">
                      No outside
                      participants found.
                    </div>
                  )}

                </div>

              </section>

            </div>

            <div className="kept-modal-footer">

              <div>

                <strong>
                  {
                    totalKeptPlayers
                  }
                </strong>

                <span>
                  TOTAL KEPT PLAYERS
                </span>

              </div>

              <button
                onClick={() => {
                  setKeptPlayersOpen(
                    false
                  );

                  setSelectedKeptPlayer(
                    null
                  );
                }}
              >
                DONE
              </button>

            </div>

          </div>

        </div>
      )}

      {/* =====================================================
          PLAYER DETAILS MODAL
      ===================================================== */}

      {selectedKeptPlayer && (
        <div
          className="player-details-overlay"
          onClick={() =>
            setSelectedKeptPlayer(
              null
            )
          }
        >

          <div
            className="player-details-modal"
            onClick={(event) =>
              event.stopPropagation()
            }
          >

            <button
              className="details-close"
              onClick={() =>
                setSelectedKeptPlayer(
                  null
                )
              }
            >
              ×
            </button>

            <div className="details-player-avatar">

              {selectedKeptPlayer.image ? (
                <img
                  src={
                    selectedKeptPlayer.image
                  }
                  alt={
                    selectedKeptPlayer.name
                  }
                />
              ) : (
                selectedKeptPlayer.name
                  .charAt(0)
                  .toUpperCase()
              )}

            </div>

            <span className="details-category">
              {
                selectedKeptPlayer.category
              }
            </span>

            <h2>
              {
                selectedKeptPlayer.name
              }
            </h2>

            <span className="details-country">
              🇮🇳{" "}
              {
                selectedKeptPlayer.country
              }
            </span>

            <div className="details-grid">

              <div>

                <span>
                  PLAYER NO.
                </span>

                <strong>
                  #
                  {
                    selectedKeptPlayer.playerNumber
                  }
                </strong>

              </div>

              <div>

                <span>
                  YEAR
                </span>

                <strong>
                  {
                    selectedKeptPlayer.year
                  }
                </strong>

              </div>

              <div>

                <span>
                  DEPARTMENT
                </span>

                <strong>
                  {
                    selectedKeptPlayer.department
                  }
                </strong>

              </div>

              <div>

                <span>
                  REGISTER NO.
                </span>

                <strong>
                  {
                    selectedKeptPlayer.registerNumber ||
                    "NOT PROVIDED"
                  }
                </strong>

              </div>

              <div>

                <span>
                  STATUS
                </span>

                <strong>
                  KEPT PLAYER
                </strong>

              </div>

            </div>

          </div>

        </div>
      )}

    </div>
  );
}

export default AuctionDashboard;