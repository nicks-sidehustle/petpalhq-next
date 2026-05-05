import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, name, source } = body;

    if (!email || !email.includes("@")) {
      return NextResponse.json({ message: "Valid email address is required" }, { status: 400 });
    }

    const BREVO_API_KEY = process.env.BREVO_API_KEY;
    if (!BREVO_API_KEY) {
      console.error("BREVO_API_KEY not configured");
      return NextResponse.json({ message: "Newsletter service temporarily unavailable" }, { status: 503 });
    }

    const brevoResponse = await fetch("https://api.brevo.com/v3/contacts", {
      method: "POST",
      headers: {
        accept: "application/json",
        "content-type": "application/json",
        "api-key": BREVO_API_KEY,
      },
      body: JSON.stringify({
        email,
        attributes: {
          FIRSTNAME: name || "",
          SOURCE: "petpalhq",
          SIGNUP_SOURCE: source || "website",
        },
        listIds: [11],
        updateEnabled: true,
      }),
    });

    const data = await brevoResponse.json().catch(() => null);
    const isDuplicate = data?.code === "duplicate_parameter" ||
      (brevoResponse.status === 400 && JSON.stringify(data).includes("Contact already exist"));

    if (!brevoResponse.ok && !isDuplicate) {
      console.error("Brevo error:", brevoResponse.status, data);
      throw new Error(`Brevo error: ${brevoResponse.status}`);
    }

    if (isDuplicate) {
      return NextResponse.json({ message: "You're already subscribed!" }, { status: 200 });
    }

    return NextResponse.json({ message: "Successfully subscribed!", email }, { status: 200 });
  } catch (error) {
    console.error("Newsletter subscription error:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
