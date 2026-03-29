/**
 * ARIA Actions — executes structured commands parsed from ARIA's response.
 * Currently handles: CREATE_MISSION
 */

import api from "@/lib/api";
import type { ARIAMissionPayload } from "./aria-engine";

// Backend valid values
const ORBIT_MAP: Record<string, string> = {
  leo: "leo",
  sso: "sso",
  geo: "geo",
  sub: "sub",
  gto: "geo",       // map GTO → geo (closest)
  lunar: "sub",     // suborbital for lunar direct
  interplanetary: "leo",
  suborbital: "sub",
};

const VEHICLE_MAP: Record<string, string> = {
  sounding: "sounding",
  sslv: "sslv",
  pslv: "pslv",
  gslv2: "gslv2",
  lvm3: "lvm3",
  "gslv mk iii": "lvm3",
  "gslv mk ii": "gslv2",
  "gslv mkiii": "lvm3",
  "gslv mkii": "gslv2",
  bahubali: "lvm3",
};

export interface MissionCreateResult {
  success: boolean;
  missionId?: string;
  error?: string;
}

export async function createMissionFromARIA(
  payload: ARIAMissionPayload
): Promise<MissionCreateResult> {
  try {
    // Map orbit_type to valid backend value
    const orbit = payload.orbit_type
      ? ORBIT_MAP[payload.orbit_type.toLowerCase()] ?? "leo"
      : "leo";

    // Map vehicle_class to valid backend value
    const vehicle =
      VEHICLE_MAP[payload.vehicle_class.toLowerCase()] ??
      payload.vehicle_class.toLowerCase();

    // Extract date portion only (backend expects date, not datetime)
    const launchDate = payload.launch_date.split("T")[0];

    const body = {
      title: payload.mission_name,
      target_body: payload.target_body.toLowerCase(),
      launch_pad_id: payload.launch_site.toLowerCase(),
      vehicle_class: vehicle,
      orbit_type: orbit,
      launch_date: launchDate,
    };

    const { data } = await api.post("/api/missions/", body);

    return { success: true, missionId: data.id };
  } catch (err: unknown) {
    const message =
      (err as { response?: { data?: { detail?: string } } })?.response?.data
        ?.detail ?? "Mission creation failed.";
    return { success: false, error: message };
  }
}
