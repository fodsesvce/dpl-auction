import { AuthProvider } from "./context/AuthContext";
import { useAuth } from "./context/useAuth";

import AuctionDashboard from "./components/auction/AuctionDashboard";
import TeamOwnerDashboard from "./components/owner/TeamOwnerDashboard";
import LoginPage from "./pages/LoginPage";


function AppContent() {
  const {
    session,
    profile,
    loading,
    authError,
    signOut,
  } = useAuth();


  // -------------------------------------------------------
  // AUTHENTICATION INITIALIZATION
  // -------------------------------------------------------

  if (loading) {
    return (
      <div className="dpl-auth-loading">
        <div className="dpl-auth-loading-card">

          <img
            src="/assets/logo/dpl-logo.png"
            alt="DPL"
          />

          <strong>
            CONNECTING TO DPL AUCTION
          </strong>

          <span>
            Please wait...
          </span>

        </div>
      </div>
    );
  }


  // -------------------------------------------------------
  // NOT LOGGED IN
  // -------------------------------------------------------

  if (!session || !profile) {
    return <LoginPage />;
  }


  // -------------------------------------------------------
  // OPERATOR
  //
  // Operator keeps the existing full auction dashboard
  // with all auction controls.
  // -------------------------------------------------------

  if (profile.role === "operator") {
    return (
      <AuctionDashboard
        readOnly={false}
        currentUser={profile}
        onLogout={signOut}
        authError={authError}
      />
    );
  }


  // -------------------------------------------------------
  // TEAM OWNER
  //
  // Team accounts receive their dedicated dashboard.
  // The dashboard uses profile.team_id to determine which
  // team this authenticated account belongs to.
  // -------------------------------------------------------

  if (profile.role === "team") {
    return (
      <TeamOwnerDashboard
        currentUser={profile}
        onLogout={signOut}
        authError={authError}
      />
    );
  }


  // -------------------------------------------------------
  // UNKNOWN / INVALID ROLE
  // -------------------------------------------------------

  return (
    <div className="dpl-auth-loading">
      <div className="dpl-auth-loading-card">

        <img
          src="/assets/logo/dpl-logo.png"
          alt="DPL"
        />

        <strong>
          ACCESS NOT CONFIGURED
        </strong>

        <span>
          Your DPL account does not have a valid role.
          Please contact the administrator.
        </span>

        <button
          type="button"
          onClick={signOut}
          style={{
            marginTop: "16px",
            padding: "10px 16px",
            border: "1px solid rgba(255,255,255,0.12)",
            background: "#f5f5f5",
            color: "#07090d",
            cursor: "pointer",
            fontWeight: 800,
            letterSpacing: "0.08em",
          }}
        >
          SIGN OUT
        </button>

      </div>
    </div>
  );
}


// ---------------------------------------------------------
// ROOT APP
// ---------------------------------------------------------

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}


export default App;