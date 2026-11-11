export interface CivilizationScene {
  id: string
  /** the desktop frame folder (16:9 landscape) */
  folder: string
  /** the number of desktop frames in `folder` */
  frameCount: number
  label: string
  title: string
  titleAr: string
  body: string
  bodyEn: string
  /**
   * The phone run: a slice of the single portrait sequence in
   * `MOBILE_FRAMES_FOLDER`. The offset is what lets five scenes share one
   * folder while each loads only its own stretch of frames.
   */
  mobile: {
    /** 1-based index of this scene's first frame inside the mobile folder */
    startFrame: number
    /** how many frames belong to this scene on the phone */
    frameCount: number
    /** optional phone-only copy; omitted fields fall back to the desktop copy */
    title?: string
    titleAr?: string
    body?: string
    bodyEn?: string
  }
}

/** All the phone frames live in this one folder, in a single continuous run. */
export const MOBILE_FRAMES_FOLDER = "our_story_frames"

/**
 * The phone export timestamps its final frame at 9.96s instead of the regular
 * 10.00s, so the URL formula needs this one exception. It is keyed by the
 * 1-based frame number and only applied to the mobile folder.
 */
const MOBILE_LAST_FRAME_SECONDS: Record<number, string> = { 101: "9.96" }

export type StoryMode = "desktop" | "mobile"

/** A scene resolved for the current viewport: framing plus the right copy. */
export interface ResolvedScene {
  id: string
  label: string
  title: string
  titleAr: string
  body: string
  bodyEn: string
  folder: string
  /** 1-based index of this scene's first frame inside `folder` */
  startFrame: number
  frameCount: number
}

export const CIVILIZATION_SCENES: CivilizationScene[] = [
  {
    id: "gulf",
    folder: "0_frame",
    frameCount: 41,
    label: "THE GULF · الخليج",
    title: "The Golden Coast",
    titleAr: "الساحل الذهبي",
    body: "من شواطئ الخليج العربي، حيث يلتقي عبق اللبان والبخور بسحر اللآلئ، تبدأ حكاية 3WEEQ في استنطاق أصالة التراث بروح عصرية فاخرة.",
    bodyEn:
      "From the shores of the Arabian Gulf, where frankincense and pearls intertwine, 3WEEQ begins its tale of heritage with modern luxury.",
    mobile: {
      startFrame: 1,
      frameCount: 20,
      body: "من كثبان الخليج الذهبية، حيث تحرس القلاعُ القديمة ذاكرةَ البحر واللبان، تبدأ حكاية 3WEEQ في استنطاق أصالة التراث بروح عصرية فاخرة.",
      bodyEn:
        "From the golden dunes of the Gulf, where ancient forts guard the memory of the sea and frankincense, 3WEEQ begins its tale of heritage with modern luxury.",
    },
  },
  {
    id: "babylon",
    folder: "babel_frames",
    frameCount: 41,
    label: "BABYLON · بابل",
    title: "The Lamassu",
    titleAr: "اللاماسو",
    body: "من بوابة عشتار، حيث تُروى الحكايات بالنقوش المسمارية. من بابل، مهد الحضارات، نستلهم عطوراً تحمل عبق التاريخ وتُخلّد أسراراً منذ آلاف السنين.",
    bodyEn:
      "From the Ishtar Gate, where stories are told through cuneiform. From Babylon, the cradle of civilizations, we draw fragrances carrying the scent of history.",
    mobile: {
      startFrame: 21,
      frameCount: 24,
    },
  },
  {
    id: "egypt",
    folder: "egypt_frames",
    frameCount: 41,
    label: "EGYPT · مصر",
    title: "The Sphinx",
    titleAr: "أبو الهول",
    body: "أبو الهول، الحارس الصامت لوادي الملوك. من مصر، حيث يلتقي الذهب بالأسرار الخالدة، نصنع عطوراً ملكية تُجسد فخامة الفراعنة وخلود النيل.",
    bodyEn:
      "The Sphinx, the silent guardian of the Valley of the Kings. From Egypt, where gold meets eternal secrets, we craft royal fragrances embodying Pharaonic luxury.",
    mobile: {
      startFrame: 45,
      frameCount: 11,
      title: "The Pyramids",
      titleAr: "الأهرامات",
      body: "أهرامات الجيزة، الحرّاس الصامتون على ضفاف النيل. من مصر، حيث يلتقي الذهب بالأسرار الخالدة، نصنع عطوراً ملكية تُجسد فخامة الفراعنة وخلود النيل.",
      bodyEn:
        "The Pyramids of Giza, the silent guardians on the banks of the Nile. From Egypt, where gold meets eternal secrets, we craft royal fragrances embodying Pharaonic luxury and the eternity of the Nile.",
    },
  },
  {
    id: "greece",
    folder: "greese_frames",
    frameCount: 41,
    label: "GREECE · اليونان",
    title: "Marble Memory",
    titleAr: "ذاكرة الرخام",
    body: "من رخام أثينا وأساطير الأولمب، حيث تُنسج الحكايات عن الآلهة والأبطال. نقدم لكم عطوراً كلاسيكية تجمع بين الأناقة الإغريقية والحداثة الخالدة.",
    bodyEn:
      "From the marble of Athens and the myths of Olympus, where tales of gods and heroes are woven. We present classic fragrances blending Greek elegance with timeless modernity.",
    mobile: {
      startFrame: 56,
      frameCount: 20,
    },
  },
  {
    id: "china",
    folder: "china_frames",
    frameCount: 41,
    label: "CHINA · الصين",
    title: "Silk & Stone",
    titleAr: "الحرير والحجر",
    body: "من سور الصين العظيم، وحرير الإمبراطوريات، حيث تلتقي القوة بالرقي. نقدم عطوراً آسرة تجسد حكمة الشرق وتفاصيل الحضارة الصينية العريقة.",
    bodyEn:
      "From the Great Wall of China and the silk of empires, where power meets elegance. We present captivating fragrances embodying the wisdom of the East.",
    mobile: {
      startFrame: 76,
      frameCount: 26,
      body: "من بوابات الصين القرمزية، حيث تتدلّى الفوانيس الحمراء فوق دروب الحرير، وتلتقي القوة بالرقي. نقدم عطوراً آسرة تُجسد حكمة الشرق وتفاصيل الحضارة الصينية العريقة.",
      bodyEn:
        "From the crimson gates of China, where red lanterns hang above the silk roads and power meets elegance. We present captivating fragrances embodying the wisdom of the East and the artistry of Chinese civilization.",
    },
  },
]

/**
 * Resolve the scene list for a viewport. Desktop keeps its five dedicated
 * landscape folders; the phone swaps in the matching slices of the portrait
 * sequence and (where written) the phone-specific copy.
 */
export function resolveScenes(mode: StoryMode): ResolvedScene[] {
  return CIVILIZATION_SCENES.map((scene) => {
    if (mode === "mobile") {
      return {
        id: scene.id,
        label: scene.label,
        title: scene.mobile.title ?? scene.title,
        titleAr: scene.mobile.titleAr ?? scene.titleAr,
        body: scene.mobile.body ?? scene.body,
        bodyEn: scene.mobile.bodyEn ?? scene.bodyEn,
        folder: MOBILE_FRAMES_FOLDER,
        startFrame: scene.mobile.startFrame,
        frameCount: scene.mobile.frameCount,
      }
    }

    return {
      id: scene.id,
      label: scene.label,
      title: scene.title,
      titleAr: scene.titleAr,
      body: scene.body,
      bodyEn: scene.bodyEn,
      folder: scene.folder,
      startFrame: 1,
      frameCount: scene.frameCount,
    }
  })
}

/**
 * Build a frame-URL resolver for a scene. `index` is scene-local (0-based):
 * the returned URL points at `startFrame + index` inside `folder`, whose file
 * names carry both the 1-based frame number and its original timestamp.
 */
export function frameUrlFor(
  folder: string,
  startFrame: number
): (index: number) => string {
  return (index: number) => {
    const number = startFrame + index
    const seconds =
      folder === MOBILE_FRAMES_FOLDER
        ? MOBILE_LAST_FRAME_SECONDS[number] ??
          ((number - 1) * 0.1).toFixed(2)
        : ((number - 1) * 0.1).toFixed(2)
    return `/${folder}/frame-${String(number).padStart(4, "0")}-${seconds}s.webp`
  }
}
