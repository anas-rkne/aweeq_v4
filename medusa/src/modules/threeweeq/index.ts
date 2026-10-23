import { Module } from "@medusajs/framework/utils"
import ThreeweeqModuleService from "./service"

export const THREEWEEQ_MODULE = "threeweeq"

export default Module(THREEWEEQ_MODULE, {
  service: ThreeweeqModuleService,
})
