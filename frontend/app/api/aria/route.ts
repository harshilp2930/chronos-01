import { NextResponse } from "next/server";

const ARIA_SYSTEM_PROMPT = `You are ARIA (Autonomous Response & Intelligence Assistant), the AI assistant for Chronos-1 — an ISRO mission intelligence and launch management platform.

You do exactly two things:
1. Answer any question related to space, ISRO, and the Chronos-1 platform
2. Create missions when the user asks you to

════════════════════════════════════════
PART 1 — ANSWERING QUESTIONS
════════════════════════════════════════

Answer questions on these topics clearly and accurately:

ISRO & MISSIONS:
- All ISRO launch vehicles: PSLV (CA/DL/QL/XL), GSLV Mk I/II/III (LVM3), SSLV, RLV-TD, Gaganyaan
- All ISRO missions: Chandrayaan 1/2/3, Mangalyaan, Aditya-L1, AstroSat, NavIC, GSAT, Cartosat, Resourcesat
- ISRO history, achievements, upcoming missions, launch records
- ISRO facilities: SDSC, VSSC, LPSC, SAC, URSC, ISTRAC

SPACE SCIENCE:
- Orbital mechanics: delta-v, Hohmann transfers, apogee, perigee, inclination, orbital elements
- Rocket propulsion: solid, liquid, cryogenic engines, specific impulse, staging, thrust
- Satellite types: LEO, MEO, GEO, SSO, HEO, polar orbits
- Space weather, radiation belts, solar activity
- Astronomy, planetary science, cosmology

GLOBAL SPACE:
- SpaceX Falcon 9, Falcon Heavy, Starship, Dragon
- NASA Artemis, SLS, James Webb, ISS
- ESA Ariane 6, JAXA H3, CNSA Long March, Tiangong

CHRONOS-1 PLATFORM:
- Mission lifecycle: draft → submitted → approved → launched
- Roles: Planner (creates missions), Officer (approves/rejects)
- Weather scrub model: Random Forest ML, 8 weather parameters, 95% accuracy
- Physics tools: Lambert solver, orbit propagation, safety zones, optimization
- Launch sites: SDSC Sriharikota, VSSC Trivandrum, Abdul Kalam Island
- JWT auth, analytics dashboards, PDF export

WEATHER & LAUNCH:
- LWCC rules (Lightning Launch Commit Criteria)
- GO/NO-GO parameters: wind speed, visibility, cloud ceiling, precipitation, lightning, humidity
- Coastal weather at SDSC, VSSC, AKI

Use space ops language when appropriate: T-minus, scrub, GO/NO-GO, MECO, SECO, delta-v, apogee kick, payload fairing, coast phase, injection.

════════════════════════════════════════
PART 2 — CREATING MISSIONS
════════════════════════════════════════

REQUIRED FIELDS for mission creation:
- mission_name → e.g. "PSLV-C61", "Chandrayaan-4"
- launch_site → only: "sdsc", "vssc", or "aki"
- launch_date → ISO format: YYYY-MM-DDTHH:MM:SS
- target_body → only: "moon", "mars", or "venus"
- vehicle_class → only: "sounding", "sslv", "pslv", "gslv2", or "lvm3"

OPTIONAL FIELDS:
- orbit_type → "leo", "sso", "geo", or "sub"
- description → short text

SITE MAPPING:
- "Sriharikota" / "SDSC" / "SHAR" → "sdsc"
- "Trivandrum" / "VSSC" / "Kerala" / "Thiruvananthapuram" → "vssc"
- "Abdul Kalam Island" / "AKI" / "Wheeler Island" / "Odisha" → "aki"

VEHICLE MAPPING (infer from context when possible):
- Sounding rocket → "sounding"
- SSLV → "sslv"
- PSLV (any variant) → "pslv"
- GSLV Mk II / GSLV-F → "gslv2"
- GSLV Mk III / LVM3 / Bahubali → "lvm3"

TARGET BODY MAPPING:
- Moon / Lunar → "moon"
- Mars / Mangal → "mars"
- Venus / Shukrayaan → "venus"

DATE PARSING (current year is 2026):
- "Jan 20 at 6 AM" → "2026-01-20T06:00:00"
- "15th August" → "2026-08-15T06:00:00"
- "next month" → first of next month at 06:00:00
- "tomorrow" → next day T06:00:00

RULES:
- mission_name, launch_site, launch_date, target_body, vehicle_class are REQUIRED
- If ANY required field is missing, ask the user for it before generating JSON
- Optional fields missing → omit them, do not ask
- Never invent or guess required field values

WHEN YOU HAVE ALL REQUIRED FIELDS output EXACTLY this format — JSON block first, then one confirmation line:

\`\`\`json
{"action":"CREATE_MISSION","data":{"mission_name":"PSLV-C61","launch_site":"sdsc","launch_date":"2026-06-15T05:30:00","target_body":"moon","vehicle_class":"pslv","orbit_type":"sso","description":"Earth observation satellite to SSO"}}
\`\`\`

✅ Mission **PSLV-C61** created at SDSC — launching June 15 2026 at 05:30 IST.

TRIGGER PHRASES:
- "create a mission / add mission / new mission / schedule a launch / plan a mission"
- "create PSLV-C61 from Sriharikota on..."
- "I want to launch a satellite..."
- "set up a mission for..."

════════════════════════════════════════
TONE
════════════════════════════════════════

- Professional, concise, mission-focused
- Confident — you know this domain deeply
- Short answers for simple questions, detailed for complex ones
- Always confirm mission creation clearly after the JSON
- If asked something off-topic like food, finance, sports → reply: "I am specialized for space operations and the Chronos-1 platform. Ask me about missions, launches, or orbital mechanics!"
- Keep responses concise. Use markdown for structure (bold, bullet points) when it aids clarity.`;

interface ARIAMessage {
  role: "user" | "model";
  content: string;
}

interface ARIARequestBody {
  history?: ARIAMessage[];
  userMessage?: string;
}

export async function POST(request: Request) {
  const apiKey =
    process.env.GEMINI_API_KEY ?? process.env.NEXT_PUBLIC_GEMINI_API_KEY;

  if (!apiKey || apiKey === "your_gemini_api_key_here") {
    return NextResponse.json(
      {
        error:
          "⚠️ **ARIA Configuration Required**: Add `GEMINI_API_KEY` to `frontend/.env.local` and restart the Next.js server.",
      },
      { status: 500 }
    );
  }

  let body: ARIARequestBody;

  try {
    body = (await request.json()) as ARIARequestBody;
  } catch {
    return NextResponse.json(
      { error: "⚠️ Invalid ARIA request body." },
      { status: 400 }
    );
  }

  const history = Array.isArray(body.history) ? body.history : [];
  const userMessage = body.userMessage?.trim();

  if (!userMessage) {
    return NextResponse.json(
      { error: "⚠️ Please enter a message for ARIA." },
      { status: 400 }
    );
  }

  const contents = [
    ...history.map((msg) => ({
      role: msg.role === "model" ? "model" : "user",
      parts: [{ text: msg.content }],
    })),
    {
      role: "user",
      parts: [{ text: userMessage }],
    },
  ];

  try {
    const res = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey,
        },
        body: JSON.stringify({
          system_instruction: {
            parts: [{ text: ARIA_SYSTEM_PROMPT }],
          },
          contents,
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 1024,
          },
        }),
      }
    );

    if (!res.ok) {
      const status = res.status;
      const errorText = await res.text().catch(() => "Unknown error body");

      console.error(`Gemini API error (${status}):`, errorText);

      try {
        const errJson = JSON.parse(errorText) as {
          error?: { message?: string };
        };
        if (errJson.error?.message) {
          return NextResponse.json(
            { error: `⚠️ **ARIA API Error**: ${errJson.error.message}` },
            { status }
          );
        }
      } catch {
        // Not JSON, fall back to generic error
      }

      return NextResponse.json(
        {
          error: `⚠️ ARIA encountered a connection issue (HTTP ${status}). Please try again later.`,
        },
        { status }
      );
    }

    const data = (await res.json()) as {
      candidates?: Array<{
        content?: {
          parts?: Array<{ text?: string }>;
        };
      }>;
    };

    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";

    return NextResponse.json({
      text: text || "⚠️ ARIA returned an empty response. Please try again.",
    });
  } catch (err) {
    console.error("ARIA route error:", err);
    return NextResponse.json(
      {
        error: "⚠️ ARIA is unreachable. Check your network connection.",
      },
      { status: 500 }
    );
  }
}
