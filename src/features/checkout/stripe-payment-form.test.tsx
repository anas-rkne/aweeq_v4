// @vitest-environment jsdom
import { describe, expect, test, vi, beforeEach } from "vitest"
import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import type { ReactNode } from "react"
import type { Stripe } from "@stripe/stripe-js"
import { StripePaymentForm } from "./stripe-payment-form"

const stripeMock = vi.hoisted(() => ({
  confirm: vi.fn(),
}))

vi.mock("@stripe/react-stripe-js/checkout", () => ({
  CheckoutElementsProvider: ({ children }: { children: ReactNode }) => children,
  ExpressCheckoutElement: () => null,
  PaymentElement: ({
    onChange,
  }: {
    onChange?: (event: { complete: boolean }) => void
  }) => (
    <button type="button" onClick={() => onChange?.({ complete: true })}>
      fill-card
    </button>
  ),
  useCheckoutElements: () => ({
    type: "success",
    checkout: {
      id: "cs_test_session",
      confirm: stripeMock.confirm,
    },
  }),
}))

function renderForm(
  overrides: Partial<Parameters<typeof StripePaymentForm>[0]> = {}
) {
  const onSuccess = vi.fn()
  const onError = vi.fn()
  const onBack = vi.fn()

  render(
    <StripePaymentForm
      stripe={Promise.resolve({} as Stripe)}
      clientSecret="cs_test_secret"
      payLabel="ادفع الآن"
      processingLabel="جارٍ المعالجة..."
      backLabel="رجوع"
      onBack={onBack}
      onError={onError}
      onSuccess={onSuccess}
      {...overrides}
    />
  )

  return { onSuccess, onError, onBack }
}

describe("StripePaymentForm", () => {
  beforeEach(() => {
    stripeMock.confirm.mockReset()
  })

  test("confirms the payment in-page and hands back the session id", async () => {
    stripeMock.confirm.mockResolvedValue({
      type: "success",
      session: { id: "cs_test_session" },
    })
    const { onSuccess } = renderForm()

    fireEvent.click(screen.getByText("fill-card"))

    const pay = screen.getByRole("button", { name: "ادفع الآن" })
    await waitFor(() => expect(pay).toBeEnabled())

    fireEvent.click(pay)

    await waitFor(() =>
      expect(onSuccess).toHaveBeenCalledWith("cs_test_session")
    )
    expect(stripeMock.confirm).toHaveBeenCalledWith({
      redirect: "if_required",
    })
  })

  test("shows Stripe's decline message instead of a silent failure", async () => {
    stripeMock.confirm.mockResolvedValue({
      type: "error",
      error: { message: "Your card was declined." },
    })
    const { onError, onSuccess } = renderForm()

    fireEvent.click(screen.getByText("fill-card"))
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "ادفع الآن" })).toBeEnabled()
    )
    fireEvent.click(screen.getByRole("button", { name: "ادفع الآن" }))

    expect(await screen.findByText("Your card was declined.")).toBeTruthy()
    expect(onError).toHaveBeenCalledWith("Your card was declined.")
    expect(onSuccess).not.toHaveBeenCalled()
  })

  test("keeps the pay button disabled until the payment element is complete", () => {
    renderForm()

    expect(screen.getByRole("button", { name: "ادفع الآن" })).toBeDisabled()
  })
})
