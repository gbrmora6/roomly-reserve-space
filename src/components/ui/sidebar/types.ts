
import * as React from "react"
import { VariantProps } from "class-variance-authority"
import { sidebarMenuButtonVariants } from "./sidebar-menu-button"

export type SidebarState = "expanded" | "collapsed"
export type SidebarCollapsible = "offcanvas" | "icon" | "none"
export type SidebarVariant = "sidebar" | "floating" | "inset"
export type SidebarSide = "left" | "right"

export type SidebarContext = {
  state: SidebarState
  open: boolean
  setOpen: (open: boolean) => void
  openMobile: boolean
  setOpenMobile: (open: boolean) => void
  isMobile: boolean
  toggleSidebar: () => void
}

export type TooltipContentProps = React.ComponentProps<"div"> & {
  children?: React.ReactNode
  side?: "top" | "right" | "bottom" | "left"
  align?: "start" | "center" | "end"
  sideOffset?: number
  alignOffset?: number
  hidden?: boolean
}

export type SidebarMenuButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  asChild?: boolean
  isActive?: boolean
  tooltip?: string | TooltipContentProps
} & VariantProps<typeof sidebarMenuButtonVariants>
