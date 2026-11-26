"use client"

import Script from "next/script"
import { usePathname } from "next/navigation"
import { useEffect, useRef } from "react"
import {
  captureFbclid,
  flushMetaQueue,
  metaPixelId,
  trackPageView,
} from "@/shared/lib/meta-pixel"

/**
 * The Meta base pixel, mounted once in the locale layout.
 *
 * The standard snippet fires PageView for the first page. Next.js keeps the
 * document alive between routes, so `PageViewTracker` fires it again on every
 * client-side navigation (skipping the first render, which the snippet owns).
 */

function pixelSnippet(id: string) {
  return `!function(f,b,e,v,n,t,s)
{if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};
if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];
s.parentNode.insertBefore(t,s)}(window,document,'script',
'https://connect.facebook.net/en_US/fbevents.js');
fbq('init', '${id}');
fbq('track', 'PageView');`
}

export function MetaPixel() {
  const pixelId = metaPixelId()

  /* `afterInteractive` may land after a page-level effect has already queued
     an event (ViewContent / InitiateCheckout). Poll briefly until `fbq`
     exists, then flush the queue once. `onLoad` also flushes; both are
     idempotent because flushing drains the queue. */
  useEffect(() => {
    if (!pixelId) return

    /* Keep the click id even when an ad-blocker stops fbevents.js: the
       server-side Purchase still needs `_fbc` to attribute the sale. */
    captureFbclid()

    if (typeof window.fbq === "function") {
      flushMetaQueue()
      return
    }

    let attempts = 0
    const timer = window.setInterval(() => {
      attempts += 1

      if (typeof window.fbq === "function") {
        flushMetaQueue()
        window.clearInterval(timer)
        return
      }

      if (attempts >= 100) {
        window.clearInterval(timer)
      }
    }, 100)

    return () => window.clearInterval(timer)
  }, [pixelId])

  if (!pixelId) {
    return null
  }

  return (
    <>
      <Script
        id="meta-pixel"
        strategy="afterInteractive"
        onLoad={flushMetaQueue}
        dangerouslySetInnerHTML={{ __html: pixelSnippet(pixelId) }}
      />
      <noscript>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          height="1"
          width="1"
          style={{ display: "none" }}
          alt=""
          src={`https://www.facebook.com/tr?id=${pixelId}&ev=PageView&noscript=1`}
        />
      </noscript>
      <PageViewTracker />
    </>
  )
}

function PageViewTracker() {
  const pathname = usePathname()
  const lastPath = useRef<string | null>(null)

  useEffect(() => {
    /* the base snippet already fired the first PageView */
    if (lastPath.current === null) {
      lastPath.current = pathname
      return
    }

    if (lastPath.current === pathname) {
      return
    }

    lastPath.current = pathname
    trackPageView()
  }, [pathname])

  return null
}
