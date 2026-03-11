import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

interface ProfileContextType {
  moduleCycle: boolean;
  moduleMood: boolean;
  profileLoaded: boolean;
  profileComplete: boolean;
  setModuleCycle: (v: boolean) => void;
  setModuleMood: (v: boolean) => void;
}

const ProfileContext = createContext<ProfileContextType>({
  moduleCycle: false,
  moduleMood: false,
  profileLoaded: false,
  profileComplete: false,
  setModuleCycle: () => {},
  setModuleMood: () => {},
});

export const useProfile = () => useContext(ProfileContext);

export function ProfileProvider({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const [moduleCycle, setModuleCycle] = useState(false);
  const [moduleMood, setModuleMood] = useState(false);
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [profileComplete, setProfileComplete] = useState(false);

  useEffect(() => {
    if (loading || !user) {
      setProfileLoaded(false);
      return;
    }

    supabase
      .from("profiles")
      .select("profile_complete, module_cycle, module_mood")
      .eq("id", user.id)
      .single()
      .then(({ data }) => {
        if (data) {
          setProfileComplete(data.profile_complete || false);
          setModuleCycle(data.module_cycle || false);
          setModuleMood(data.module_mood || false);
        }
        setProfileLoaded(true);
      });
  }, [user, loading]);

  return (
    <ProfileContext.Provider
      value={{ moduleCycle, moduleMood, profileLoaded, profileComplete, setModuleCycle, setModuleMood }}
    >
      {children}
    </ProfileContext.Provider>
  );
}
