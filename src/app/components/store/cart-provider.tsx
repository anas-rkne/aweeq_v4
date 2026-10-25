"use client"

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react"
import { useLocale } from "next-intl"
import {
  addCartItem,
  cartErrorMessage,
  createCart,
  fetchCart,
  forgetCartId,
  readStoredCartId,
  removeCartItem,
  storeCartId,
  updateCartItem,
} from "@/lib/cart"
import { MedusaApiError } from "@/lib/medusa-fetch"
import type { Cart, CartResponse } from "@/types"

type CartStatus = "loading" | "ready" | "error"

interface CartContextValue {
  cart: Cart | null
  status: CartStatus
  error: string | null
  actionError: string | null
  isOpen: boolean
  isAdding: boolean
  pendingItemId: string | null
  itemCount: number
  currencyCode: string
  openCart: () => void
  closeCart: () => void
  clearActionError: () => void
  refreshCart: () => Promise<void>
  addItem: (variantId: string, quantity?: number) => Promise<void>
  updateItem: (itemId: string, quantity: number) => Promise<void>
  removeItem: (itemId: string) => Promise<void>
}

const CartContext = createContext<CartContextValue | null>(null)

function isMissingCartError(error: unknown) {
  if (error instanceof MedusaApiError) {
    if (error.status === 404) {
      return true
    }

    return (
      /cart not found/i.test(error.message) ||
      /cart has already been completed/i.test(error.message)
    )
  }

  return false
}

export function CartProvider({ children }: { children: ReactNode }) {
  const locale = useLocale()
  const storeLocale = locale === "en" ? "en" : "ar"
  const [cart, setCart] = useState<Cart | null>(null)
  const [status, setStatus] = useState<CartStatus>("loading")
  const [error, setError] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [isOpen, setIsOpen] = useState(false)
  const [isAdding, setIsAdding] = useState(false)
  const [pendingItemId, setPendingItemId] = useState<string | null>(null)
  const createPromiseRef = useRef<Promise<Cart> | null>(null)

  const applyCart = useCallback((response: CartResponse) => {
    setCart(response.cart)

    if (response.cart) {
      storeCartId(response.cart.id)
    } else {
      forgetCartId()
    }
  }, [])

  const resolveCart = useCallback(async () => {
    const storedId = readStoredCartId()
    let response = await fetchCart(storedId, storeLocale)

    if (!response.cart && storedId) {
      response = await fetchCart(null, storeLocale)
    }

    return response
  }, [storeLocale])

  const applyLoadedCart = useCallback(
    (response: CartResponse) => {
      applyCart(response)
      setStatus("ready")
      setError(null)
    },
    [applyCart]
  )

  const applyLoadError = useCallback((loadError: unknown) => {
    setStatus("error")
    setError(cartErrorMessage(loadError))
  }, [])

  const loadCart = useCallback(async () => {
    try {
      applyLoadedCart(await resolveCart())
    } catch (loadError) {
      applyLoadError(loadError)
    }
  }, [applyLoadError, applyLoadedCart, resolveCart])

  useEffect(() => {
    let active = true

    resolveCart()
      .then((response) => {
        if (active) {
          applyLoadedCart(response)
        }
      })
      .catch((loadError: unknown) => {
        if (active) {
          applyLoadError(loadError)
        }
      })

    return () => {
      active = false
    }
  }, [applyLoadError, applyLoadedCart, resolveCart])

  const ensureCart = useCallback(async () => {
    if (cart) {
      return cart
    }

    if (createPromiseRef.current) {
      return createPromiseRef.current
    }

    const promise = createCart(readStoredCartId(), storeLocale).then(
      (response) => {
        if (!response.cart) {
          throw new Error("Cart creation returned no cart")
        }

        applyCart(response)
        setStatus("ready")
        setError(null)
        return response.cart
      }
    )

    createPromiseRef.current = promise

    try {
      return await promise
    } finally {
      createPromiseRef.current = null
    }
  }, [applyCart, cart, storeLocale])

  const addItem = useCallback(
    async (variantId: string, quantity = 1) => {
      setIsAdding(true)
      setActionError(null)

      try {
        let activeCart = await ensureCart()
        let response: CartResponse

        try {
          response = await addCartItem(
            activeCart.id,
            variantId,
            quantity,
            storeLocale
          )
        } catch (addError) {
          if (!isMissingCartError(addError)) {
            throw addError
          }

          forgetCartId()
          setCart(null)
          activeCart = await createCart(null, storeLocale).then((created) => {
            if (!created.cart) {
              throw new Error("Cart creation returned no cart")
            }

            applyCart(created)
            return created.cart
          })
          response = await addCartItem(
            activeCart.id,
            variantId,
            quantity,
            storeLocale
          )
        }

        applyCart(response)
        setIsOpen(true)
      } catch (addError) {
        const message = cartErrorMessage(addError)
        setActionError(message)
        throw new Error(message)
      } finally {
        setIsAdding(false)
      }
    },
    [applyCart, ensureCart, storeLocale]
  )

  const updateItem = useCallback(
    async (itemId: string, quantity: number) => {
      if (!cart) {
        return
      }

      setPendingItemId(itemId)
      setActionError(null)

      try {
        const response =
          quantity <= 0
            ? await removeCartItem(cart.id, itemId, storeLocale)
            : await updateCartItem(cart.id, itemId, quantity, storeLocale)

        applyCart(response)
      } catch (updateError) {
        const message = cartErrorMessage(updateError)
        setActionError(message)
        throw new Error(message)
      } finally {
        setPendingItemId(null)
      }
    },
    [applyCart, cart, storeLocale]
  )

  const removeItem = useCallback(
    async (itemId: string) => {
      if (!cart) {
        return
      }

      setPendingItemId(itemId)
      setActionError(null)

      try {
        const response = await removeCartItem(cart.id, itemId, storeLocale)
        applyCart(response)
      } catch (removeError) {
        const message = cartErrorMessage(removeError)
        setActionError(message)
        throw new Error(message)
      } finally {
        setPendingItemId(null)
      }
    },
    [applyCart, cart, storeLocale]
  )

  const openCart = useCallback(() => {
    setActionError(null)
    setIsOpen(true)
  }, [])

  const closeCart = useCallback(() => {
    setIsOpen(false)
  }, [])

  const clearActionError = useCallback(() => {
    setActionError(null)
  }, [])

  const itemCount = useMemo(() => {
    if (!cart) {
      return 0
    }

    return (
      cart.item_count ??
      cart.items.reduce((total, item) => total + Number(item.quantity), 0)
    )
  }, [cart])

  const value = useMemo<CartContextValue>(
    () => ({
      cart,
      status,
      error,
      actionError,
      isOpen,
      isAdding,
      pendingItemId,
      itemCount,
      currencyCode: cart?.currency_code ?? "aed",
      openCart,
      closeCart,
      clearActionError,
      refreshCart: loadCart,
      addItem,
      updateItem,
      removeItem,
    }),
    [
      actionError,
      addItem,
      cart,
      clearActionError,
      closeCart,
      error,
      isAdding,
      isOpen,
      itemCount,
      loadCart,
      openCart,
      pendingItemId,
      removeItem,
      status,
      updateItem,
    ]
  )

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

export function useCart() {
  const context = useContext(CartContext)

  if (!context) {
    return {
      cart: null,
      status: "ready" as const,
      error: null,
      actionError: null,
      isOpen: false,
      isAdding: false,
      pendingItemId: null,
      itemCount: 0,
      currencyCode: "aed",
      openCart: () => {},
      closeCart: () => {},
      clearActionError: () => {},
      refreshCart: async () => {},
      addItem: async () => {},
      updateItem: async () => {},
      removeItem: async () => {},
    }
  }

  return context
}
