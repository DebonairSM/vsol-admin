<!-- 798dede8-ad12-4e6b-af9d-7487c41abb2f 963777a8-e2f3-436d-8c67-0017095b7631 -->
# Auto-Select Bonus Recipient from Line Items

## Problem

The bonus workflow requires manual selection of the bonus recipient, but this should be automatically determined from consultant line items that have bonus fields set (bonusDate, informedDate, bonusPaydate).

## Solution

Add auto-detection logic at multiple points to ensure the bonus recipient is automatically set when line item data indicates which consultant should receive the bonus.

## Implementation Steps

### 1. Add helper method to find consultant with bonus fields

**File:** `apps/api/src/services/bonus-workflow-service.ts`

Create a private static method `findConsultantWithBonusFields(cycleId: number)` that:

- Queries all line items for the cycle
- Returns the first consultantId found that has any of: bonusDate, informedDate, or bonusPaydate set
- Returns null if no consultant has bonus fields
```typescript
private static async findConsultantWithBonusFields(cycleId: number): Promise<number | null> {
  const lineItems = await db.query.cycleLineItems.findMany({
    where: eq(cycleLineItems.cycleId, cycleId)
  });
  
  const consultantWithBonus = lineItems.find(item => 
    item.bonusDate || item.informedDate || item.bonusPaydate
  );
  
  return consultantWithBonus?.consultantId || null;
}
```


### 2. Auto-detect recipient in getByCycleId

**File:** `apps/api/src/services/bonus-workflow-service.ts`

Modify `getByCycleId` to auto-set recipient if workflow exists but no recipient is set:

- After fetching workflow, if it exists but `bonusRecipientConsultantId` is null
- Call `findConsultantWithBonusFields` to detect consultant
- If found, update workflow and return updated version
- Otherwise return workflow as-is

### 3. Auto-detect recipient in createForCycle

**File:** `apps/api/src/services/bonus-workflow-service.ts`

Modify `createForCycle` to:

- Before creating workflow, call `findConsultantWithBonusFields`
- Pass the detected consultantId (if any) when inserting the workflow
- This auto-populates recipient on creation if line items already have bonus data

### 4. Auto-detect recipient when updating line item with bonus fields

**File:** `apps/api/src/services/line-item-service.ts`

Modify `update` method in `LineItemService`:

- After successfully updating line item with bonus fields
- Check if there's a bonus workflow for the cycle
- If workflow exists but `bonusRecipientConsultantId` is null
- Set the recipient to the consultant whose line item was just updated
- Use BonusWorkflowService method (may need to add a helper or import the service)

### 5. Auto-detect recipient in generateEmailContent

**File:** `apps/api/src/services/bonus-workflow-service.ts`

Modify `generateEmailContent` to:

- After getting workflow, if no recipient is set
- Try to auto-detect using `findConsultantWithBonusFields`
- If found, update workflow and reload before proceeding
- Only throw error if still no recipient after auto-detection

## Edge Cases

- Multiple consultants with bonus fields: Use first one found (line items query order)
- No consultant with bonus fields: Leave recipient null (manual selection still required)
- Workflow exists but recipient already set: Don't override (preserve manual selection)
- Line item update clearing bonus fields: Don't clear workflow recipient (one-way sync)

## Testing Considerations

- Test workflow creation when line items already have bonus fields
- Test workflow retrieval when recipient not set but line items have bonus data
- Test line item update with bonus fields triggers recipient auto-selection
- Test email generation after auto-selection
- Verify manual selection is not overridden once set