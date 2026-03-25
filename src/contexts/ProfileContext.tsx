import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

interface ProfileContextType {
  moduleCycle: boolean;
  moduleMood: boolean;
  profileLoaded: boolean;
  profileComplete: boolean;
  xp: number;
  level: number;
  totalXPEarned: number;
  name: string;
  setModuleCycle: (v: boolean) => void;
  setModuleMood: (v: boolean) => void;
  refreshProfile: () => void;
}

const ProfileContext = createContext<ProfileContextType>({
  moduleCycle: false,
  moduleMood: false,
  profileLoaded: false,
  profileComplete: false,
  xp: 0,
  level: 1,
  totalXPEarned: 0,
  name: "",
  setModuleCycle: () => {},
  setModuleMood: () => {},
  refreshProfile: () => {},
});

export const useProfile = () => useContext(ProfileContext);

export function ProfileProvider({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const [moduleCycle, setModuleCycle] = useState(false);
  const [moduleMood, setModuleMood] = useState(false);
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [profileComplete, setProfileComplete] = useState(false);
  const [xp, setXp] = useState(0);
  const [level, setLevel] = useState(1);
  const [totalXPEarned, setTotalXPEarned] = useState(0);
  const [name, setName] = useState("");

  const fetchProfile = useCallback(() => {
    if (loading || !user) {
      setProfileLoaded(false);
      return;
    }

    supabase
      .from("profiles")
      .select("profile_complete, module_cycle, module_mood, xp, level, total_xp_earned, name")
      .eq("id", user.id)
      .single()
      .then(({ data }) => {
        if (data) {
          setProfileComplete(data.profile_complete || false);
          setModuleCycle(data.module_cycle || false);
          setModuleMood(data.module_mood || false);
          setXp(Number(data.xp) || 0);
          setLevel(Number(data.level) || 1);
          setTotalXPEarned(Number(data.total_xp_earned) || 0);
          setName(data.name || "");
        }
        setProfileLoaded(true);
      });
  }, [user, loading]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  return (
    <ProfileContext.Provider
      value={{
        moduleCycle, moduleMood, profileLoaded, profileComplete,
        xp, level, totalXPEarned, name,
        setModuleCycle, setModuleMood, refreshProfile: fetchProfile,
      }}
    >
      {children}
    </ProfileContext.Provider>
  );
}
