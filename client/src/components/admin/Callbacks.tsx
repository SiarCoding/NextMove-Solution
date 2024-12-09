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
    <div className="p-6">
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-2xl font-semibold mb-2">Rückrufe</h1>
          <p className="text-muted-foreground">Übersicht aller Rückrufanfragen</p>
        </div>

        <div className="rounded-md border">
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
                          ? "bg-green-600 text-white"
                          : "bg-yellow-500/90 text-white"
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
      </div>
    </div>
  );
}
