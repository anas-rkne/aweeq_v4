export interface CivilizationScene {
  id: string
  folder: string
  frameCount: number
  label: string
  title: string
  body: string
  bodyEn: string
}

export const CIVILIZATION_SCENES: CivilizationScene[] = [
  {
    id: "gulf",
    folder: "0_frame",
    frameCount: 41,
    label: "THE GULF · الخليج",
    title: "The Golden Coast",
    body: "من شواطئ الخليج العربي، حيث يلتقي عبق اللبان والبخور بسحر اللآلئ، تبدأ حكاية 3WEEQ في استنطاق أصالة التراث بروح عصرية فاخرة.",
    bodyEn:
      "From the shores of the Arabian Gulf, where frankincense and pearls intertwine, 3WEEQ begins its tale of heritage with modern luxury.",
  },
  {
    id: "babylon",
    folder: "babel_frames",
    frameCount: 41,
    label: "BABYLON · بابل",
    title: "The Lamassu",
    body: "من بوابة عشتار، حيث تُروى الحكايات بالنقوش المسمارية. من بابل، مهد الحضارات، نستلهم عطوراً تحمل عبق التاريخ وتُخلّد أسراراً منذ آلاف السنين.",
    bodyEn:
      "From the Ishtar Gate, where stories are told through cuneiform. From Babylon, the cradle of civilizations, we draw fragrances carrying the scent of history.",
  },
  {
    id: "egypt",
    folder: "egypt_frames",
    frameCount: 41,
    label: "EGYPT · مصر",
    title: "The Sphinx",
    body: "أبو الهول، الحارس الصامت لوادي الملوك. من مصر، حيث يلتقي الذهب بالأسرار الخالدة، نصنع عطوراً ملكية تُجسد فخامة الفراعنة وخلود النيل.",
    bodyEn:
      "The Sphinx, the silent guardian of the Valley of the Kings. From Egypt, where gold meets eternal secrets, we craft royal fragrances embodying Pharaonic luxury.",
  },
  {
    id: "greece",
    folder: "greese_frames",
    frameCount: 41,
    label: "GREECE · اليونان",
    title: "Marble Memory",
    body: "من رخام أثينا وأساطير الأولمب، حيث تُنسج الحكايات عن الآلهة والأبطال. نقدم لكم عطوراً كلاسيكية تجمع بين الأناقة الإغريقية والحداثة الخالدة.",
    bodyEn:
      "From the marble of Athens and the myths of Olympus, where tales of gods and heroes are woven. We present classic fragrances blending Greek elegance with timeless modernity.",
  },
  {
    id: "china",
    folder: "china_frames",
    frameCount: 41,
    label: "CHINA · الصين",
    title: "Silk & Stone",
    body: "من سور الصين العظيم، وحرير الإمبراطوريات، حيث تلتقي القوة بالرقي. نقدم عطوراً آسرة تجسد حكمة الشرق وتفاصيل الحضارة الصينية العريقة.",
    bodyEn:
      "From the Great Wall of China and the silk of empires, where power meets elegance. We present captivating fragrances embodying the wisdom of the East.",
  },
]
