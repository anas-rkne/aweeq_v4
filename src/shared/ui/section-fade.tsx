/**
 * The mist that joins two sections.
 *
 * Every section of the marketing page is laid on the same night — #0a1628 —
 * with a photograph or a film poured over it. Left alone, those photographs
 * meet each other at a hard horizontal line: sky against stone, film against
 * wall. `SectionFade` melts each edge of a section back into that night, so the
 * picture above dissolves into fog and the picture below rises out of it. The
 * two sections stop reading as two and start reading as one continuous room.
 *
 * Why two halves instead of one band across the seam: every section clips its
 * own overflow, so a band centred on the boundary would be clipped in half by
 * both of them. A `bottom` fog on the outgoing section and a `top` fog on the
 * incoming one meet at the boundary with the same colour and the same slope, so
 * the join itself is invisible — the fog simply continues.
 *
 * Why the stops are shaped the way they are: the ramp is smoothstep, sampled
 * nine times. Its opacity is flat at both ends (derivative zero), which is what
 * makes this read as fog rather than as a two-colour wash — neither the photo
 * side nor the seam side shows a line where the gradient starts or stops, and
 * the middle lingers so the transition feels slow rather than linear.
 */

type Edge = "top" | "bottom"

/** The brand night, in the channel order rgba() wants. */
const NIGHT = "10, 22, 40"

/** Where each stop sits, as a percentage of the fog's own height. */
const ANCHORS = [0, 4, 16, 32, 50, 68, 84, 96, 100]

/** smoothstep(3t² − 2t³) sampled at those anchors. */
const ALPHA = [0, 0.043, 0.156, 0.316, 0.5, 0.684, 0.844, 0.957, 1]

function fog(edge: Edge) {
  // The seam sits at the top of a `top` fog and at the bottom of a `bottom`
  // one, so the two are mirror images: same anchors, the densities reversed.
  // (Mirroring the density, not the list — the positions must stay ascending.)
  const alphas = edge === "top" ? [...ALPHA].reverse() : ALPHA

  const stops = alphas.map(
    (alpha, index) => `rgba(${NIGHT}, ${alpha}) ${ANCHORS[index]}%`
  )

  return `linear-gradient(to bottom, ${stops.join(", ")})`
}

export function SectionFade({
  edge = "bottom",
  zIndex = 12,
  className = "",
}: {
  /** Which edge of the section the fog is anchored to. */
  edge?: Edge
  /** Above the background, below the words. */
  zIndex?: number
  className?: string
}) {
  return (
    <div
      data-section-fade={edge}
      aria-hidden="true"
      className={`pointer-events-none absolute inset-x-0 ${
        edge === "top" ? "top-0" : "bottom-0"
      } h-20 md:h-28 ${className}`}
      style={{ zIndex, backgroundImage: fog(edge) }}
    />
  )
}
