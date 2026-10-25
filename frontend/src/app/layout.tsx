import type { Metadata } from "next";
import { ExperimentProvider } from "@/context/ExperimentContext";
import "./globals.css";

export const metadata: Metadata = { title: "Optimisation Arena", description: "Compare numerical optimisation algorithms on scientific benchmark landscapes." };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="en"><body><ExperimentProvider>{children}</ExperimentProvider></body></html>; }
