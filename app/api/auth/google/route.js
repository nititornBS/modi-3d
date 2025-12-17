import { NextResponse } from "next/server";

export async function POST(request) {
  try {
    const { credential } = await request.json();

    if (!credential) {
      return NextResponse.json(
        { error: "No credential provided" },
        { status: 400 }
      );
    }

    // Verify the Google ID token with Google's servers
    try {
      // Verify token with Google
      const verifyUrl = `https://oauth2.googleapis.com/tokeninfo?id_token=${credential}`;
      const verifyResponse = await fetch(verifyUrl);
      
      if (!verifyResponse.ok) {
        throw new Error("Token verification failed");
      }

      const payload = await verifyResponse.json();

      // Verify the audience (client ID) matches
      const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
      if (payload.aud !== clientId) {
        return NextResponse.json(
          { error: "Invalid token audience" },
          { status: 400 }
        );
      }

      // Return user information
      return NextResponse.json({
        success: true,
        user: {
          username: payload.name || payload.email?.split("@")[0] || "google_user",
          email: payload.email,
          name: payload.name,
          picture: payload.picture,
          method: "google",
        },
      });
    } catch (error) {
      console.error("Token verification error:", error);
      
      // Fallback: decode token locally if verification fails (for development)
      try {
        const base64Url = credential.split(".")[1];
        const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
        const jsonPayload = decodeURIComponent(
          atob(base64)
            .split("")
            .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
            .join("")
        );

        const payload = JSON.parse(jsonPayload);

        return NextResponse.json({
          success: true,
          user: {
            username: payload.name || payload.email?.split("@")[0] || "google_user",
            email: payload.email,
            name: payload.name,
            picture: payload.picture,
            method: "google",
          },
        });
      } catch (decodeError) {
        return NextResponse.json(
          { error: "Invalid token" },
          { status: 400 }
        );
      }
    }
  } catch (error) {
    console.error("Google auth error:", error);
    return NextResponse.json(
      { error: "Authentication failed" },
      { status: 500 }
    );
  }
}
