import { useEffect, useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface Callback {
  id: number;
  userId: number;
  phone: string;
  status: "pending" | "completed";
  createdAt: string;
  user: {
    firstName: string;
    lastName: string;
    email: string;
  };
}

export function Callbacks() {
  const [callbacks, setCallbacks] = useState<Callback[]>([]);

  const fetchCallbacks = async () => {
    try {
      const res = await fetch("/api/callbacks");
      if (!res.ok) throw new Error();
      const data = await res.json();
      setCallbacks(data);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Fehler",
        description: "Rückrufe konnten nicht geladen werden",
      });
    }
  };

  const updateCallbackStatus = async (id: number, status: "completed") => {
    try {
      const res = await fetch(`/api/callbacks/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });

      if (!res.ok) throw new Error();

      toast({
        title: "Erfolg",
        description: "Status wurde aktualisiert",
      });

      fetchCallbacks();
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Fehler",
        description: "Status konnte nicht aktualisiert werden",
      });
    }
  };

  useEffect(() => {
    fetchCallbacks();
    // Poll for new callbacks every minute
    const interval = setInterval(fetchCallbacks, 60000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold tracking-tight">Rückrufe</h2>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Kunde</TableHead>
            <TableHead>Telefon</TableHead>
            <TableHead>Datum</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Aktionen</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {callbacks.map((callback) => (
            <TableRow key={callback.id}>
              <TableCell>
                <div>
                  <div className="font-medium">{`${callback.user.firstName} ${callback.user.lastName}`}</div>
                  <div className="text-sm text-muted-foreground">
                    {callback.user.email}
                  </div>
                </div>
              </TableCell>
              <TableCell>{callback.phone}</TableCell>
              <TableCell>
                {new Date(callback.createdAt).toLocaleString("de-DE")}
              </TableCell>
              <TableCell>
                <span
                  className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                    callback.status === "completed"
                      ? "bg-green-50 text-green-700"
                      : "bg-yellow-50 text-yellow-700"
                  }`}
                >
                  {callback.status === "completed" ? "Erledigt" : "Ausstehend"}
                </span>
              </TableCell>
              <TableCell>
                {callback.status === "pending" && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => updateCallbackStatus(callback.id, "completed")}
                  >
                    <Check className="h-4 w-4" />
                    <span className="sr-only">Als erledigt markieren</span>
                  </Button>
                )}
              </TableCell>
            </TableRow>
          ))}
          {callbacks.length === 0 && (
            <TableRow>
              <TableCell colSpan={5} className="text-center">
                Keine Rückrufe vorhanden
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
