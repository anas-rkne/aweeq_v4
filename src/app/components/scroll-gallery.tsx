"use client"

import { useEffect, useRef, type CSSProperties } from "react"

/**
 * ScrollGallery — the boutique's four rooms, tilting in space as they pass.
 *
 * A faithful port of the "Scrolling Image Effects" layout (DivineBlow,
 * codepen.io/DivineBlow/pen/JjEZGme): an editorial grid of blocks, each an
 * image beside a large overlapping title and a small description. As the page
 * scrolls, each image rotates in 3D (`rotate3d`) and its content slides a
 * little inside its frame. The page's own Lenis drives the scroll, so this
 * only reads `window.scrollY` and paints each visible item.
 */

export type GalleryItem = {
  image: string
  title: string
  description: string
}

const OVERFLOW = 40
const ASPECT = "1376/768"

const map = (x: number, a: number, b: number, c: number, d: number) =>
  (x - a) * (d - c) / (b - a) + c
const lerp = (a: number, b: number, n: number) => (1 - n) * a + n * b

export function ScrollGallery({
  title,
  description,
  items,
}: {
  title: string
  description: string
  items: GalleryItem[]
}) {
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const root = rootRef.current
    if (!root) return

    const elements = Array.from(
      root.querySelectorAll<HTMLElement>("[data-item]")
    )

    const state = elements.map((el) => {
      const image = el.querySelector<HTMLElement>("[data-img]")
      const wrapper = el.querySelector<HTMLElement>("[data-imgwrap]")
      const titleEl = el.querySelector<HTMLElement>("[data-title]")

      el.style.perspective = "1000px"
      if (wrapper) wrapper.style.transformOrigin = "50% 100%"
      if (titleEl) titleEl.style.transform = "translate3d(0,0,200px)"

      return {
        el,
        image,
        wrapper,
        ry: Math.random() * 1 - 0.5,
        rz: Math.random() * 1 - 0.5,
        toValue: -(50 + Math.random() * 20),
        height: 0,
        top: 0,
        innerY: 0,
        rotation: 0,
        visible: false,
      }
    })

    const getSize = () => {
      state.forEach((s) => {
        const rect = s.el.getBoundingClientRect()
        s.height = rect.height
        s.top = window.scrollY + rect.top
      })
    }
    getSize()

    let raf = 0
    const render = () => {
      state.forEach((s) => {
        if (!s.visible) return
        const y = map(
          s.top - window.scrollY,
          window.innerHeight,
          -s.height,
          -OVERFLOW,
          OVERFLOW
        )
        s.innerY = lerp(
          s.innerY,
          Math.max(Math.min(y, OVERFLOW), -OVERFLOW),
          0.1
        )

        const rot = map(
          s.top - window.scrollY,
          window.innerHeight * 1.5,
          -s.height,
          s.toValue,
          -s.toValue
        )
        s.rotation = lerp(
          s.rotation,
          Math.min(Math.max(rot, s.toValue), -s.toValue),
          0.1
        )

        if (s.image) {
          s.image.style.transform = `translate3d(0, ${s.innerY}px, 0)`
        }
        if (s.wrapper) {
          s.wrapper.style.transform = `rotate3d(1, ${s.ry}, ${s.rz}, ${s.rotation}deg)`
        }
      })
      raf = requestAnimationFrame(render)
    }
    raf = requestAnimationFrame(render)

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const s = state.find((x) => x.el === entry.target)
          if (s) s.visible = entry.intersectionRatio > 0
        })
      },
      { rootMargin: "160px" }
    )
    state.forEach((s) => observer.observe(s.el))

    const onResize = () => getSize()
    const ro = new ResizeObserver(onResize)
    ro.observe(root)
    window.addEventListener("resize", onResize)
    void document.fonts?.ready.then(onResize)

    return () => {
      cancelAnimationFrame(raf)
      observer.disconnect()
      ro.disconnect()
      window.removeEventListener("resize", onResize)
    }
  }, [items])

  return (
    <div ref={rootRef} data-boutique>
      <div className="page">
        <div className="page__head">
          <h2 className="page__title">{title}</h2>
          <p className="page__description">{description}</p>
        </div>

        <div className="content content--alternate content--padded">
          {items.map((item) => (
            <div
              key={item.title}
              data-item
              className="content__item content__item--expand"
              style={{ "--aspect-ratio": ASPECT } as CSSProperties}
            >
              <div data-imgwrap className="content__item-imgwrap">
                <div
                  data-img
                  className="content__item-img"
                  style={{ backgroundImage: `url(${item.image})` }}
                />
              </div>
              <h3 data-title className="content__item-title">
                {item.title}
              </h3>
              <p className="content__item-description">{item.description}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default ScrollGallery
