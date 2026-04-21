import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useProfile } from "@/contexts/ProfileContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Trophy, UserPlus, Check, X, Search, Crown, Sparkles } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface GlobalRow {
  user_id: string;
  display_name: string;
  level: number;
  total_xp_earned: number;
  weekly_xp: number;
  badge_count: number;
}

interface FriendRow {
  user_id: string;
  display_name: string;
  level: number;
  total_xp_earned: number;
  badge_count: number;
  streak_sum: number;
}

interface PendingReq {
  request_id: string;
  sender_id: string;
  sender_name: string;
  created_at: string;
}

interface SearchResult {
  user_id: string;
  display_name: string;
}

export default function Leaderboard() {
  const { user } = useAuth();
  const { refreshProfile } = useProfile();
  const { toast } = useToast();

  const [optedIn, setOptedIn] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [global, setGlobal] = useState<GlobalRow[]>([]);
  const [friends, setFriends] = useState<FriendRow[]>([]);
  const [pending, setPending] = useState<PendingReq[]>([]);
  const [myRank, setMyRank] = useState<number | null>(null);
  const [loadingBoards, setLoadingBoards] = useState(true);

  // Friend search modal
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);

  const loadAll = useCallback(async () => {
    if (!user) return;
    setLoadingBoards(true);
    const [profRes, gRes, fRes, pRes, rankRes] = await Promise.all([
      supabase.from("profiles").select("leaderboard_opt_in").eq("id", user.id).single(),
      supabase.rpc("get_global_leaderboard"),
      supabase.rpc("get_friends_leaderboard"),
      supabase.rpc("get_pending_friend_requests"),
      supabase.rpc("get_my_global_rank"),
    ]);
    setOptedIn(!!profRes.data?.leaderboard_opt_in);
    setGlobal((gRes.data as GlobalRow[]) || []);
    setFriends((fRes.data as FriendRow[]) || []);
    setPending((pRes.data as PendingReq[]) || []);
    setMyRank(typeof rankRes.data === "number" ? rankRes.data : null);
    setLoadingProfile(false);
    setLoadingBoards(false);
  }, [user]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const toggleOptIn = async (next: boolean) => {
    if (!user) return;
    setOptedIn(next);
    const { error } = await supabase
      .from("profiles")
      .update({ leaderboard_opt_in: next })
      .eq("id", user.id);
    if (error) {
      toast({ title: "Couldn't update", description: error.message, variant: "destructive" });
      setOptedIn(!next);
      return;
    }
    toast({
      title: next ? "You're on the leaderboard 🎉" : "You've stepped off the leaderboard",
      description: next
        ? "Your name and XP are now visible to other players."
        : "Your row is hidden from everyone else.",
    });
    refreshProfile();
    loadAll();
  };

  const runSearch = async () => {
    if (searchQuery.trim().length < 2) {
      setSearchResults([]);
      return;
    }
    setSearching(true);
    const { data } = await supabase.rpc("search_users_for_friend", { _query: searchQuery.trim() });
    setSearchResults((data as SearchResult[]) || []);
    setSearching(false);
  };

  const sendRequest = async (friendId: string, name: string) => {
    if (!user) return;
    const { error } = await supabase
      .from("friends")
      .insert({ user_id: user.id, friend_id: friendId, status: "pending" });
    if (error) {
      toast({
        title: "Couldn't send request",
        description: error.message.includes("duplicate") ? "You've already sent or received a request from them." : error.message,
        variant: "destructive",
      });
      return;
    }
    toast({ title: `Friend request sent to ${name}`, description: "They'll get a notification on their leaderboard." });
    setSearchOpen(false);
    setSearchQuery("");
    setSearchResults([]);
  };

  const acceptRequest = async (req: PendingReq) => {
    const { error } = await supabase
      .from("friends")
      .update({ status: "accepted" })
      .eq("id", req.request_id);
    if (error) {
      toast({ title: "Couldn't accept", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: `${req.sender_name} is now your friend 🤝` });
    loadAll();
  };

  const declineRequest = async (req: PendingReq) => {
    const { error } = await supabase.from("friends").delete().eq("id", req.request_id);
    if (error) {
      toast({ title: "Couldn't decline", description: error.message, variant: "destructive" });
      return;
    }
    loadAll();
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      <header className="space-y-1">
        <div className="flex items-center gap-3">
          <Trophy className="h-7 w-7 text-primary" />
          <h1 className="font-heading text-3xl tracking-tight">Leaderboard</h1>
        </div>
        <p className="text-muted-foreground font-body">
          A friendly nudge — see how your healthy habits stack up.
        </p>
      </header>

      {/* Opt-in banner */}
      {!loadingProfile && (
        <Card className={optedIn ? "border-accent/60 bg-accent/10" : "border-highlight/60 bg-highlight/10"}>
          <CardContent className="p-5 flex flex-col sm:flex-row sm:items-center gap-4 justify-between">
            <div className="flex items-start gap-3">
              <Sparkles className="h-5 w-5 text-primary mt-0.5 shrink-0" />
              <div>
                <p className="font-semibold">
                  {optedIn ? "You're on the leaderboard" : "You're not on the leaderboard"}
                </p>
                <p className="text-sm text-muted-foreground">
                  {optedIn
                    ? "Other players can see your name, level, XP and badge count. No health data is ever shared."
                    : "Enable it to compete with the community. We only share your name initial, level, XP and badges."}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <span className="text-sm font-medium">{optedIn ? "On" : "Off"}</span>
              <Switch checked={optedIn} onCheckedChange={toggleOptIn} />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Friend Requests */}
      {pending.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="font-heading text-xl">Friend requests</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {pending.map((req) => (
              <div
                key={req.request_id}
                className="flex items-center justify-between p-3 rounded-md border border-border bg-card/60"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-accent flex items-center justify-center font-semibold text-primary">
                    {req.sender_name.charAt(0).toUpperCase()}
                  </div>
                  <span className="font-medium">{req.sender_name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="default" onClick={() => acceptRequest(req)}>
                    <Check className="h-4 w-4" /> Accept
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => declineRequest(req)}>
                    <X className="h-4 w-4" /> Decline
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Global Leaderboard */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle className="font-heading text-xl flex items-center gap-2">
              <Crown className="h-5 w-5 text-highlight" /> Global top 20
            </CardTitle>
            {myRank !== null && (
              <p className="text-sm text-muted-foreground mt-1">
                You're ranked <span className="font-semibold text-primary">#{myRank}</span> globally
              </p>
            )}
          </div>
          <Dialog open={searchOpen} onOpenChange={setSearchOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <UserPlus className="h-4 w-4" /> Add friend
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle className="font-heading">Find a friend</DialogTitle>
                <DialogDescription>
                  Search by their name or email. Only their name will be shared back to you.
                </DialogDescription>
              </DialogHeader>
              <div className="flex items-center gap-2">
                <Input
                  placeholder="Type a name or email…"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && runSearch()}
                />
                <Button onClick={runSearch} disabled={searching}>
                  <Search className="h-4 w-4" />
                </Button>
              </div>
              <div className="space-y-2 max-h-72 overflow-y-auto">
                {searching && <p className="text-sm text-muted-foreground">Searching…</p>}
                {!searching && searchResults.length === 0 && searchQuery.length >= 2 && (
                  <p className="text-sm text-muted-foreground">No one matched. Try another spelling.</p>
                )}
                {searchResults.map((r) => (
                  <div
                    key={r.user_id}
                    className="flex items-center justify-between p-3 rounded-md border border-border"
                  >
                    <span className="font-medium">{r.display_name}</span>
                    <Button size="sm" onClick={() => sendRequest(r.user_id, r.display_name)}>
                      Send request
                    </Button>
                  </div>
                ))}
              </div>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          {loadingBoards ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : global.length === 0 ? (
            <p className="text-muted-foreground text-sm py-6 text-center">
              No one's opted in yet. Be the first to step onto the leaderboard!
            </p>
          ) : (
            <div className="space-y-1">
              {global.map((row, i) => {
                const isMe = row.user_id === user?.id;
                return (
                  <div
                    key={row.user_id}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-md transition-colors ${
                      isMe
                        ? "bg-primary/10 border border-primary/40"
                        : "hover:bg-accent/20"
                    }`}
                  >
                    <span
                      className={`w-7 text-center font-semibold ${
                        i === 0 ? "text-highlight text-lg" : "text-muted-foreground"
                      }`}
                    >
                      {i + 1}
                    </span>
                    <div className="w-9 h-9 rounded-full bg-accent flex items-center justify-center font-semibold text-primary">
                      {row.display_name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">
                        {row.display_name} {isMe && <span className="text-xs text-primary">(you)</span>}
                      </p>
                    </div>
                    <Badge variant="secondary" className="bg-accent/40 text-primary border-0">
                      Lv {row.level}
                    </Badge>
                    <div className="text-right hidden sm:block">
                      <p className="font-semibold tabular-nums">{row.total_xp_earned.toLocaleString()} XP</p>
                      {row.weekly_xp > 0 && (
                        <p className="text-xs text-muted-foreground">+{row.weekly_xp} this week</p>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground hidden md:inline">
                      🏅 {row.badge_count}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Friends Leaderboard */}
      <Card>
        <CardHeader>
          <CardTitle className="font-heading text-xl">Your circle</CardTitle>
        </CardHeader>
        <CardContent>
          {loadingBoards ? (
            <Skeleton className="h-24 w-full" />
          ) : friends.length <= 1 ? (
            <div className="py-8 text-center space-y-2">
              <p className="text-muted-foreground">No friends yet.</p>
              <p className="text-sm text-muted-foreground">
                Invite someone with the <strong>Add friend</strong> button above — accountability is half the journey.
              </p>
            </div>
          ) : (
            <div className="space-y-1">
              {friends.map((row, i) => {
                const isMe = row.user_id === user?.id;
                return (
                  <div
                    key={row.user_id}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-md ${
                      isMe ? "bg-primary/10 border border-primary/40" : "hover:bg-accent/20"
                    }`}
                  >
                    <span className="w-7 text-center font-semibold text-muted-foreground">{i + 1}</span>
                    <div className="w-9 h-9 rounded-full bg-accent flex items-center justify-center font-semibold text-primary">
                      {row.display_name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">
                        {row.display_name} {isMe && <span className="text-xs text-primary">(you)</span>}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        🔥 {row.streak_sum} day streak total · 🏅 {row.badge_count} badges
                      </p>
                    </div>
                    <Badge variant="secondary" className="bg-accent/40 text-primary border-0">
                      Lv {row.level}
                    </Badge>
                    <div className="text-right hidden sm:block">
                      <p className="font-semibold tabular-nums">{row.total_xp_earned.toLocaleString()} XP</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
