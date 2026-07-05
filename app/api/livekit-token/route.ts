import { AccessToken } from "livekit-server-sdk";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const room = req.nextUrl.searchParams.get("room");
  const username = req.nextUrl.searchParams.get("username") || "Anonim";
  const identity = req.nextUrl.searchParams.get("identity") || username;

  const apiKey = process.env.LIVEKIT_API_KEY;
  const apiSecret = process.env.LIVEKIT_API_SECRET;
  const livekitUrl = process.env.LIVEKIT_URL;

  if (!apiKey || !apiSecret || !livekitUrl) {
    return NextResponse.json({ error: "LiveKit env eksik" }, { status: 500 });
  }

  const token = new AccessToken(apiKey, apiSecret, {
    identity,
    name: username,
  });

  token.addGrant({
    room: room || "genel-ses",
    roomJoin: true,
    canPublish: true,
    canSubscribe: true,
  });

  return NextResponse.json({
    token: await token.toJwt(),
    url: livekitUrl,
  });
}