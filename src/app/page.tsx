"use client";

import { useEffect, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { createInvoiceAction } from "@/app/actions";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, ShieldCheck, Zap, Globe, AlertCircle } from "lucide-react";
import { Logo } from "@/components/icons";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";

const initialState = {
  error: null,
  transactionUrl: null,
};

function PurchaseButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="w-full font-bold" disabled={pending}>
      {pending ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Processing...
        </>
      ) : (
        "Purchase Now"
      )}
    </Button>
  );
}

export default function Home() {
  const [state, formAction] = useFormState(createInvoiceAction, initialState);
  const { toast } = useToast();
  const [email, setEmail] = useState("");

  useEffect(() => {
    // Attempt to retrieve email from local storage on component mount
    const savedEmail = localStorage.getItem("userEmail");
    if (savedEmail) {
      setEmail(savedEmail);
    }
  }, []);

  useEffect(() => {
    if (state?.transactionUrl) {
      window.location.href = state.transactionUrl;
    }
    if (state?.error) {
       toast({
        variant: "destructive",
        title: "An error occurred",
        description: state.error,
      });
    }
  }, [state, toast]);

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value);
    // Save email to local storage on change
    localStorage.setItem("userEmail", e.target.value);
  };


  return (
    <div className="flex flex-col min-h-screen bg-background font-body">
      <header className="container mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <nav className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Logo className="h-8 w-8 text-primary" />
            <span className="text-xl font-bold font-headline text-foreground">
              V2Ray Store
            </span>
          </div>
        </nav>
      </header>

      <main className="flex-grow container mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-24">
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-6xl font-bold font-headline text-foreground tracking-tighter">
            Secure, Fast, Unrestricted Internet
          </h1>
          <p className="mt-4 max-w-2xl mx-auto text-lg text-muted-foreground">
            Get your personal V2Ray configuration and enjoy a seamless online
            experience. One-time payment, lifetime access.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          <Card className="w-full shadow-lg border-2 border-primary transform hover:scale-105 transition-transform duration-300">
            <CardHeader>
              <CardTitle className="font-headline text-2xl">
                V2Ray Config
              </CardTitle>
              <CardDescription>
                Lifetime access to a personal, high-speed V2Ray server configuration.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
               <div className="text-4xl font-bold font-headline text-foreground">
                $5.00 <span className="text-base font-normal text-muted-foreground">/ one-time</span>
              </div>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-primary" />
                  Enhanced Security & Privacy
                </li>
                <li className="flex items-center gap-2">
                  <Zap className="h-4 w-4 text-primary" />
                  High-Speed Connection
                </li>
                <li className="flex items-center gap-2">
                  <Globe className="h-4 w-4 text-primary" />
                  Bypass Geo-restrictions
                </li>
              </ul>
              <form action={formAction}>
                <div className="space-y-4">
                   <div className="space-y-2">
                    <Label htmlFor="email" className="font-bold">Email Address</Label>
                    <p className="text-xs text-muted-foreground">Your V2Ray config will be sent to this email.</p>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      placeholder="you@example.com"
                      required
                      value={email}
                      onChange={handleEmailChange}
                      className="bg-background"
                    />
                  </div>
                  <PurchaseButton />
                </div>
              </form>
            </CardContent>
          </Card>

          <Card className="w-full shadow-lg flex flex-col items-center justify-center text-center bg-card/50 border-dashed">
            <CardHeader>
              <CardTitle className="font-headline text-2xl">
                New Products
              </CardTitle>
              <CardDescription>
                More privacy solutions are on the way.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-4xl font-bold font-headline text-muted-foreground animate-pulse">
                Coming Soon
              </p>
            </CardContent>
            <CardFooter>
                 <p className="text-xs text-muted-foreground">Stay tuned for updates!</p>
            </CardFooter>
          </Card>
        </div>
      </main>

      <footer className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 text-center text-muted-foreground text-sm">
        <p>&copy; {new Date().getFullYear()} V2Ray Store. All rights reserved.</p>
      </footer>
    </div>
  );
}
