import { NextRequest, NextResponse } from "next/server";
import { RoomServiceClient } from "livekit-server-sdk";

export async function GET(req: NextRequest) {
  const roomName = req.nextUrl.searchParams.get("room") || "genel-ses";

  const livekitUrl = process.env.LIVEKIT_URL;
  const apiKey = process.env.LIVEKIT_API_KEY;
  const apiSecret = process.env.LIVEKIT_API_SECRET;

  if (!livekitUrl || !apiKey || !apiSecret) {
    return NextResponse.json({ error: "LiveKit env eksik" }, { status: 500 });
  }

  try {
    const service = new RoomServiceClient(livekitUrl, apiKey, apiSecret);
    const participants = await service.listParticipants(roomName);

    const names = participants.map((p) => p.name || p.identity);

    const screenUser = participants.find((p: any) =>
      p.tracks?.some((t: any) => t.source === 2 || t.source === "SCREEN_SHARE")
    );

    return NextResponse.json({
      participants: names,
      screenSharing: Boolean(screenUser),
      screenOwner: screenUser?.name || screenUser?.identity || "",
    });
  } catch {
    return NextResponse.json({
      participants: [],
      screenSharing: false,
      screenOwner: "",
    });
  }
}