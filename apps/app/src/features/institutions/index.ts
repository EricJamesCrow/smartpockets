/**
 * Institutions Feature Module
 *
 * Contains all components, hooks, and utilities for:
 * - Plaid Link integration
 * - Institution/bank connection management
 * - Disconnect functionality
 */

// Components
export { PlaidLinkButton } from "./components/plaid-link-button";
export { DisconnectBankModal } from "./components/disconnect-bank-modal";
export { InstitutionLogo } from "./components/institution-logo";

// Hooks
export { useTogglePlaidItem } from "./hooks/useTogglePlaidItem";
export { useDisconnectPlaidItem } from "./hooks/useDisconnectPlaidItem";
