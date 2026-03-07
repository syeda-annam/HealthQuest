import { useLocation } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Construction } from "lucide-react";

export default function PlaceholderPage() {
  const location = useLocation();
  const pageName = location.pathname.slice(1).charAt(0).toUpperCase() + location.pathname.slice(2);

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Card className="max-w-md w-full border-border bg-card">
        <CardContent className="text-center py-12 space-y-4">
          <Construction className="h-12 w-12 mx-auto text-primary" />
          <h2 className="text-2xl font-heading font-bold text-foreground">{pageName}</h2>
          <p className="text-muted-foreground">This module is coming soon. Stay tuned!</p>
        </CardContent>
      </Card>
    </div>
  );
}
