import type { BonusEmailTemplate } from '@vsol-admin/shared';

export function generateBonusEmailTemplate(data: BonusEmailTemplate): string {
  const { monthLabel, consultantsWithBonuses, announcementDate } = data;
  
  const formattedDate = announcementDate.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const totalBonus = consultantsWithBonuses.reduce((sum, c) => sum + c.bonusAmount, 0);

  let emailContent = `Dear Consultants,\n\n`;
  emailContent += `We are pleased to announce your bonuses for ${monthLabel}.\n\n`;
  
  if (consultantsWithBonuses.length === 1) {
    const consultant = consultantsWithBonuses[0];
    emailContent += `Your bonus amount is $${consultant.bonusAmount.toFixed(2)}.\n\n`;
  } else {
    emailContent += `Bonus amounts:\n\n`;
    consultantsWithBonuses.forEach(({ name, bonusAmount }) => {
      emailContent += `${name}: $${bonusAmount.toFixed(2)}\n`;
    });
    emailContent += `\nTotal bonus amount: $${totalBonus.toFixed(2)}\n\n`;
  }

  emailContent += `These bonuses will be processed on ${formattedDate}.\n\n`;
  emailContent += `Thank you for your continued dedication and hard work.\n\n`;
  emailContent += `Best regards,\nPortal`;

  return emailContent;
}

