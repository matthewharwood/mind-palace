// @mind-palace/ui — a portable, Tailwind-token shadcn-style component library.
// Built to this repo's spirit (Storybook-first; theme via @mind-palace/ui/theme)
// but is the sanctioned Pillar-2 carve-out: these vendored primitives use
// idiomatic typed props (cva + Radix), not per-component Zod schemas.

export {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "./components/accordion";
export { Alert, AlertDescription, type AlertProps, AlertTitle } from "./components/alert";
export {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogOverlay,
  AlertDialogPortal,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "./components/alert-dialog";
export { alertVariants } from "./components/alert-variants";
export { AspectRatio } from "./components/aspect-ratio";
export { Avatar, AvatarFallback, AvatarImage } from "./components/avatar";
export { Badge, type BadgeProps } from "./components/badge";
export { badgeVariants } from "./components/badge-variants";
export {
  Breadcrumb,
  BreadcrumbEllipsis,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "./components/breadcrumb";
export { Button, type ButtonProps } from "./components/button";
export { buttonVariants } from "./components/button-variants";
export {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "./components/card";
export { Checkbox } from "./components/checkbox";
export {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "./components/collapsible";
export {
  ContextMenu,
  ContextMenuCheckboxItem,
  ContextMenuContent,
  ContextMenuGroup,
  ContextMenuItem,
  ContextMenuLabel,
  ContextMenuPortal,
  ContextMenuRadioGroup,
  ContextMenuRadioItem,
  ContextMenuSeparator,
  ContextMenuShortcut,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger,
} from "./components/context-menu";
export {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
} from "./components/dialog";
export {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuPortal,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "./components/dropdown-menu";
export {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "./components/hover-card";
export { Input } from "./components/input";
export { Label } from "./components/label";
export {
  Menubar,
  MenubarCheckboxItem,
  MenubarContent,
  MenubarGroup,
  MenubarItem,
  MenubarLabel,
  MenubarMenu,
  MenubarPortal,
  MenubarRadioGroup,
  MenubarRadioItem,
  MenubarSeparator,
  MenubarShortcut,
  MenubarSub,
  MenubarSubContent,
  MenubarSubTrigger,
  MenubarTrigger,
} from "./components/menubar";
export {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  type PaginationLinkProps,
  PaginationNext,
  PaginationPrevious,
} from "./components/pagination";
export {
  Popover,
  PopoverAnchor,
  PopoverContent,
  PopoverTrigger,
} from "./components/popover";
export { Progress } from "./components/progress";
export { RadioGroup, RadioGroupItem } from "./components/radio-group";
export { ScrollArea, ScrollBar } from "./components/scroll-area";
export {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectScrollDownButton,
  SelectScrollUpButton,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "./components/select";
export { Separator } from "./components/separator";
export {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "./components/sheet";
export { sheetVariants } from "./components/sheet-variants";
export { Skeleton } from "./components/skeleton";
export { Slider } from "./components/slider";
export { Switch } from "./components/switch";
export {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "./components/table";
export { Tabs, TabsContent, TabsList, TabsTrigger } from "./components/tabs";
export { Textarea } from "./components/textarea";
export { ThemeToggle, type ThemeToggleProps } from "./components/theme-toggle";
export { Toggle, type ToggleProps } from "./components/toggle";
export { ToggleGroup, ToggleGroupItem } from "./components/toggle-group";
export { toggleVariants } from "./components/toggle-variants";
export {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./components/tooltip";
export { cn } from "./lib/utils";
