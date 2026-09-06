import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { supabase } from "../../lib/supabase";
import "./AuctionDashboard.css";
import SoldOverlay from "../SoldOverlay";

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

  const [auctionStatus, setAuctionStatus] = useState("LIVE");

  const [currentBid, setCurrentBid] = useState(2500);

  const [highestBidder, setHighestBidder] =
    useState("TEAM 03");

  const [bidFlash, setBidFlash] = useState(false);

  const [bidTimeRemaining, setBidTimeRemaining] =
    useState(120);

  const [timerStartedAt, setTimerStartedAt] =
    useState(null);

  const [syncReady, setSyncReady] =
    useState(false);

  const [soldTeam, setSoldTeam] = useState(null);

  const [soldOverlayOpen, setSoldOverlayOpen] =
    useState(false);

  const [soldPlayers, setSoldPlayers] =
    useState([]);

  /* =========================================================
     REALTIME SYNC REFS

     These refs prevent the operator's own Supabase update
     from coming back through Realtime and causing another
     unnecessary state -> database -> state cycle.
  ========================================================= */

  const persistTimerRef = useRef(null);

  const pendingPersistRef = useRef(null);

  const persistInFlightRef = useRef(false);

  const lastPersistedSnapshotRef = useRef(null);

  const lastRemoteSnapshotRef = useRef(null);

  const lastLocalUpdatedAtMsRef = useRef(0);

  const lastLocalSnapshotRef = useRef(null);

  const realtimeChannelRef = useRef(null);

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

  const [teams, setTeams] = useState([
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
      amount: STARTING_PURSE - 2500,
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
  ========================================================= */

  const playerQueue = [
    {
      number: "#07",
      name: "ARJUN SHARMA",
      category: "BATTER",
      country: "INDIA",
      age: 22,
      style: "RIGHT HAND",
      basePrice: 500,
      image: null,
      set: "OUTSIDE PARTICIPANTS",
    },
    {
      number: "#08",
      name: "ADITYA RAJ",
      category: "BATTER",
      country: "INDIA",
      age: 21,
      style: "RIGHT HAND",
      basePrice: 500,
      image: null,
      set: "OUTSIDE PARTICIPANTS",
    },
    {
      number: "#09",
      name: "KARAN PATEL",
      category: "BOWLER",
      country: "INDIA",
      age: 25,
      style: "RIGHT ARM",
      basePrice: 500,
      image: null,
      set: "OUTSIDE PARTICIPANTS",
    },
    {
      number: "#10",
      name: "ROHAN DAS",
      category: "ALL ROUNDER",
      country: "INDIA",
      age: 22,
      style: "RIGHT HAND",
      basePrice: 500,
      image: null,
      set: "OUTSIDE PARTICIPANTS",
    },
    {
      number: "#11",
      name: "SANJAY KUMAR",
      category: "BATTER",
      country: "INDIA",
      age: 23,
      style: "LEFT HAND",
      basePrice: 500,
      image: null,
      set: "OUTSIDE PARTICIPANTS",
    },
  ];

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

  const clubMembers = [
    {
      id: 1,
      name: "Arjun Sharma",
      category: "BATTER",
      age: 22,
      style: "RIGHT HAND",
      country: "INDIA",
      playerNumber: "01",
      image: null,
    },
    {
      id: 2,
      name: "Rahul Kumar",
      category: "ALL ROUNDER",
      age: 24,
      style: "RIGHT HAND",
      country: "INDIA",
      playerNumber: "02",
      image: null,
    },
    {
      id: 3,
      name: "Vikram Singh",
      category: "BOWLER",
      age: 23,
      style: "RIGHT ARM",
      country: "INDIA",
      playerNumber: "03",
      image: null,
    },
  ];

  const outsideParticipants = [
    {
      id: 101,
      name: "Aditya Raj",
      category: "BATTER",
      age: 21,
      style: "RIGHT HAND",
      country: "INDIA",
      playerNumber: "01",
      image: null,
    },
    {
      id: 102,
      name: "Karan Patel",
      category: "BOWLER",
      age: 25,
      style: "RIGHT ARM",
      country: "INDIA",
      playerNumber: "02",
      image: null,
    },
    {
      id: 103,
      name: "Rohan Das",
      category: "ALL ROUNDER",
      age: 22,
      style: "RIGHT HAND",
      country: "INDIA",
      playerNumber: "03",
      image: null,
    },
    {
      id: 104,
      name: "Sanjay Kumar",
      category: "BATTER",
      age: 23,
      style: "LEFT HAND",
      country: "INDIA",
      playerNumber: "04",
      image: null,
    },
  ];

  /* =========================================================
     BID HISTORY
  ========================================================= */

  const [bidHistory, setBidHistory] =
    useState([
      {
        id: 1,
        team: "TEAM 03",
        teamName: "TOWNSVILLE TECH TITANS",
        amount: 2500,
        timestamp: Date.now(),
        type: "QUICK",
      },
    ]);

  /* =========================================================
     LIVE NEWS TICKER
  ========================================================= */

  const [tickerMessages, setTickerMessages] =
    useState([
      {
        id: 1,
        type: "start",
        text: "AUCTION BEGINS • ROUND 01 • PLAYER AUCTION 2026",
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
            id: Date.now() + Math.random(),
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

     JSON.stringify gives us a stable representation of the
     auction state so we can detect our own realtime echo.
  ========================================================= */

  const serializeSnapshot = (snapshot) =>
    JSON.stringify(snapshot);

  /* =========================================================
     HYDRATE FROM REMOTE

     IMPORTANT:
     This function only updates local React state.
     It does NOT write anything back to Supabase.
  ========================================================= */

  const hydrateFromRemote = (remoteState) => {
    if (!remoteState) {
      return;
    }

    lastRemoteSnapshotRef.current =
      serializeSnapshot(remoteState);

    setAuctionStatus(
      remoteState.auctionStatus ?? "LIVE"
    );

    setCurrentBid(
      remoteState.currentBid ?? 500
    );

    setHighestBidder(
      remoteState.highestBidder ?? null
    );

    setSoldTeam(
      remoteState.soldTeam ?? null
    );

    setSoldOverlayOpen(
      Boolean(remoteState.soldOverlayOpen)
    );

    setSoldPlayers(
      Array.isArray(remoteState.soldPlayers)
        ? remoteState.soldPlayers
        : []
    );

    setTeams(
      Array.isArray(remoteState.teams)
        ? remoteState.teams.map((team) => {
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
          })
        : []
    );

    setCurrentPlayerIndex(
      Number.isInteger(
        remoteState.currentPlayerIndex
      )
        ? remoteState.currentPlayerIndex
        : 0
    );

    setBidHistory(
      Array.isArray(remoteState.bidHistory)
        ? remoteState.bidHistory
        : []
    );

    setTickerMessages(
      Array.isArray(remoteState.tickerMessages) &&
        remoteState.tickerMessages.length
        ? remoteState.tickerMessages
        : [
            {
              id: 1,
              type: "start",
              text: "AUCTION BEGINS • ROUND 01 • PLAYER AUCTION 2026",
            },
          ]
    );

    const remoteTimerStartedAt =
      remoteState.timerStartedAt ?? null;

    setTimerStartedAt(
      remoteTimerStartedAt
    );

    if (
      remoteState.auctionStatus === "LIVE" &&
      remoteTimerStartedAt
    ) {
      setBidTimeRemaining(
        Math.max(
          0,
          120 -
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
          remoteState.bidTimeRemaining ?? 120
        )
      );
    }
  };

  /* =========================================================
     INITIALIZE REALTIME
  ========================================================= */

  useEffect(() => {
    let mounted = true;

    const applyRealtimeState = (payload) => {
      if (!mounted || !payload.new?.state) {
        return;
      }

      const remoteState = payload.new.state;
      const remoteSnapshot =
        serializeSnapshot(remoteState);
      const remoteUpdatedAt =
        payload.new.updated_at ?? null;
      const remoteUpdatedAtMs = remoteUpdatedAt
        ? Date.parse(remoteUpdatedAt)
        : 0;

      /*
       * Ignore our own realtime echo.
       *
       * The timestamp guard also protects us if an older
       * realtime event arrives after a newer local write.
       */
      if (
        remoteSnapshot ===
        lastLocalSnapshotRef.current
      ) {
        lastRemoteSnapshotRef.current =
          remoteSnapshot;
        return;
      }

      if (
        remoteUpdatedAtMs > 0 &&
        remoteUpdatedAtMs <=
          lastLocalUpdatedAtMsRef.current
      ) {
        return;
      }

      lastRemoteSnapshotRef.current =
        remoteSnapshot;

      hydrateFromRemote(remoteState);
      setSyncReady(true);
    };

    const initializeRealtime = async () => {
      const { data, error } =
        await supabase
          .from("auction_state")
          .select("state, updated_at")
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
          serializeSnapshot(data.state);

        lastRemoteSnapshotRef.current =
          remoteSnapshot;

        lastPersistedSnapshotRef.current =
          remoteSnapshot;

        const remoteUpdatedAtMs = data.updated_at
          ? Date.parse(data.updated_at)
          : 0;

        if (remoteUpdatedAtMs > 0) {
          lastLocalUpdatedAtMsRef.current =
            remoteUpdatedAtMs;
        }

        hydrateFromRemote(data.state);
        setSyncReady(true);
      } else if (!readOnly) {
        const initialTimerStartedAt =
          Date.now();
        const initialUpdatedAt =
          new Date().toISOString();

        const initialState = {
          auctionStatus: "LIVE",
          currentBid: 2500,
          highestBidder: "TEAM 03",
          soldTeam: null,
          soldOverlayOpen: false,
          soldPlayers: [],
          teams,
          currentPlayerIndex: 0,
          bidHistory,
          tickerMessages,
          timerStartedAt:
            initialTimerStartedAt,
          bidTimeRemaining: 120,
        };

        const initialSnapshot =
          serializeSnapshot(initialState);

        lastPersistedSnapshotRef.current =
          initialSnapshot;

        lastRemoteSnapshotRef.current =
          initialSnapshot;

        lastLocalSnapshotRef.current =
          initialSnapshot;

        lastLocalUpdatedAtMsRef.current =
          Date.parse(initialUpdatedAt);

        setTimerStartedAt(
          initialTimerStartedAt
        );

        const { error: insertError } =
          await supabase
            .from("auction_state")
            .insert({
              id: 1,
              state: initialState,
              updated_at: initialUpdatedAt,
            });

        if (
          insertError &&
          insertError.code !== "23505"
        ) {
          console.error(
            "DPL auction state initialization failed:",
            insertError
          );

          lastLocalSnapshotRef.current = null;
          lastLocalUpdatedAtMsRef.current = 0;
          return;
        }

        if (insertError?.code === "23505") {
          /* Another client initialized the row first. */
          lastLocalSnapshotRef.current = null;
          lastLocalUpdatedAtMsRef.current = 0;
        }

        setSyncReady(true);
      } else {
        setSyncReady(true);
      }
    };

    initializeRealtime();

    const channel = supabase
      .channel("dpl-auction-state")
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

    realtimeChannelRef.current = channel;

    return () => {
      mounted = false;

      if (persistTimerRef.current) {
        clearTimeout(
          persistTimerRef.current
        );
        persistTimerRef.current = null;
      }

      pendingPersistRef.current = null;

      if (realtimeChannelRef.current) {
        supabase.removeChannel(
          realtimeChannelRef.current
        );
      }

      realtimeChannelRef.current = null;
    };
  }, [readOnly]);

  /* =========================================================
     PERSIST AUCTION STATE

     Local auction actions are queued and written one at a
     time. This prevents overlapping Supabase writes and
     prevents Realtime from fighting with the operator UI.
  ========================================================= */

  const flushPendingPersist = async () => {
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

    pendingPersistRef.current = null;
    persistInFlightRef.current = true;

    const snapshotString =
      serializeSnapshot(snapshot);
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

    const { error } = await supabase
      .from("auction_state")
      .update({
        state: snapshot,
        updated_at: updatedAt,
      })
      .eq("id", 1);

    persistInFlightRef.current = false;

    if (error) {
      console.error(
        "DPL auction state save failed:",
        error
      );

      /*
       * Do not keep a failed write marked as current.
       * The next local state change can retry normally.
       */
      lastPersistedSnapshotRef.current =
        lastRemoteSnapshotRef.current;
      lastLocalSnapshotRef.current = null;
      lastLocalUpdatedAtMsRef.current = 0;
    } else {
      lastRemoteSnapshotRef.current =
        snapshotString;
    }

    /*
     * If another local action happened while the previous
     * request was in flight, immediately save the newest one.
     */
    if (pendingPersistRef.current) {
      void flushPendingPersist();
    }
  };

  const queueAuctionPersist = (snapshot) => {
    if (readOnly) {
      return;
    }

    pendingPersistRef.current = snapshot;

    if (persistInFlightRef.current) {
      return;
    }

    if (persistTimerRef.current) {
      clearTimeout(
        persistTimerRef.current
      );
    }

    persistTimerRef.current =
      setTimeout(() => {
        persistTimerRef.current = null;
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
      serializeSnapshot(auctionSnapshot);

    /* Already synchronized. */
    if (
      snapshotString ===
      lastPersistedSnapshotRef.current
    ) {
      return;
    }

    /*
     * This state came from another client through Realtime.
     * Never write it straight back to the database.
     */
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
      /*
       * Do not cancel an in-flight request here. Only cancel
       * the debounce timer when React schedules a newer state.
       */
      if (
        persistTimerRef.current &&
        !persistInFlightRef.current
      ) {
        clearTimeout(
          persistTimerRef.current
        );
        persistTimerRef.current = null;
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
     2-MINUTE BIDDING TIMER
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
          120 -
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
      120
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
          120 -
            bidTimeRemaining
        ) *
          1000
    );

    setAuctionStatus(
      "LIVE"
    );

    setSoldTeam(null);
    setSoldOverlayOpen(false);

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

      age:
        currentPlayer.age,

      style:
        currentPlayer.style,

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
      120
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
      `NEXT PLAYER • ${playerQueue[nextIndex].number} • ${
        playerQueue[nextIndex].name
      } • BASE PRICE ₹${playerQueue[
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
      120
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
    }, [playerSearch]);

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
    }, [playerSearch]);

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
            text: "AUCTION BEGINS • ROUND 01 • PLAYER AUCTION 2026",
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

              <span>STATUS</span>

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
                  {currentPlayer.category}
                </span>

                <h2>
                  {currentPlayer.name}
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
                      AGE
                    </span>

                    <strong>
                      {
                        currentPlayer.age
                      }
                    </strong>
                  </div>

                  <div>
                    <span>
                      STYLE
                    </span>

                    <strong>
                      {
                        currentPlayer.style
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
                          OWNER
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

              <div className="upcoming-player-number">
                {nextPlayer.number}
              </div>

              <div className="upcoming-player-info">

                <span>
                  {
                    nextPlayer.category
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
                {nextPlayer.set}
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

                    <div className="auction-player-row-info">

                      <strong>
                        {
                          player.name
                        }
                      </strong>

                      <span>
                        {
                          player.category
                        }{" "}
                        •{" "}
                        {
                          player.country
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
                (item, index) => (
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

              {/* CLUB MEMBERS */}

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
                                player.category
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

              {/* OUTSIDE PARTICIPANTS */}

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
                                player.category
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
                  AGE
                </span>

                <strong>
                  {
                    selectedKeptPlayer.age
                  }
                </strong>

              </div>

              <div>

                <span>
                  STYLE
                </span>

                <strong>
                  {
                    selectedKeptPlayer.style
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