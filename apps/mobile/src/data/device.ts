/**
 * The camera, the photo library and the GPS, behind three functions that never throw and never
 * talk to the user.
 *
 * Both screens that need them already know what to draw for every outcome, so what they want back
 * is a result they can switch on — not a promise that rejects, and not an `Alert` raised from
 * under them. `'denied'` and `'failed'` are separate because they are different sentences: one
 * sends the user to their phone settings, the other just asks them to try again.
 *
 * **Nothing here uploads or persists.** A photo comes back as a local file URI and a location as
 * two numbers; both live in the screen's state until the user submits, and submitting is still
 * mock. Phase B is what writes either of them anywhere.
 *
 * The bodies are left for the implementer — see `briefs/04-splash-onboarding-device.md`.
 */

/** A photo the user picked, as a local `file://` URI, with the size the picker reported. */
export type Photo = { uri: string; width: number; height: number };

export type PhotoResult =
  | { ok: true; photo: Photo }
  /** The user backed out of the camera or the picker. Say nothing; this is not an error. */
  | { ok: false; reason: 'cancelled' }
  /** Permission refused. The screen shows `camDenied` or `galDenied` and points at settings. */
  | { ok: false; reason: 'denied' }
  /** Anything else — no camera on the device, the picker crashed. The screen shows `photoFail`. */
  | { ok: false; reason: 'failed' };

export type LocationResult =
  | { ok: true; lat: number; lng: number }
  /** Permission refused. The screen shows `locDenied` and leaves the pin where it was. */
  | { ok: false; reason: 'denied' }
  /** Location services off, or no fix in time. The screen shows `locFailed`. */
  | { ok: false; reason: 'failed' };

/**
 * Opens the camera. Asks for the camera permission first with
 * `ImagePicker.requestCameraPermissionsAsync()`, and returns `'denied'` rather than asking twice
 * if the user says no — the second ask never shows a prompt on either platform, it just returns
 * denied again, so a retry button that silently does nothing is worse than a sentence.
 *
 * `allowsEditing: false` (the branch photographs a scale, not a portrait), `quality: 0.7`, and no
 * `base64` — the file URI is all phase B needs to upload from.
 */
export async function takePhoto(): Promise<PhotoResult> {
  throw new Error('bite 2.5 stage 2 — not implemented');
}

/** The same, from the photo library: `requestMediaLibraryPermissionsAsync` then `launchImageLibraryAsync`, images only. */
export async function pickPhoto(): Promise<PhotoResult> {
  throw new Error('bite 2.5 stage 2 — not implemented');
}

/**
 * One GPS fix. `Location.requestForegroundPermissionsAsync()`, then
 * `getCurrentPositionAsync({ accuracy: Location.Accuracy.High })`.
 *
 * Foreground only, and once — the branch sets its pin while standing in the branch and never
 * again, so nothing here watches a position or runs in the background.
 *
 * Give the fix about 15 seconds and return `'failed'` if it has not arrived: indoors, under a
 * metal roof, `getCurrentPositionAsync` can hang far longer than a person will wait, and the
 * screen's answer to that is to let them drag the pin themselves.
 */
export async function currentLocation(): Promise<LocationResult> {
  throw new Error('bite 2.5 stage 2 — not implemented');
}
