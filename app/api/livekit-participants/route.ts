import { RoomServiceClient } from "livekit-server-sdk";
import { NextResponse } from "next/server";

export async function GET() {
  const livekitUrl = process.env.LIVEKIT_URL;
  const apiKey = process.env.LIVEKIT_API_KEY;
  const apiSecret = process.env.LIVEKIT_API_SECRET;

  if (!livekitUrl || !apiKey || !apiSecret) {
    return NextResponse.json({ error: "LiveKit env eksik" }, { status: 500 });
  }

  const roomService = new RoomServiceClient(livekitUrl, apiKey, apiSecret);

  try {
    const participants = await roomService.listParticipants("genel-ses");

    return NextResponse.json({
      participants: participants.map((p) => p.name || p.identity),
    });
  } catch {
    return NextResponse.json({ participants: [] });
  }
}