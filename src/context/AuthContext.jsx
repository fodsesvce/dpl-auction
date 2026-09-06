import {
  useCallback,
  useEffect,
  useState,
} from "react";

import { supabase } from "../lib/supabase";
import { AuthContext } from "./auth-context";

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);

  const [loading, setLoading] = useState(true);

  const [authError, setAuthError] = useState("");


  const loadProfile = useCallback(
    async (user) => {
      if (!user) {
        setProfile(null);
        return;
      }

      const { data, error } = await supabase
        .from("profiles")
        .select(
          "id, role, team_id, display_name"
        )
        .eq("id", user.id)
        .maybeSingle();

      if (error) {
        throw error;
      }

      if (!data) {
        throw new Error(
          "This account has no DPL role assigned. Ask the administrator to add your account to profiles."
        );
      }

      setProfile(data);
    },
    []
  );


  useEffect(() => {
    let mounted = true;

    const initialize = async () => {
      try {
        const { data, error } =
          await supabase.auth.getSession();

        if (error) {
          throw error;
        }

        if (!mounted) {
          return;
        }

        setSession(data.session);

        if (data.session?.user) {
          await loadProfile(
            data.session.user
          );
        }
      } catch (error) {
        if (mounted) {
          setAuthError(
            error.message ||
              "Unable to initialize authentication."
          );
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    initialize();


    const {
      data: listener,
    } =
      supabase.auth.onAuthStateChange(
        (_event, nextSession) => {
          if (!mounted) {
            return;
          }

          setSession(nextSession);

          if (!nextSession?.user) {
            setProfile(null);
            setAuthError("");
            return;
          }

          setTimeout(async () => {
            try {
              await loadProfile(
                nextSession.user
              );

              if (mounted) {
                setAuthError("");
              }
            } catch (error) {
              if (mounted) {
                setProfile(null);

                setAuthError(
                  error.message ||
                    "Unable to load your DPL role."
                );
              }
            }
          }, 0);
        }
      );


    return () => {
      mounted = false;

      listener.subscription.unsubscribe();
    };
  }, [loadProfile]);


  const signIn = useCallback(
    async (email, password) => {
      setAuthError("");

      const {
        data,
        error,
      } =
        await supabase.auth.signInWithPassword(
          {
            email: email.trim(),
            password,
          }
        );

      if (error) {
        setAuthError(
          error.message ||
            "Invalid username or password."
        );

        return { error };
      }


      try {
        await loadProfile(data.user);
      } catch (profileError) {
        await supabase.auth.signOut();

        setAuthError(
          profileError.message
        );

        return {
          error: profileError,
        };
      }


      setSession(data.session);

      return {
        error: null,
      };
    },
    [loadProfile]
  );


  const signOut = useCallback(
    async () => {
      await supabase.auth.signOut();

      setSession(null);
      setProfile(null);
    },
    []
  );


  const value = {
    session,
    user: session?.user ?? null,
    profile,
    loading,
    authError,
    signIn,
    signOut,
  };


  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}