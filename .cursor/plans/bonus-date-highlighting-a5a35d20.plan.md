<!-- a5a35d20-8220-49f6-9865-8e23fa9e9589 e1a446ca-6984-4e1a-ae9d-3b63db72c21a -->
# Add Workflow Tracking to Payroll Cycles

## Implementation Tasks

### 1. Create Workflow Tracking Component

Create `WorkflowTracker` component in `apps/web/src/components/` that:

- Displays all 7 workflow steps in chronological order
- Shows completion status (completed/pending) with visual indicators
- Allows clicking to set/update date for each workflow step
- Uses intuitive icons and progress indicators
- Shows step descriptions and current dates

### 2. Define Workflow Steps Structure

Create workflow configuration in `apps/web/src/lib/` that maps:

- Step names and descriptions
- Database field mappings (calculatedPaymentDate, paymentArrivalDate, etc.)
- Step icons and colors
- Chronological ordering
- Step completion logic

### 3. Extend Golden Sheet Layout

Modify `apps/web/src/routes/golden-sheet.tsx` to:

- Add WorkflowTracker component above the line items table
- Maintain existing functionality (line items, totals, adjustments)
- Use existing `updateCycle` mutation for workflow date updates
- Responsive layout that works on different screen sizes

### 4. Enhance Cycle Update Functionality

Update cycle editing to support:

- Individual workflow date field updates
- Validation of date logical sequence (optional)
- Optimistic updates in UI
- Error handling for date update failures

### 5. Add Progress Visualization

Implement visual progress tracking:

- Progress bar showing overall cycle completion percentage
- Step-by-step status indicators (checkmarks, pending icons)
- Color coding (green=complete, gray=pending, blue=in-progress)
- Workflow completion badges/status

### 6. Workflow Step Details

For each workflow step, display:

- **Step 1**: Calculate Payment (calculatedPaymentDate) - "Calculate amounts and prepare payment data"
- **Step 2**: Payment Arrival (paymentArrivalDate) - "Funds arrived in Payoneer account"  
- **Step 3**: Send Invoice (sendInvoiceDate) - "Invoices sent to clients via Wave Apps"
- **Step 4**: Invoice Approval (invoiceApprovalDate) - "Client invoices approved and processed"
- **Step 5**: Additional Paid (additionalPaidOn) - "Any additional payments processed"
- **Step 6**: Hours Limit Changed (hoursLimitChangedOn) - "Time Doctor limits updated"
- **Step 7**: Send Receipt (sendReceiptDate) - "Final receipts sent - cycle complete"

### To-dos

- [ ] Create utility function to compare dates for highlighting logic
- [ ] Modify bonus date cell rendering to show highlighting when dates match cycle sendReceiptDate
- [ ] Add CSS classes for background highlighting that maintains readability
- [ ] Test highlighting behavior with various date scenarios