/**
 * GPRO Logistic - Design System Components
 * Exportación centralizada de componentes UI
 */

// Data Display
export { default as DataTable } from "./DataTable";
export { default as EmptyState } from "./EmptyState";

// Feedback
export { default as Modal, ModalFooter } from "./Modal";
export { default as ConfirmDialog } from "./ConfirmDialog";
export { default as Spinner, LoadingState, LoadingOverlay } from "./Spinner";
export {
    Skeleton,
    SkeletonTable,
    SkeletonCard,
    SkeletonForm,
} from "./Skeleton";

// Badges
export { Badge, StatusBadge, badgeVariants } from "./Badge";

// Buttons
export { Button, buttonVariants } from "./Button";

// Cards
export {
    Card,
    CardHeader,
    CardTitle,
    CardDescription,
    CardContent,
    CardFooter,
    StatCard,
    MetricCard,
} from "./Card";

// Form Controls
export { default as Select } from "./Select";
export { default as SelectERP } from "./SelectERP";
export { Input, Textarea, FormField } from "./Input";
export { Label } from "./Label";
export { FileUpload } from "./FileUpload";

// Navigation & Menus
export {
    DropdownMenu,
    DropdownMenuTrigger,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
} from "./DropdownMenu";
export { Tabs, TabsList, TabsTrigger, TabsContent } from "./Tabs";

// Dialog
export {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
    DialogClose,
} from "./Dialog";
