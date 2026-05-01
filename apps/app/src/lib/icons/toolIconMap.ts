// Per-tool icon map for chat tool-call display.
// Used by ToolCallDisplay (generic fallback) and ToolResultRenderer
// when a richer per-tool icon is desired over Settings01.
//
// Tool names mirror those in apps/app/src/components/chat/tool-results/types.ts
// (ToolName = ReadToolName | ProposeToolName | ExecuteToolName). The
// `Partial<Record<ToolName, ToolIcon>>` type makes mapping holes explicit at
// compile time — `getToolIcon` falls back to Settings01 for any unmapped name.
import {
    ActivityHeart,
    BarChart01,
    Bell01,
    ClockFastForward,
    CreditCard02,
    Edit05,
    File05,
    Receipt,
    RefreshCcw01,
    ReverseLeft,
    SearchSm,
    Send01,
    Settings01,
    SlashCircle01,
    Tag01,
    Trash01,
} from "@untitledui/icons";
import type { ComponentType, SVGProps } from "react";
import type { ToolName } from "@/components/chat/tool-results/types";

export type ToolIcon = ComponentType<SVGProps<SVGSVGElement>>;

export const toolIconMap: Partial<Record<ToolName, ToolIcon>> = {
    // Read tools
    list_credit_cards: CreditCard02,
    get_credit_card_detail: CreditCard02,
    list_accounts: File05,
    get_account_detail: File05,
    list_transactions: Receipt,
    get_transaction_detail: Receipt,
    get_spend_by_category: BarChart01,
    get_spend_over_time: BarChart01,
    get_upcoming_statements: ClockFastForward,
    list_reminders: Bell01,
    list_deferred_interest_promos: Tag01,
    list_installment_plans: Tag01,
    search_merchants: SearchSm,
    get_plaid_health: ActivityHeart,
    get_proposal: Edit05,
    // Propose tools
    propose_transaction_update: Edit05,
    propose_bulk_transaction_update: Edit05,
    propose_credit_card_metadata_update: Edit05,
    propose_manual_promo: Tag01,
    propose_reminder_create: Bell01,
    propose_reminder_delete: Trash01,
    // Execute tools
    execute_confirmed_proposal: Send01,
    cancel_proposal: SlashCircle01,
    undo_mutation: ReverseLeft,
    trigger_plaid_resync: RefreshCcw01,
};

export function getToolIcon(toolName: string): ToolIcon {
    return toolIconMap[toolName as ToolName] ?? Settings01;
}
