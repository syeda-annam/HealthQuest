import { useState, useEffect } from "react";
import { Sun, Moon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getTheme, setTheme } from "@/lib/theme";

export function ThemeToggle() {
  const [current, setCurrent] = useState<"dark" | "light">(getTheme());

  useEffect(() => {
    setTheme(current);
  }, [current]);

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => setCurrent(c => c === "dark" ? "light" : "dark")}
      aria-label="Toggle theme"
    >
      {current === "dark" ? <Sun className="h-[18px] w-[18px]" /> : <Moon className="h-[18px] w-[18px]" />}
    </Button>
  );
}
