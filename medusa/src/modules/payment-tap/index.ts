import { ModuleProvider, Modules } from "@medusajs/framework/utils"
import TapPaymentProviderService from "./service"

export default ModuleProvider(Modules.PAYMENT, {
  services: [TapPaymentProviderService],
})
