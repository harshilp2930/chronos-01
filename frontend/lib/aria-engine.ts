/**
 * ARIA Engine client helpers.
 * The actual Gemini call is proxied through the Next.js API route so the
 * browser never receives the Gemini API key.
 */

export interface ARIAMessage {
  role: "user" | "model";
  content: string;
}

export async function callARIA(
  history: ARIAMessage[],
  userMessage: string
): Promise<string> {
  try {
    const res = await fetch("/api/aria", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        history,
        userMessage,
      }),
    });

    const data = (await res.json().catch(() => null)) as
      | { text?: string; error?: string }
      | null;

    if (!res.ok) {
      return (
        data?.error ??
        `⚠️ ARIA encountered a connection issue (HTTP ${res.status}). Please try again later.`
      );
    }

    return (
      data?.text ??
      "⚠️ ARIA returned an empty response. Please try again."
    );
  } catch (err) {
    console.error("ARIA engine error:", err);
    return "⚠️ ARIA is unreachable. Check your network connection.";
  }
}

/**
 * Parse a CREATE_MISSION JSON block from ARIA's response, if present.
 */
export interface ARIAMissionPayload {
  mission_name: string;
  launch_site: string;
  launch_date: string;
  target_body: string;
  vehicle_class: string;
  orbit_type?: string;
  description?: string;
}

export function parseMissionAction(
  response: string
): ARIAMissionPayload | null {
  const match = response.match(/```json\s*([\s\S]*?)\s*```/);
  if (!match) return null;

  try {
    const parsed = JSON.parse(match[1]);
    if (parsed?.action === "CREATE_MISSION" && parsed?.data) {
      return parsed.data as ARIAMissionPayload;
    }
  } catch {
    // Not valid JSON
  }
  return null;
}

/**
 * Strip the JSON block from ARIA's response so only the human-readable
 * confirmation text is shown in the chat bubble.
 */
export function stripMissionJson(response: string): string {
  return response.replace(/```json\s*[\s\S]*?\s*```/g, "").trim();
}
