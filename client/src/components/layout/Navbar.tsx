import { Link } from "wouter";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Bell } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { User } from "lucide-react";

export function Navbar() {
  const { user, logout } = useAuth();
  const { toast } = useToast();
  const [phone, setPhone] = useState("");

  const requestCallback = async () => {
    try {
      const res = await fetch("/api/callbacks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (res.status === 429) {
          toast({
            variant: "destructive",
            title: "Zu viele Anfragen",
            description: data.error,
          });
        } else {
          throw new Error(data.error);
        }
        return;
      }

      toast({
        title: "Erfolg",
        description: "Rückruf wurde angefordert",
      });
      setPhone("");
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Fehler",
        description: "Rückruf konnte nicht angefordert werden",
      });
    }
  };

  return (
    <div className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-16 items-center px-4 md:px-6">
        {/* Welcome Message */}
        <div className="flex items-center">
          <h1 className="text-xl font-semibold">
            Willkommen im Kundenportal, <span className="text-primary">{user?.firstName}</span>
          </h1>
        </div>

        <div className="flex items-center gap-4 ml-auto">
          <Dialog>
            <DialogTrigger asChild>
              <Button className="bg-primary text-primary-foreground hover:bg-primary/90" size="sm">
                Rückruf vereinbaren
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Rückruf anfordern</DialogTitle>
                <DialogDescription>
                  Wir rufen Sie schnellstmöglich zurück
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <Input
                  placeholder="Ihre Telefonnummer"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
                <Button className="w-full" onClick={requestCallback}>
                  Rückruf anfordern
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          <Button variant="ghost" size="icon" className="relative">
            <Bell className="h-5 w-5" />
            <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] text-primary-foreground">
              2
            </span>
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="relative flex items-center gap-4 rounded-lg px-2 hover:bg-primary/5"
              >
                {/* User Info */}
                <div className="hidden md:flex md:flex-col md:items-end md:gap-0.5">
                  <span className="font-medium">{user?.firstName} {user?.lastName}</span>
                  <span className="text-sm text-muted-foreground">{user?.email}</span>
                </div>
                
                {/* Avatar */}
                <div className="relative">
                  <div className="absolute -inset-1 rounded-full bg-primary/20 blur-sm" />
                  <Avatar className="relative h-12 w-12 border-2 border-primary">
                    <AvatarImage
                      src={`${user?.profileImage}?t=${Date.now()}`}
                      alt={`${user?.firstName} ${user?.lastName}`}
                      className="object-cover"
                      loading="eager"
                    />
                    <AvatarFallback className="bg-primary/10">
                      <User className="h-6 w-6 text-primary" />
                    </AvatarFallback>
                  </Avatar>
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>Mein Account</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/profile">Profil</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/settings">Einstellungen</Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-red-500 focus:text-red-500 focus:bg-red-50 dark:focus:bg-red-950"
                onClick={logout}
              >
                Abmelden
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
}
