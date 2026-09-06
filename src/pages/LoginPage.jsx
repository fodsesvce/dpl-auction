import { useState } from "react";

import {
  LockKeyhole,
  Radio,
  ShieldCheck,
} from "lucide-react";

import { useAuth } from "../context/useAuth";

import "./LoginPage.css";


function LoginPage() {
  const {
    signIn,
    authError,
  } = useAuth();


  const [email, setEmail] =
    useState("");

  const [password, setPassword] =
    useState("");

  const [error, setError] =
    useState(authError || "");

  const [submitting, setSubmitting] =
    useState(false);


  const handleSubmit = async (event) => {
    event.preventDefault();

    setError("");


    if (
      !email.trim() ||
      !password
    ) {
      setError(
        "Enter your login ID / email and password."
      );

      return;
    }


    setSubmitting(true);


    const result = await signIn(
      email,
      password
    );


    setSubmitting(false);


    if (result.error) {
      setError(
        result.error.message ||
          "Login failed."
      );
    }
  };


  return (
    <main className="dpl-login-page">

      <div className="dpl-login-grid" />

      <div className="dpl-login-glow dpl-login-glow-one" />

      <div className="dpl-login-glow dpl-login-glow-two" />


      <section className="dpl-login-shell">

        <div className="dpl-login-brand">

          <img
            src="/assets/logo/dpl-logo.png"
            alt="DPL"
          />

          <div>

            <strong>
              DPL AUCTION
            </strong>

            <span>
              PLAYER AUCTION 2026
            </span>

          </div>

        </div>


        <div className="dpl-login-card">

          <div className="dpl-login-card-top">

            <div className="dpl-login-icon">
              <LockKeyhole size={21} />
            </div>


            <div>

              <span className="dpl-login-eyebrow">
                SECURE AUCTION ACCESS
              </span>

              <h1>
                Sign in to continue
              </h1>

              <p>
                Administrators can control bidding.
                Team accounts receive a live,
                view-only auction portal.
              </p>

            </div>

          </div>


          <div className="dpl-login-role-note">

            <div>
              <ShieldCheck size={17} />

              <span>
                Role-based access enabled
              </span>
            </div>


            <div>
              <Radio size={17} />

              <span>
                Live auction sync
              </span>
            </div>

          </div>


          <form
            onSubmit={handleSubmit}
            className="dpl-login-form"
          >

            <label>

              LOGIN ID / EMAIL

              <input
                type="email"
                autoComplete="username"
                placeholder="admin@dplauction.com"
                value={email}
                onChange={(event) =>
                  setEmail(
                    event.target.value
                  )
                }
              />

            </label>


            <label>

              PASSWORD

              <input
                type="password"
                autoComplete="current-password"
                placeholder="Enter your password"
                value={password}
                onChange={(event) =>
                  setPassword(
                    event.target.value
                  )
                }
              />

            </label>


            {error && (
              <div className="dpl-login-error">
                {error}
              </div>
            )}


            <button
              type="submit"
              disabled={submitting}
            >
              {submitting
                ? "AUTHENTICATING..."
                : "ENTER AUCTION →"}
            </button>

          </form>


          <div className="dpl-login-footer">

            <span>
              OPERATOR
            </span>

            <span>
              TEAM VIEWER
            </span>

            <span>
              REAL-TIME
            </span>

          </div>

        </div>


        <p className="dpl-login-security">
          Your password is handled by Supabase
          Authentication. Never place an administrator
          password in frontend source code.
        </p>

      </section>

    </main>
  );
}


export default LoginPage;