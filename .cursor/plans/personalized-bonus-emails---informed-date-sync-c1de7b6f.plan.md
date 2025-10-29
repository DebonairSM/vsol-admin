<!-- c1de7b6f-e0ab-4d10-8c40-59b54859dca0 01eace88-eaf7-4fd3-b0aa-47890937f4cd -->
# Personalized Bonus Emails & Informed Date Sync

## Status: OBSOLETE

This plan is **outdated** and has been superseded by the **Omnigo Bonus Workflow** implementation.

## What Changed

The original plan assumed:
- Multiple consultants could receive bonuses in a single cycle
- An array of personalized emails (one per consultant)
- Multiple email cards in the UI

The **actual implementation** uses:
- **Single consultant selection** per cycle (bonusRecipientConsultantId)
- **One personalized email** for the selected consultant
- **Automatic advance deduction** calculation (netBonus = omnigoBonus - advanceAmount)
- **Single textarea** for email content in the UI

## Current Implementation

### Architecture Decision
The Omnigo bonus is a **single payment** from the Omnigo client to **one consultant** per cycle. This matches the business requirement.

### Key Features Implemented
1. **Consultant Selection**: Dropdown to select which consultant receives the bonus
2. **Advance Deduction**: Automatically calculates net bonus when consultant has bonusAdvance
3. **Personalized Email**: Uses consultant name and shows net vs gross amounts
4. **Validation**: Requires consultant selection and omnigoBonus configuration before generating email

### Files Modified
- `apps/api/src/services/bonus-workflow-service.ts` - Single consultant email generation
- `apps/api/src/db/schema.ts` - Added bonusRecipientConsultantId field
- `apps/web/src/components/bonus-workflow-section.tsx` - Consultant selection UI
- `packages/shared/src/types.ts` - Updated BonusWorkflow interface

## Not Implemented

The following features from the original plan were **not implemented**:
- ❌ Automatic informedDate sync on line items (not needed for current workflow)
- ❌ Multiple consultants per cycle (single consultant per cycle)
- ❌ Array of personalized emails (single email per consultant)
- ❌ Multiple email cards in UI (single textarea)

## Reference

See `omnigo-bonus-workflow-testing-complete.plan.md` for the full implementation details.