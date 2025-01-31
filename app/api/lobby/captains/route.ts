import { NextResponse } from "next/server";
import { getCaptainsInLobby } from "@/utils/lobbyState"; // Ensure it's the same module WebSocket uses

export async function GET() {
  try {
    const captains = [...getCaptainsInLobby()]; // Convert Set to array
    console.log("✅ API Fetching Captains:", captains);
    return NextResponse.json({ captains });
  } catch (error) {
    console.error("❌ Error fetching captains:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
