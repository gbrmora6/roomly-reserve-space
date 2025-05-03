
// Main sidebar context and provider
import SidebarContext, { useSidebar } from "./sidebar-context"
import { SidebarProvider } from "./sidebar-provider"

// Base sidebar components
import { Sidebar } from "./sidebar-base"
import { SidebarTrigger } from "./sidebar-trigger"
import { SidebarRail } from "./sidebar-rail"
import { SidebarInset } from "./sidebar-inset"
import { SidebarInput } from "./sidebar-input"
import { SidebarSeparator } from "./sidebar-separator"

// Layout components
import { SidebarHeader, SidebarFooter, SidebarContent } from "./sidebar-layout"

// Group components
import { 
  SidebarGroup,
  SidebarGroupAction,
  SidebarGroupContent,
  SidebarGroupLabel 
} from "./sidebar-group"

// Menu components
import { SidebarMenu, SidebarMenuItem } from "./sidebar-menu"

// Button components
import { 
  SidebarMenuButton, 
  SidebarMenuAction, 
  SidebarMenuBadge,
  sidebarMenuButtonVariants
} from "./sidebar-menu-button"

// Submenu components
import { 
  SidebarMenuSkeleton,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem
} from "./sidebar-menu-extras"

export {
  Sidebar,
  SidebarContext,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupAction,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInput,
  SidebarInset,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSkeleton,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarProvider,
  SidebarRail,
  SidebarSeparator,
  SidebarTrigger,
  sidebarMenuButtonVariants,
  useSidebar,
}
